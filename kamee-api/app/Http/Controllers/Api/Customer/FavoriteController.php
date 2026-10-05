<?php

namespace App\Http\Controllers\Api\Customer;

use App\Http\Controllers\Controller;
use App\Http\Requests\Customer\StoreFavoriteRequest;
use App\Http\Resources\ProductResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/**
 * @group Pelanggan: Favorit
 *
 * @authenticated
 */
class FavoriteController extends Controller
{
    /** Produk favorit. */
    public function index(Request $request): AnonymousResourceCollection
    {
        return ProductResource::collection(
            $request->user()->favorites()->active()->paginate($this->perPage($request, 20))
        );
    }

    /** Tambah favorit. */
    public function store(StoreFavoriteRequest $request): JsonResponse
    {
        $request->user()->favorites()->syncWithoutDetaching([$request->integer('product_id')]);

        return response()->json(['message' => 'Produk ditambahkan ke favorit.'], 201);
    }

    /** Hapus favorit. */
    public function destroy(Request $request, int $productId): JsonResponse
    {
        $request->user()->favorites()->detach($productId);

        return response()->json(['message' => 'Produk dihapus dari favorit.']);
    }
}
