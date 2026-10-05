<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Queries\IncludeProductOptions;
use App\Http\Resources\ProductDetailResource;
use App\Http\Resources\ProductResource;
use App\Http\Resources\ReviewResource;
use App\Models\Product;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Spatie\QueryBuilder\AllowedFilter;
use Spatie\QueryBuilder\AllowedInclude;
use Spatie\QueryBuilder\AllowedSort;
use Spatie\QueryBuilder\QueryBuilder;

/**
 * @group Katalog
 *
 * @unauthenticated
 */
class ProductController extends Controller
{
    /**
     * Menu produk.
     *
     * @queryParam search string Cari nama produk. Example: aren
     * @queryParam filter[category] string Slug kategori. Example: coffee
     * @queryParam filter[outlet] integer Hanya produk yang tersedia di outlet ini. Example: 1
     * @queryParam filter[featured] boolean Produk unggulan. Example: 1
     * @queryParam filter[best_seller] boolean Produk terlaris. Example: 1
     * @queryParam sort string price, -price, -sold_count, -rating, name. Example: -sold_count
     * @queryParam include string images, options, category. Example: category
     * @queryParam page integer Halaman. Example: 1
     * @queryParam per_page integer Maks 50. Example: 12
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $products = QueryBuilder::for(Product::query()->active()->whereHas('category', fn ($q) => $q->active()))
            ->allowedFilters([
                AllowedFilter::callback('category', fn (Builder $q, $slug) => $q->whereHas('category', fn ($c) => $c->whereIn('slug', (array) $slug))),
                AllowedFilter::callback('outlet', fn (Builder $q, $outletId) => $q->availableAt((int) $outletId)),
                AllowedFilter::exact('featured', 'is_featured'),
                AllowedFilter::exact('best_seller', 'is_best_seller'),
                AllowedFilter::callback('search', fn (Builder $q, $term) => $q->whereLike('name', '%'.$term.'%')),
            ])
            ->allowedSorts([
                AllowedSort::field('price', 'base_price'),
                AllowedSort::field('sold_count'),
                AllowedSort::field('rating', 'rating_avg'),
                AllowedSort::field('name'),
            ])
            ->allowedIncludes(['images', 'category', AllowedInclude::custom('options', new IncludeProductOptions)])
            ->when($request->filled('search'), fn ($q) => $q->whereLike('name', '%'.$request->string('search').'%'))
            ->defaultSort('-sold_count')
            ->paginate($this->perPage($request, 12))
            ->withQueryString();

        return ProductResource::collection($products);
    }

    /** Detail produk + galeri + opsi + ringkasan rating. */
    public function show(Product $product): ProductDetailResource
    {
        abort_unless($product->is_active, 404);

        $product->load(['category', 'images', 'optionGroups.options']);

        $breakdown = $product->reviews()->published()
            ->selectRaw('rating, COUNT(*) as total')->groupBy('rating')->pluck('total', 'rating')
            ->map(fn ($v) => (int) $v)->all();

        return (new ProductDetailResource($product))->withRatingBreakdown($breakdown);
    }

    /**
     * Ulasan produk.
     *
     * @queryParam rating integer Filter bintang (1-5). Example: 5
     */
    public function reviews(Request $request, Product $product): AnonymousResourceCollection
    {
        $reviews = $product->reviews()->published()->with('customer:id,name')
            ->when($request->integer('rating'), fn ($q, $r) => $q->where('rating', $r))
            ->latest()
            ->paginate($this->perPage($request, 10))
            ->withQueryString();

        return ReviewResource::collection($reviews);
    }

    /** Produk serupa (kategori sama, terlaris). */
    public function related(Product $product): AnonymousResourceCollection
    {
        return ProductResource::collection(
            Product::query()->active()
                ->where('category_id', $product->category_id)
                ->whereKeyNot($product->id)
                ->orderByDesc('sold_count')
                ->limit(8)
                ->get()
        );
    }
}
