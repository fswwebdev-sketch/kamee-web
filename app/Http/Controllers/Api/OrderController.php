<?php

namespace App\Http\Controllers\Api;

use App\Enums\OrderChannel;
use App\Http\Controllers\Controller;
use App\Http\Requests\Public\StoreOrderRequest;
use App\Http\Requests\Public\TrackOrderRequest;
use App\Http\Resources\OrderResource;
use App\Models\Customer;
use App\Models\Order;
use App\Services\CreateOrderData;
use App\Services\OrderService;
use App\Services\Pricing\PricingRequest;
use App\Services\Pricing\PricingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * @group Pesanan & Pembayaran
 */
class OrderController extends Controller
{
    public function __construct(private readonly OrderService $orders) {}

    /**
     * Buat pesanan.
     *
     * Tamu maupun member (kirim Bearer token pelanggan untuk menukar poin). Server menghitung ulang
     * seluruh harga, opsi, ongkir, promo, dan poin. Header `Idempotency-Key` wajib.
     *
     * @header Idempotency-Key 5f0c9f5e-1a2b-4c3d-8e9f-001122334455
     *
     * @unauthenticated
     */
    public function store(StoreOrderRequest $request): JsonResponse
    {
        $order = $this->orders->create(CreateOrderData::fromArray($request->validated()), $this->member($request));

        return (new OrderResource($order->load('items.options', 'outlet', 'statusLogs')))
            ->additional(['message' => 'Pesanan berhasil dibuat. Silakan lanjutkan pembayaran.'])
            ->response()
            ->setStatusCode(201);
    }

    /**
     * Simulasi harga keranjang.
     *
     * Menghitung total (subtotal, ongkir, promo, poin) tanpa menyimpan pesanan.
     *
     * @unauthenticated
     */
    public function quote(StoreOrderRequest $request, PricingService $pricing): JsonResponse
    {
        $data = CreateOrderData::fromArray($request->validated());

        $result = $pricing->price(new PricingRequest(
            outletId: $data->outletId,
            items: $data->items,
            fulfillment: $data->fulfillment,
            lat: $data->lat,
            lng: $data->lng,
            promoCode: $data->promoCode,
            redeemPoints: $data->redeemPoints,
            customer: $this->member($request),
            customerPhone: $data->customerPhone,
        ));

        return response()->json(['data' => $result->toArray()]);
    }

    /**
     * Pesan via WhatsApp.
     *
     * Menyimpan pesanan berstatus pending (kanal whatsapp) dan mengembalikan tautan wa.me berisi ringkasan pesanan.
     *
     * @header Idempotency-Key 5f0c9f5e-1a2b-4c3d-8e9f-001122334456
     *
     * @unauthenticated
     */
    public function whatsapp(StoreOrderRequest $request): JsonResponse
    {
        $order = $this->orders->create(CreateOrderData::fromArray($request->validated(), OrderChannel::WhatsApp), $this->member($request));

        return (new OrderResource($order->load('items.options', 'outlet')))
            ->additional([
                'message' => 'Pesanan tersimpan. Lanjutkan konfirmasi melalui WhatsApp.',
                'whatsapp_url' => $this->orders->whatsappUrl($order),
            ])
            ->response()
            ->setStatusCode(201);
    }

    /**
     * Lacak pesanan.
     *
     * Wajib menyertakan 4 digit terakhir nomor WhatsApp pemesan.
     *
     * @urlParam code string Kode pesanan. Example: KM260928ABCDE
     *
     * @unauthenticated
     */
    public function track(TrackOrderRequest $request, string $code): OrderResource
    {
        $order = Order::query()->where('code', $code)->firstOrFail();

        abort_unless($order->phoneMatches($request->string('phone')), 404);

        return new OrderResource($order->load('items.options', 'outlet', 'latestPayment', 'statusLogs'));
    }

    private function member(Request $request): ?Customer
    {
        $user = $request->user('sanctum');

        return $user instanceof Customer ? $user : null;
    }
}
