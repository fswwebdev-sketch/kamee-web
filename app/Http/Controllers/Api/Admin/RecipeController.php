<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\Finance\RecipeRequest;
use App\Models\Product;
use App\Models\Recipe;
use App\Services\Finance\RecipeService;
use App\Support\AdminOutlet;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * @group Admin: Keuangan
 *
 * @authenticated
 *
 * Resep (takaran bahan) per produk & varian ukuran, beserta HPP, margin, dan perkiraan porsi dari stok.
 */
class RecipeController extends Controller
{
    public function __construct(private readonly RecipeService $recipes) {}

    /** Resep semua produk aktif (urut kategori lalu nama). */
    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Recipe::class);

        return response()->json(['data' => $this->recipes->list(AdminOutlet::resolve($request))]);
    }

    /** Resep satu produk. */
    public function show(Request $request, Product $product): JsonResponse
    {
        $this->authorize('viewAny', Recipe::class);

        return response()->json(['data' => $this->recipes->show(AdminOutlet::resolve($request), $product)]);
    }

    /** Ganti seluruh resep produk. is_sample default false saat disimpan admin. */
    public function update(RecipeRequest $request, Product $product): JsonResponse
    {
        $outletId = AdminOutlet::resolve($request);

        $this->recipes->save(
            $outletId,
            $product,
            $request->validated('variants'),
            $request->boolean('is_sample'),
            $request->user(),
            $request->exists('note') ? $request->input('note') : false,
        );

        return response()->json([
            'data' => $this->recipes->show($outletId, $product->fresh()),
            'message' => 'Resep tersimpan.',
        ]);
    }
}
