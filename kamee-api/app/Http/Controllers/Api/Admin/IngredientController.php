<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\Finance\AdjustStockRequest;
use App\Http\Requests\Admin\Finance\IngredientRequest;
use App\Http\Resources\Finance\IngredientResource;
use App\Http\Resources\Finance\StockMovementResource;
use App\Models\Ingredient;
use App\Services\Finance\IngredientService;
use App\Services\Finance\StockService;
use App\Support\AdminOutlet;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/**
 * @group Admin: Keuangan
 *
 * @authenticated
 *
 * Bahan baku & kemasan beserta mutasi stoknya. Admin Outlet hanya untuk outletnya.
 */
class IngredientController extends Controller
{
    public function __construct(private readonly IngredientService $ingredients) {}

    /**
     * Daftar bahan & kemasan (tanpa paginasi, maks. 500).
     *
     * @queryParam kind string bahan | kemasan. Example: bahan
     * @queryParam q string Cari nama. Example: susu
     * @queryParam outlet_id integer Khusus Super Admin. Example: 1
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $this->authorize('viewAny', Ingredient::class);
        $request->validate([
            'kind' => ['nullable', 'in:bahan,kemasan'],
            'q' => ['nullable', 'string', 'max:100'],
        ]);

        $outletId = AdminOutlet::filter($request);

        $items = Ingredient::query()
            ->when($outletId, fn ($q) => $q->where('outlet_id', $outletId))
            ->when($request->filled('kind'), fn ($q) => $q->where('kind', $request->input('kind')))
            ->when($request->filled('q'), fn ($q) => $q->whereLike('name', '%'.$request->input('q').'%'))
            ->orderBy('kind')
            ->orderBy('name')
            ->limit(500)
            ->get();

        return IngredientResource::collection($items);
    }

    /** Tambah bahan. `opening_stock` (opsional) dicatat sebagai mutasi stok awal. */
    public function store(IngredientRequest $request): JsonResponse
    {
        $ingredient = $this->ingredients->create(AdminOutlet::resolve($request), $request->ingredientData(), $request->user());

        return (new IngredientResource($ingredient))->additional(['message' => 'Bahan berhasil ditambahkan.'])
            ->response()->setStatusCode(201);
    }

    public function show(Ingredient $ingredient): IngredientResource
    {
        $this->authorize('view', $ingredient);

        return new IngredientResource($ingredient);
    }

    /** Ubah data bahan (stok diubah lewat belanja / stok opname). */
    public function update(IngredientRequest $request, Ingredient $ingredient): IngredientResource
    {
        $this->authorize('update', $ingredient);

        return (new IngredientResource($this->ingredients->update($ingredient, $request->ingredientData())))
            ->additional(['message' => 'Bahan berhasil diperbarui.']);
    }

    /** Hapus bahan (soft delete). Baris resep yang memakai bahan ini ikut dihapus. */
    public function destroy(Ingredient $ingredient): JsonResponse
    {
        $this->authorize('delete', $ingredient);

        $this->ingredients->delete($ingredient);

        return response()->json(['message' => 'Bahan berhasil dihapus.']);
    }

    /** Riwayat mutasi stok bahan (terbaru dulu). */
    public function movements(Request $request, Ingredient $ingredient): AnonymousResourceCollection
    {
        $this->authorize('view', $ingredient);

        $movements = $ingredient->movements()->with('creator:id,name')
            ->orderByDesc('created_at')->orderByDesc('id')
            ->paginate($this->perPage($request, 20))
            ->withQueryString();

        return StockMovementResource::collection($movements);
    }

    /** Stok opname: selisih hitung fisik dicatat sebagai mutasi adjustment. */
    public function adjust(AdjustStockRequest $request, Ingredient $ingredient, StockService $stock): IngredientResource
    {
        $ingredient = $stock->adjust($ingredient, (float) $request->input('counted_qty'), $request->user(), $request->input('note'));

        return (new IngredientResource($ingredient))->additional(['message' => 'Stok berhasil disesuaikan.']);
    }
}
