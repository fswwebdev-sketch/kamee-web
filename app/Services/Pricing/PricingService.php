<?php

namespace App\Services\Pricing;

use App\Enums\FulfillmentType;
use App\Enums\OptionGroupType;
use App\Exceptions\BusinessException;
use App\Models\Option;
use App\Models\Outlet;
use App\Models\Product;
use App\Services\DeliveryFeeService;
use App\Services\LoyaltyService;
use App\Services\PromotionContext;
use App\Services\PromotionService;
use App\Services\SettingService;
use Illuminate\Support\Collection;

/**
 * Menghitung ulang seluruh harga di server. Harga dari klien tidak pernah dipercaya.
 *
 * Urutan: harga dasar + opsi → subtotal → ongkir → biaya layanan → promo → poin → total.
 */
class PricingService
{
    public const MAX_QTY = 50;

    public function __construct(
        private readonly PromotionService $promotions,
        private readonly LoyaltyService $loyalty,
        private readonly DeliveryFeeService $delivery,
        private readonly SettingService $settings,
    ) {}

    public function price(PricingRequest $request): PricingResult
    {
        $outlet = Outlet::find($request->outletId)
            ?? throw BusinessException::field('outlet_id', 'Outlet tidak ditemukan.');

        if ($request->items === []) {
            throw BusinessException::field('items', 'Keranjang masih kosong.');
        }

        $lines = $this->priceLines($outlet, $request->items);
        $subtotal = array_sum(array_map(fn (PricedLine $l) => $l->subtotal(), $lines));

        [$deliveryFee, $distance] = $this->deliveryFee($outlet, $request);
        $serviceFee = $this->settings->int('service_fee');

        $context = new PromotionContext(
            subtotal: $subtotal,
            outletId: $outlet->id,
            lines: $lines,
            deliveryFee: $deliveryFee,
            customer: $request->customer,
            customerPhone: $request->customerPhone,
        );

        $evaluation = filled($request->promoCode)
            ? $this->promotions->evaluateCode($request->promoCode, $context, 'promo_code')
            : $this->promotions->bestAutomatic($context);

        $discount = $evaluation?->discount ?? 0;

        [$points, $pointsValue] = $this->redeemPoints($request, max(0, $subtotal - min($discount, $subtotal)));

        $total = max(0, $subtotal + $deliveryFee + $serviceFee - $discount - $pointsValue);

        return new PricingResult(
            outlet: $outlet,
            lines: $lines,
            subtotal: $subtotal,
            discount: $discount,
            promotion: $evaluation?->promotion,
            pointsRedeemed: $points,
            pointsValue: $pointsValue,
            deliveryFee: $deliveryFee,
            deliveryDistanceKm: $distance,
            serviceFee: $serviceFee,
            total: $total,
        );
    }

    /**
     * @param  list<CartItem>  $items
     * @return list<PricedLine>
     */
    private function priceLines(Outlet $outlet, array $items): array
    {
        $products = Product::query()
            ->with('optionGroups.options.group')
            ->whereIn('id', array_map(fn (CartItem $i) => $i->productId, $items))
            ->get()
            ->keyBy('id');

        $unavailable = Product::query()
            ->whereIn('id', $products->keys())
            ->whereHas('outlets', fn ($q) => $q->where('outlets.id', $outlet->id)->where('outlet_product.is_available', false))
            ->pluck('id')
            ->all();

        $errors = [];
        $lines = [];

        foreach ($items as $index => $item) {
            $product = $products->get($item->productId);

            if ($product === null || ! $product->is_active) {
                $errors["items.{$index}.product_id"][] = 'Produk tidak ditemukan atau sudah tidak dijual.';

                continue;
            }

            if (in_array($product->id, $unavailable, true)) {
                $errors["items.{$index}.product_id"][] = "{$product->name} sedang habis di {$outlet->name}.";

                continue;
            }

            if ($item->qty < 1 || $item->qty > self::MAX_QTY) {
                $errors["items.{$index}.qty"][] = 'Jumlah harus antara 1 dan '.self::MAX_QTY.'.';

                continue;
            }

            $optionErrors = [];
            $options = $this->resolveOptions($product, $item->optionIds, $optionErrors);

            if ($optionErrors !== []) {
                $errors["items.{$index}.option_ids"] = $optionErrors;

                continue;
            }

            $unitPrice = max(0, $product->base_price + array_sum(array_map(fn (Option $o) => $o->price_delta, $options)));
            $lines[] = new PricedLine($product, $item->qty, $unitPrice, $options, $item->note);
        }

        if ($errors !== []) {
            throw new BusinessException('Beberapa item di keranjang tidak valid.', $errors);
        }

        return $lines;
    }

    /**
     * Validasi opsi terhadap grup opsi milik produk: opsi harus milik produk,
     * grup "single" maksimal satu pilihan, dan grup wajib harus dipilih.
     *
     * @param  list<int>  $optionIds
     * @param  list<string>  $errors
     * @return list<Option>
     */
    private function resolveOptions(Product $product, array $optionIds, array &$errors): array
    {
        /** @var Collection<int, Option> $allowed */
        $allowed = $product->optionGroups->flatMap->options->keyBy('id');
        $chosen = [];

        foreach ($optionIds as $id) {
            if (! $allowed->has($id)) {
                $errors[] = "Opsi #{$id} tidak tersedia untuk {$product->name}.";
            } else {
                $chosen[] = $allowed->get($id);
            }
        }

        foreach ($product->optionGroups as $group) {
            $count = count(array_filter($chosen, fn (Option $o) => $o->option_group_id === $group->id));

            if ($group->type === OptionGroupType::Single && $count > 1) {
                $errors[] = "Pilih hanya satu opsi {$group->name}.";
            }

            if ($group->is_required && $count === 0) {
                $errors[] = "Opsi {$group->name} wajib dipilih.";
            }
        }

        return $chosen;
    }

    /** @return array{0:int, 1:?float} */
    private function deliveryFee(Outlet $outlet, PricingRequest $request): array
    {
        if ($request->fulfillment !== FulfillmentType::Delivery) {
            return [0, null];
        }

        if ($request->lat === null || $request->lng === null) {
            throw BusinessException::field('address', 'Titik lokasi pengantaran wajib diisi.');
        }

        $quote = $this->delivery->quoteOrFail($outlet, $request->lat, $request->lng);

        return [$quote->fee, $quote->distanceKm];
    }

    /** @return array{0:int, 1:int} [poin, nilai rupiah] */
    private function redeemPoints(PricingRequest $request, int $payable): array
    {
        if ($request->redeemPoints <= 0) {
            return [0, 0];
        }

        if ($request->customer === null) {
            throw BusinessException::field('redeem_points', 'Masuk sebagai member untuk menukarkan poin.');
        }

        $value = $this->loyalty->validateRedeem($request->customer, $request->redeemPoints, $payable, 'redeem_points');

        return [$request->redeemPoints, $value];
    }
}
