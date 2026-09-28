<?php

namespace App\Http\Controllers\Api;

use App\Enums\PaymentMethod;
use App\Http\Controllers\Controller;
use App\Http\Requests\Public\PayOrderRequest;
use App\Http\Resources\PaymentResource;
use App\Models\Order;
use App\Services\PaymentService;
use Illuminate\Http\JsonResponse;

/**
 * @group Pesanan & Pembayaran
 *
 * @unauthenticated
 */
class PaymentController extends Controller
{
    public function __construct(private readonly PaymentService $payments) {}

    /**
     * Bayar pesanan.
     *
     * Membuat transaksi QRIS / e-wallet / VA di Midtrans dan mengembalikan qr_string, va_number, deeplink,
     * dan expires_at. Metode `cash` langsung memproses pesanan (bayar di kasir). Header `Idempotency-Key` wajib.
     *
     * @header Idempotency-Key 9a1b2c3d-0000-4000-8000-000000000001
     *
     * @urlParam code string Kode pesanan. Example: KM260928ABCDE
     */
    public function store(PayOrderRequest $request, string $code): JsonResponse
    {
        $order = Order::query()->where('code', $code)->firstOrFail();

        $payment = $this->payments->pay($order, PaymentMethod::from($request->string('method')), $request->input('channel'));

        return (new PaymentResource($payment))
            ->additional([
                'message' => $payment->method === PaymentMethod::Cash
                    ? 'Pesanan diteruskan ke barista. Silakan bayar tunai di kasir.'
                    : 'Transaksi pembayaran dibuat. Selesaikan sebelum batas waktu.',
                'order_status' => $order->fresh()->status->value,
            ])
            ->response()
            ->setStatusCode(201);
    }

    /**
     * Status pembayaran (polling).
     *
     * Disarankan dipanggil tiap 3 detik, maksimal 15 menit.
     *
     * @urlParam code string Kode pesanan. Example: KM260928ABCDE
     */
    public function status(string $code): JsonResponse
    {
        $order = Order::query()->where('code', $code)->with('latestPayment')->firstOrFail();

        return response()->json(['data' => [
            'order_code' => $order->code,
            'order_status' => $order->status->value,
            'order_status_label' => $order->status->label(),
            'total' => $order->total,
            'payment_deadline' => $this->payments->deadline($order)->toIso8601String(),
            'payment' => $order->latestPayment ? new PaymentResource($order->latestPayment) : null,
        ]]);
    }
}
