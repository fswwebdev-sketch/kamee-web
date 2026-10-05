<?php

namespace App\Services;

use App\Enums\PromotionType;
use App\Exceptions\BusinessException;
use App\Models\Customer;
use App\Models\Order;
use App\Models\Promotion;
use App\Models\PromotionUsage;
use App\Services\Pricing\PricedLine;
use App\Support\Phone;
use App\Support\Rupiah;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;

class PromotionService
{
    /**
     * Validasi kode voucher dan hitung diskonnya. Melempar BusinessException pada field $field bila tidak valid.
     */
    public function evaluateCode(string $code, PromotionContext $context, string $field = 'code'): PromotionEvaluation
    {
        $promotion = Promotion::query()->running()->where('code', strtoupper(trim($code)))->first();

        if ($promotion === null) {
            throw BusinessException::field($field, 'Kode voucher tidak ditemukan atau sudah tidak berlaku.');
        }

        $this->assertEligible($promotion, $context, $field);

        $discount = $this->calculate($promotion, $context);

        return new PromotionEvaluation($promotion, $discount, $this->message($promotion, $discount, $context));
    }

    /** Promo otomatis (tanpa kode) dengan diskon terbesar yang memenuhi syarat. */
    public function bestAutomatic(PromotionContext $context): ?PromotionEvaluation
    {
        return Promotion::query()->running()->whereNull('code')->forOutlet($context->outletId)->get()
            ->filter(fn (Promotion $p) => $this->isEligible($p, $context))
            ->map(fn (Promotion $p) => new PromotionEvaluation($p, $d = $this->calculate($p, $context), $this->message($p, $d, $context)))
            ->filter(fn (PromotionEvaluation $e) => $e->discount > 0)
            ->sortByDesc('discount')
            ->first();
    }

    public function calculate(Promotion $promotion, PromotionContext $context): int
    {
        $discount = match ($promotion->type) {
            PromotionType::Percent => intdiv($context->subtotal * min(100, $promotion->value), 100),
            PromotionType::Fixed => $promotion->value,
            PromotionType::Bogo => $this->bogoDiscount($context->lines),
            PromotionType::FreeDelivery => $context->deliveryFee,
        };

        if ($promotion->max_discount !== null) {
            $discount = min($discount, $promotion->max_discount);
        }

        $ceiling = $promotion->type === PromotionType::FreeDelivery ? $context->deliveryFee : $context->subtotal;

        return max(0, min($discount, $ceiling));
    }

    /**
     * Beli 1 gratis 1: untuk setiap baris, setiap 2 cangkir produk yang sama → 1 gratis.
     *
     * @param  list<PricedLine>  $lines
     */
    private function bogoDiscount(array $lines): int
    {
        return array_sum(array_map(fn (PricedLine $l) => intdiv($l->qty, 2) * $l->unitPrice, $lines));
    }

    public function isEligible(Promotion $promotion, PromotionContext $context): bool
    {
        try {
            $this->assertEligible($promotion, $context, 'code');

            return true;
        } catch (BusinessException) {
            return false;
        }
    }

    public function assertEligible(Promotion $promotion, PromotionContext $context, string $field = 'code'): void
    {
        if ($promotion->outlet_id !== null && $context->outletId !== null && $promotion->outlet_id !== $context->outletId) {
            throw BusinessException::field($field, 'Voucher ini tidak berlaku di outlet yang dipilih.');
        }

        if ($context->subtotal < $promotion->min_spend) {
            throw BusinessException::field($field, 'Minimal belanja '.Rupiah::format($promotion->min_spend).' untuk memakai voucher ini.');
        }

        if ($promotion->quota !== null && $this->usageCount($promotion) >= $promotion->quota) {
            throw BusinessException::field($field, 'Kuota voucher sudah habis.');
        }

        if ($promotion->per_customer_limit !== null
            && ($context->customer !== null || $context->customerPhone !== null)
            && $this->customerUsageCount($promotion, $context->customer, $context->customerPhone) >= $promotion->per_customer_limit) {
            throw BusinessException::field($field, 'Anda sudah mencapai batas pemakaian voucher ini.');
        }
    }

    public function usageCount(Promotion $promotion): int
    {
        return $promotion->usages()->count();
    }

    public function customerUsageCount(Promotion $promotion, ?Customer $customer, ?string $phone = null): int
    {
        $phone = $phone ? Phone::normalize($phone) : $customer?->phone_wa;

        return PromotionUsage::query()
            ->where('promotion_id', $promotion->id)
            ->where(function (Builder $q) use ($customer, $phone) {
                $q->when($customer, fn ($q) => $q->orWhere('customer_id', $customer->id))
                    ->when($phone, fn ($q) => $q->orWhereHas('order', fn ($o) => $o->where('customer_phone', $phone)));
            })
            ->count();
    }

    /**
     * Catat pemakaian promo untuk pesanan. Dipanggil di dalam transaksi pembuatan pesanan;
     * baris promo dikunci agar kuota tidak terlampaui saat banyak pesanan bersamaan.
     */
    public function recordUsage(Promotion $promotion, Order $order, int $discount, PromotionContext $context): PromotionUsage
    {
        $locked = Promotion::query()->lockForUpdate()->findOrFail($promotion->id);
        $this->assertEligible($locked, $context, 'promo_code');

        return PromotionUsage::create([
            'promotion_id' => $locked->id,
            'order_id' => $order->id,
            'customer_id' => $order->customer_id,
            'discount_amount' => $discount,
        ]);
    }

    /** Kembalikan kuota promo saat pesanan dibatalkan. */
    public function releaseUsage(Order $order): void
    {
        PromotionUsage::query()->where('order_id', $order->id)->delete();
    }

    /**
     * Voucher yang masih bisa dipakai pelanggan (/me/vouchers).
     *
     * @return Collection<int, array{promotion: Promotion, used: int, remaining: ?int}>
     */
    public function vouchersFor(Customer $customer): Collection
    {
        return Promotion::query()->running()->whereNotNull('code')->orderBy('ends_at')->get()
            ->map(function (Promotion $p) use ($customer) {
                $used = $this->customerUsageCount($p, $customer);

                return [
                    'promotion' => $p,
                    'used' => $used,
                    'remaining' => $p->per_customer_limit !== null ? max(0, $p->per_customer_limit - $used) : null,
                ];
            })
            ->filter(fn ($row) => $row['remaining'] === null || $row['remaining'] > 0)
            ->filter(fn ($row) => $row['promotion']->quota === null || $this->usageCount($row['promotion']) < $row['promotion']->quota)
            ->values();
    }

    private function message(Promotion $promotion, int $discount, PromotionContext $context): string
    {
        if ($discount === 0 && $promotion->type === PromotionType::Bogo && $context->lines === []) {
            return 'Voucher valid. Potongan beli 1 gratis 1 dihitung saat checkout.';
        }

        if ($discount === 0 && $promotion->type === PromotionType::FreeDelivery) {
            return 'Voucher valid. Gratis ongkir berlaku untuk pesanan antar.';
        }

        return 'Voucher berhasil dipakai. Hemat '.Rupiah::format($discount).'.';
    }
}
