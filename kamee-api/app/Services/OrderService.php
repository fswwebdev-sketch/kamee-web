<?php

namespace App\Services;

use App\Enums\FulfillmentType;
use App\Enums\OrderChannel;
use App\Enums\OrderStatus;
use App\Enums\PaymentMethod;
use App\Enums\PaymentStatus;
use App\Events\OrderCreated;
use App\Exceptions\BusinessException;
use App\Jobs\SendWhatsAppMessage;
use App\Models\Customer;
use App\Models\Order;
use App\Models\OrderStatusLog;
use App\Models\Outlet;
use App\Models\User;
use App\Services\Pricing\CartItem;
use App\Services\Pricing\PricedLine;
use App\Services\Pricing\PricingRequest;
use App\Services\Pricing\PricingService;
use App\Services\WhatsApp\OrderMessages;
use App\Support\OrderCode;
use App\Support\Phone;
use App\Support\Rupiah;
use Illuminate\Support\Facades\DB;

class OrderService
{
    public function __construct(
        private readonly PricingService $pricing,
        private readonly PromotionService $promotions,
        private readonly LoyaltyService $loyalty,
        private readonly OrderMessages $messages,
    ) {}

    /**
     * Buat pesanan baru (tamu atau member). Semua harga dihitung ulang di server.
     *
     * @param  Customer|null  $member  Pelanggan yang login (wajib untuk menukar poin).
     */
    public function create(CreateOrderData $data, ?Customer $member = null): Order
    {
        $outlet = Outlet::find($data->outletId) ?? throw BusinessException::field('outlet_id', 'Outlet tidak ditemukan.');
        $this->assertOutletAccepting($outlet, $data);

        // Tamu dengan nomor WA yang sudah terdaftar tetap dikaitkan agar mendapat poin.
        $customer = $member ?? Customer::query()->where('phone_wa', $data->customerPhone)->first();

        $request = new PricingRequest(
            outletId: $outlet->id,
            items: $data->items,
            fulfillment: $data->fulfillment,
            lat: $data->lat,
            lng: $data->lng,
            promoCode: $data->promoCode,
            redeemPoints: $data->redeemPoints,
            customer: $member,
            customerPhone: $data->customerPhone,
        );

        return DB::transaction(function () use ($data, $customer, $member, $request) {
            $quote = $this->pricing->price($request);

            $order = Order::create([
                'code' => OrderCode::generate(),
                'customer_id' => $customer?->id,
                'outlet_id' => $quote->outlet->id,
                'customer_name' => $data->customerName,
                'customer_phone' => $data->customerPhone,
                'fulfillment' => $data->fulfillment,
                'address' => $data->fulfillment === FulfillmentType::Delivery && $data->address
                    ? trim($data->address.($data->addressNote ? " ({$data->addressNote})" : ''))
                    : null,
                'lat' => $data->fulfillment === FulfillmentType::Delivery ? $data->lat : null,
                'lng' => $data->fulfillment === FulfillmentType::Delivery ? $data->lng : null,
                'scheduled_at' => $data->scheduledAt,
                'subtotal' => $quote->subtotal,
                'discount' => $quote->discount,
                'points_redeemed' => $quote->pointsRedeemed,
                'delivery_fee' => $quote->deliveryFee,
                'service_fee' => $quote->serviceFee,
                'total' => $quote->total,
                'note' => $data->note,
                'channel' => $data->channel,
            ]);

            $this->storeItems($order, $quote->lines);

            if ($quote->promotion !== null) {
                $this->promotions->recordUsage($quote->promotion, $order, $quote->discount, new PromotionContext(
                    subtotal: $quote->subtotal,
                    outletId: $order->outlet_id,
                    lines: $quote->lines,
                    deliveryFee: $quote->deliveryFee,
                    customer: $member,
                    customerPhone: $data->customerPhone,
                ));
            }

            if ($quote->pointsRedeemed > 0 && $member !== null) {
                $this->loyalty->redeemForOrder($member, $quote->pointsRedeemed, $order);
            }

            OrderStatusLog::create([
                'order_id' => $order->id,
                'from_status' => null,
                'to_status' => OrderStatus::Pending->value,
                'note' => 'Pesanan dibuat via '.$data->channel->label(),
            ]);

            OrderCreated::dispatch($order);
            SendWhatsAppMessage::dispatch($order->customer_phone, $this->messages->orderCreated($order));

            return $order->load('items.options', 'outlet');
        });
    }

