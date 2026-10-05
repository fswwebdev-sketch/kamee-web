<?php

namespace App\Http\Controllers\Api\Admin;

use App\Enums\FulfillmentType;
use App\Enums\OrderStatus;
use App\Enums\PaymentMethod;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\ConfirmPaymentRequest;
use App\Http\Requests\Admin\Finance\PosOrderRequest;
use App\Http\Requests\Admin\RefundOrderRequest;
use App\Http\Requests\Admin\UpdateOrderStatusRequest;
use App\Http\Resources\Admin\AdminOrderResource;
use App\Models\Order;
use App\Models\Outlet;
use App\Services\OrderService;
use App\Services\OrderStateMachine;
use App\Services\PaymentService;
use App\Support\AdminOutlet;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Carbon;
use Spatie\QueryBuilder\AllowedFilter;
use Spatie\QueryBuilder\QueryBuilder;

/**
 * @group Admin: Pesanan
 *
 * @authenticated
 *
 * Admin Outlet otomatis dibatasi ke outlet miliknya (Policy + global scope).
 */
class OrderController extends Controller
{
    /**
     * Daftar pesanan.
     *
     * @queryParam filter[status] string pending,paid,processing,shipped,completed,cancelled (bisa dipisah koma). Example: paid,processing
     * @queryParam filter[outlet_id] integer Outlet. Example: 1
     * @queryParam filter[channel] string web|whatsapp|pos. Example: web
     * @queryParam filter[fulfillment] string pickup|delivery|dine_in. Example: delivery
     * @queryParam filter[from] string Tanggal awal. Example: 2026-09-01
     * @queryParam filter[to] string Tanggal akhir. Example: 2026-09-28
     * @queryParam filter[search] string Kode, nama, atau nomor WA. Example: KM2609
     * @queryParam sort string created_at, total. Example: -created_at
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $this->authorize('viewAny', Order::class);

        $orders = QueryBuilder::for(Order::query()->with('outlet:id,name,phone_wa', 'latestPayment'))
            ->allowedFilters([
                AllowedFilter::exact('status'),
                AllowedFilter::exact('outlet_id'),
                AllowedFilter::exact('channel'),
                AllowedFilter::exact('fulfillment'),
                AllowedFilter::callback('from', fn (Builder $q, $v) => $q->where('created_at', '>=', Carbon::parse($v)->startOfDay())),
                AllowedFilter::callback('to', fn (Builder $q, $v) => $q->where('created_at', '<=', Carbon::parse($v)->endOfDay())),
                AllowedFilter::callback('search', fn (Builder $q, $v) => $q->where(fn ($w) => $w
                    ->whereLike('code', "%{$v}%")->orWhereLike('customer_name', "%{$v}%")->orWhereLike('customer_phone', "%{$v}%"))),
            ])
            ->allowedSorts(['created_at', 'total'])
            ->defaultSort('-created_at')
            ->paginate($this->perPage($request, 20))
            ->withQueryString();

        return AdminOrderResource::collection($orders);
    }

    /** Detail pesanan + log status + pembayaran. */
    public function show(Order $order): AdminOrderResource
    {
        $this->authorize('view', $order);

        return new AdminOrderResource($order->load('items.options', 'outlet', 'customer', 'payments', 'latestPayment', 'statusLogs.user', 'handler'));
    }

    /**
     * Ubah status pesanan.
     *
     * Transisi divalidasi state machine, dicatat di log, disiarkan realtime, dan pelanggan diberi notifikasi WA.
     */
    public function updateStatus(UpdateOrderStatusRequest $request, Order $order, OrderStateMachine $stateMachine): AdminOrderResource
    {
        $this->authorize('updateStatus', $order);

        $stateMachine->transition($order, OrderStatus::from($request->string('status')), $request->user(), $request->input('note'));

        return (new AdminOrderResource($order->fresh()->load('items.options', 'outlet', 'payments', 'latestPayment', 'statusLogs.user', 'handler')))
            ->additional(['message' => 'Status pesanan diperbarui menjadi "'.$order->status->label().'".']);
    }

    /**
     * Konfirmasi pembayaran QRIS manual.
     *
     * Untuk QRIS statis (gateway manual): admin memeriksa mutasi GoPay Merchant lalu menandai pesanan
     * pending sebagai lunas. Tagihan QRIS manual terakhir ditandai paid (confirmed_by, confirmed_at, note);
     * bila belum ada tagihan, dibuatkan otomatis sebesar total pesanan. Admin Outlet hanya untuk outletnya.
     */
    public function confirmPayment(ConfirmPaymentRequest $request, Order $order, PaymentService $payments): AdminOrderResource
    {
        $this->authorize('updateStatus', $order);

        $payments->confirmManual($order, $request->user(), $request->input('note'), $request->paymentMethod(), $request->input('bank'));

        return (new AdminOrderResource($order->fresh()->load('items.options', 'outlet', 'payments', 'latestPayment', 'statusLogs.user', 'handler')))
            ->additional(['message' => 'Pembayaran dikonfirmasi. Pesanan berstatus "'.$order->status->label().'".']);
    }

    /**
     * Pesanan kasir (POS).
     *
     * Harga dihitung server (harga dasar + selisih opsi, validasi opsi wajib), tanpa promo/poin/ongkir.
     * Pesanan channel "pos" langsung lunas & selesai (log pending → paid → completed) dan stok bahan dipotong.
     * `cash_received` kurang dari total → 422. Respons menyertakan `change` (kembalian, 0 bila non-tunai).
     */
    public function pos(PosOrderRequest $request, OrderService $orders): JsonResponse
    {
        $outlet = Outlet::query()->findOrFail(AdminOutlet::resolve($request));

        [$order, $change] = $orders->createPos(
            $outlet,
            $request->cartItems(),
            $request->user(),
            PaymentMethod::from($request->input('payment_method')),
            $request->input('bank'),
            $request->filled('cash_received') ? $request->integer('cash_received') : null,
            $request->input('customer_name'),
            $request->input('customer_phone'),
            FulfillmentType::tryFrom((string) $request->input('fulfillment')) ?? FulfillmentType::DineIn,
            $request->input('note'),
        );

        return (new AdminOrderResource($order->fresh()->load('items.options', 'outlet', 'payments', 'latestPayment', 'statusLogs.user', 'handler')))
            ->additional(['message' => 'Pesanan kasir tersimpan.', 'change' => $change])
            ->response()->setStatusCode(201);
    }

    /**
     * Refund pesanan.
     *
     * Khusus Super Admin. Mengembalikan dana via gateway lalu membatalkan pesanan.
     */
    public function refund(RefundOrderRequest $request, Order $order, PaymentService $payments): AdminOrderResource
    {
        $this->authorize('refund', $order);

        $payments->refund($order, $request->user(), $request->string('reason'));

        return (new AdminOrderResource($order->fresh()->load('items.options', 'outlet', 'payments', 'latestPayment', 'statusLogs.user')))
            ->additional(['message' => 'Refund berhasil diproses dan pesanan dibatalkan.']);
    }
}
