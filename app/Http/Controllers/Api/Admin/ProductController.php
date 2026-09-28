<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\ProductImagesRequest;
use App\Http\Requests\Admin\ProductRequest;
use App\Http\Resources\ProductImageResource;
use App\Http\Resources\ProductResource;
use App\Models\Product;
use App\Models\ProductImage;
use App\Services\ProductService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Spatie\QueryBuilder\AllowedFilter;
use Spatie\QueryBuilder\QueryBuilder;

/**
 * @group Admin: Katalog
 *
 * @authenticated
 */
class ProductController extends Controller
{
    public function __construct(private readonly ProductService $products) {}

    /**
     * Daftar produk (termasuk nonaktif).
     *
     * @queryParam filter[category_id] integer Example: 1
     * @queryParam filter[is_active] boolean Example: 1
     * @queryParam filter[search] string Example: aren
     * @queryParam filter[trashed] string with|only Example: with
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $this->authorize('viewAny', Product::class);

        $products = QueryBuilder::for(Product::query()->with('category'))
            ->allowedFilters([
                AllowedFilter::exact('category_id'),
                AllowedFilter::exact('is_active'),
                AllowedFilter::trashed(),
                AllowedFilter::callback('search', fn ($q, $v) => $q->where('name', 'like', "%{$v}%")),
            ])
            ->allowedSorts(['name', 'base_price', 'sold_count', 'created_at'])
            ->defaultSort('name')
            ->paginate($this->perPage($request, 20))
            ->withQueryString();

        return ProductResource::collection($products);
    }

    /** Tambah produk (multipart bila ada gambar). */
    public function store(ProductRequest $request): JsonResponse
    {
        $this->authorize('create', Product::class);

        $product = $this->products->create($request->safe()->except('image'), $request->file('image'));

        return (new ProductResource($product))->additional(['message' => 'Produk berhasil ditambahkan.'])->response()->setStatusCode(201);
    }

    public function show(Product $product): ProductResource
    {
        $this->authorize('view', $product);

        return new ProductResource($product->load('category', 'images', 'optionGroups.options'));
    }

    /** Ubah produk. Untuk upload gambar gunakan POST dengan _method=PATCH. */
    public function update(ProductRequest $request, Product $product): ProductResource
    {
        $this->authorize('update', $product);

        $product = $this->products->update($product, $request->safe()->except('image'), $request->file('image'));

        return (new ProductResource($product))->additional(['message' => 'Produk berhasil diperbarui.']);
    }

    /** Hapus produk (soft delete). */
    public function destroy(Product $product): JsonResponse
    {
        $this->authorize('delete', $product);

        $product->delete();

        return response()->json(['message' => 'Produk berhasil dihapus.']);
    }

    /** Unggah galeri produk. */
    public function storeImages(ProductImagesRequest $request, Product $product): JsonResponse
    {
        $this->authorize('update', $product);

        $images = $this->products->addImages($product, $request->file('images'), $request->input('alt'));

        return response()->json([
            'message' => count($images).' gambar berhasil diunggah.',
            'data' => ProductImageResource::collection($images),
        ], 201);
    }

    /** Hapus gambar galeri. */
    public function destroyImage(Product $product, ProductImage $image): JsonResponse
    {
        $this->authorize('update', $product);
        abort_unless($image->product_id === $product->id, 404);

        $this->products->deleteImage($image);

        return response()->json(['message' => 'Gambar berhasil dihapus.']);
    }
}