    /**
     * Pesanan kasir (POS): harga dihitung server tanpa promo/poin/ongkir, langsung lunas dan selesai.
     * Log status: pending → paid → completed. Stok bahan dipotong oleh state machine.
     *
     * @param  list<CartItem>  $items
     * @return array{0: Order, 1: int} [pesanan, kembalian]
     */
    public function createPos(
        Outlet $outlet,
        array $items,
        User $actor,
        PaymentMethod $method,
        ?string $bank = null,
        ?int $cashReceived = null,
        ?string $customerName = null,
        ?string $customerPhone = null,
        FulfillmentType $fulfillment = FulfillmentType::DineIn,
        ?string $note = null,
    ): array {
        if ($items === []) {
            throw BusinessException::field('items', 'Keranjang masih kosong.');
        }

        $lines = $this->pricing->priceLines($outlet, $items);
        $total = array_sum(array_map(fn (PricedLine $l) => $l->subtotal(), $lines));

        $change = 0;
        if ($method === PaymentMethod::Cash) {
            $cashReceived ??= $total;
            if ($cashReceived < $total) {
                throw BusinessException::field('cash_received', 'Uang diterima kurang dari total ('.Rupiah::format($total).').');
            }
            $change = $cashReceived - $total;
        }
        $bank = $method === PaymentMethod::BankTransfer && filled($bank) ? trim($bank) : null;

        $order = DB::transaction(function () use ($outlet, $lines, $total, $actor, $method, $bank, $cashReceived, $change, $customerName, $customerPhone, $fulfillment, $note) {
            $order = Order::create([
                'code' => OrderCode::generate(),
                'customer_id' => null,
                'outlet_id' => $outlet->id,
                'customer_name' => filled($customerName) ? trim($customerName) : 'Pembeli langsung',
                'customer_phone' => filled($customerPhone) ? Phone::normalize($customerPhone) : '',
                'fulfillment' => $fulfillment,
                'subtotal' => $total,
                'discount' => 0,
                'points_redeemed' => 0,
                'delivery_fee' => 0,
                'service_fee' => 0,
                'total' => $total,
                'note' => $note,
                'channel' => OrderChannel::Pos,
                'handled_by' => $actor->id,
            ]);

            $this->storeItems($order, $lines);

            OrderStatusLog::create([
                'order_id' => $order->id,
                'from_status' => null,
                'to_status' => OrderStatus::Pending->value,
                'changed_by' => $actor->id,
                'note' => 'Pesanan dibuat via '.OrderChannel::Pos->label(),
            ]);

            $order->payments()->create([
                'method' => $method,
                'provider' => 'pos',
                'provider_ref' => "{$order->code}-1",
                'amount' => $total,
                'status' => PaymentStatus::Paid,
                'paid_at' => now(),
                'raw_payload' => array_filter([
                    'pos' => true,
                    'bank' => $bank,
                    'cash_received' => $method === PaymentMethod::Cash ? $cashReceived : null,
                    'change' => $method === PaymentMethod::Cash ? $change : null,
                    'cashier' => ['id' => $actor->id, 'name' => $actor->name],
                ], fn ($v) => $v !== null),
            ]);

            OrderCreated::dispatch($order);

            $this->stateMachine()->transition($order, OrderStatus::Paid, $actor, 'Dibayar di kasir ('.$method->bookLabelWithBank($bank).')');
            $this->stateMachine()->completeAtCounter($order, $actor, 'Pesanan kasir selesai');

            return $order;
        });

        return [$order, $change];
    }

    private function stateMachine(): OrderStateMachine
    {
        return app(OrderStateMachine::class);
    }

    /** URL wa.me berisi ringkasan pesanan untuk dikirim pelanggan ke outlet. */
    public function whatsappUrl(Order $order): string
    {
        $order->loadMissing('outlet');

        return 'https://wa.me/'.$order->outlet->phone_wa.'?text='.rawurlencode($this->messages->orderSummary($order));
    }

    /** @param list<PricedLine> $lines */
    private function storeItems(Order $order, array $lines): void
    {
        foreach ($lines as $line) {
            $item = $order->items()->create([
                'product_id' => $line->product->id,
                'product_name' => $line->product->name,
                'unit_price' => $line->unitPrice,
                'qty' => $line->qty,
                'subtotal' => $line->subtotal(),
                'note' => $line->note,
            ]);

            foreach ($line->options as $option) {
                $item->options()->create([
                    'option_name' => $option->group ? "{$option->group->name}: {$option->name}" : $option->name,
                    'price_delta' => $option->price_delta,
                ]);
            }
        }
    }

    private function assertOutletAccepting(Outlet $outlet, CreateOrderData $data): void
    {
        if (! $outlet->is_open) {
            throw BusinessException::field('outlet_id', "{$outlet->name} sedang tutup dan belum menerima pesanan.");
        }

        $at = $data->scheduledAt ?? now();

        if ($data->scheduledAt !== null && $data->scheduledAt->isPast()) {
            throw BusinessException::field('scheduled_at', 'Waktu pesanan terjadwal harus di masa depan.');
        }

        if (! $outlet->isAcceptingOrders($at)) {
            $open = substr((string) $outlet->open_time, 0, 5);
            $close = substr((string) $outlet->close_time, 0, 5);

            throw BusinessException::field(
                $data->scheduledAt ? 'scheduled_at' : 'outlet_id',
                $outlet->name.' buka '.config('kamee.open_days_label').", pukul {$open}–{$close} WIB.",
            );
        }
    }
}
