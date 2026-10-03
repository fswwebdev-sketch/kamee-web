<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\Finance\StockPurchaseRequest;
use App\Http\Resources\Finance\StockPurchaseResource;
use App\Models\StockPurchase;
use App\Services\Finance\StockPurchaseService;
use App\Support\AdminOutlet;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/**
 * @group Admin: Keuangan
 *
 * @authenticated
 *
 * Belanja stok: menambah stok bahan dan otomatis mencatat pengeluaran di buku kas.
 */
class StockPurchaseController extends Controller
{
    public function __construct(private readonly StockPurchaseService $purchases) {}

    /**
     * Daftar belanja stok (terbaru dulu).
     *
     * @queryParam from string Tanggal awal. Example: 2026-09-01
     * @queryParam to string Tanggal akhir. Example: 2026-09-30
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $this->authorize('viewAny', StockPurchase::class);
        $request->validate(['from' => ['nullable', 'date_format:Y-m-d'], 'to' => ['nullable', 'date_format:Y-m-d']]);

        $outletId = AdminOutlet::filter($request);

        $purchases = StockPurchase::query()
            ->with(['items.ingredient', 'cashEntry:id,stock_purchase_id', 'creator:id,name'])
            ->when($outletId, fn ($q) => $q->where('outlet_id', $outletId))
            ->when($request->filled('from'), fn ($q) => $q->whereDate('date', '>=', $request->input('from')))
            ->when($request->filled('to'), fn ($q) => $q->whereDate('date', '<=', $request->input('to')))
            ->orderByDesc('date')->orderByDesc('id')
            ->paginate($this->perPage($request, 20))
            ->withQueryString();

        return StockPurchaseResource::collection($purchases);
    }

    /** Catat belanja stok: mutasi purchase per item, harga kemasan terbaru, dan pengeluaran kas. */
    public function store(StockPurchaseRequest $request): JsonResponse
    {
        $purchase = $this->purchases->create(AdminOutlet::resolve($request), $request->validated(), $request->user());

        return (new StockPurchaseResource($this->load($purchase)))->additional(['message' => 'Belanja stok tersimpan.'])
            ->response()->setStatusCode(201);
    }

    public function show(StockPurchase $stockPurchase): StockPurchaseResource
    {
        $this->authorize('view', $stockPurchase);

        return new StockPurchaseResource($this->load($stockPurchase));
    }

    /** Batalkan belanja: mutasi stok dan entri kas terkait dihapus. */
    public function destroy(StockPurchase $stockPurchase): JsonResponse
    {
        $this->authorize('delete', $stockPurchase);

        $this->purchases->delete($stockPurchase);

        return response()->json(['message' => 'Belanja stok dibatalkan.']);
    }

    private function load(StockPurchase $purchase): StockPurchase
    {
        return $purchase->load(['items.ingredient', 'cashEntry:id,stock_purchase_id', 'creator:id,name']);
    }
}
