<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\BlogCategoryResource;
use App\Http\Resources\BlogResource;
use App\Models\Blog;
use App\Models\BlogCategory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Spatie\QueryBuilder\AllowedFilter;
use Spatie\QueryBuilder\QueryBuilder;

/**
 * @group Blog
 *
 * @unauthenticated
 */
class BlogController extends Controller
{
    /**
     * Daftar artikel terbit.
     *
     * @queryParam filter[category] string Slug kategori blog. Example: tips-kopi
     * @queryParam search string Cari judul. Example: kopi
     * @queryParam sort string -published_at, -views. Example: -published_at
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $blogs = QueryBuilder::for(Blog::query()->published()->with('category', 'author:id,name'))
            ->allowedFilters([
                AllowedFilter::callback('category', fn (Builder $q, $slug) => $q->whereHas('category', fn ($c) => $c->where('slug', $slug))),
            ])
            ->allowedSorts(['published_at', 'views'])
            ->defaultSort('-published_at')
            ->when($request->filled('search'), fn ($q) => $q->where('title', 'like', '%'.$request->string('search').'%'))
            ->paginate($this->perPage($request, 9))
            ->withQueryString();

        return BlogResource::collection($blogs);
    }

    /** Detail artikel + artikel terkait. */
    public function show(Blog $blog): JsonResponse
    {
        abort_unless($blog->status->value === 'published' && $blog->published_at?->isPast(), 404);

        $blog->increment('views');
        $blog->load('category', 'author:id,name');

        $related = Blog::query()->published()
            ->whereKeyNot($blog->id)
            ->when($blog->blog_category_id, fn ($q, $id) => $q->where('blog_category_id', $id))
            ->latest('published_at')->limit(3)->get();

        return (new BlogResource($blog))->additional(['related' => BlogResource::collection($related)])->response();
    }

    /** Kategori blog. */
    public function categories(): AnonymousResourceCollection
    {
        return BlogCategoryResource::collection(
            BlogCategory::query()->withCount(['blogs' => fn ($q) => $q->published()])->orderBy('name')->get()
        );
    }
}
