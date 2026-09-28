<?php

namespace App\Http\Controllers\Api\Customer;

use App\Http\Controllers\Controller;
use App\Http\Resources\OrderResource;
use App\Models\Order;
use App\Services\CustomerService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/**
 * @group Pelanggan: Pesanan
 *
 * @authenticated
 */
class OrderController extends Controller
{
    public function __construct(private readonly CustomerService $customers) {}

    /**
     * Riwayat pesanan.
     *
     * @queryParam status string Filter status. Example: completed
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $orders = $request->user()->orders()
            ->with('items.options', 'outlet', 'latestPayment')
            ->when($request->string('status')->toString(), fn ($q, $s) => $q->where('status', $s))
            ->latest()
            ->paginate($this->perPage($request, 10))
            ->withQueryString();

        return OrderResource::collection($orders);
    }

    /** Detail pesanan. */
    public function show(Request $request, string $code): OrderResource
    {
        $order = $this->find($request, $code);

        return new OrderResource($order->load('items.options', 'outlet', 'latestPayment', 'statusLogs'));
    }

    /**
     * Pesan lagi.
     *
     * Mengembalikan isi keranjang dari pesanan lama dengan harga terkini (tidak membuat pesanan).
     */
    public function reorder(Request $request, string $code): JsonResponse
    {
        $cart = $this->customers->reorder($this->find($request, $code));

        return response()->json([
            'message' => $cart['unavailable'] ? 'Sebagian produk sudah tidak tersedia.' : 'Item berhasil disalin ke keranjang.',
            'data' => $cart,
        ]);
    }

    private function find(Request $request, string $code): Order
    {
        return $request->user()->orders()->where('code', $code)->firstOrFail();
    }
}
