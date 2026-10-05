<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\BlogRequest;
use App\Http\Resources\BlogResource;
use App\Models\Blog;
use App\Services\Admin\ContentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Spatie\QueryBuilder\AllowedFilter;
use Spatie\QueryBuilder\QueryBuilder;

/**
 * @group Admin: Blog
 *
 * @authenticated
 */
class BlogController extends Controller
{
    public function __construct(private readonly ContentService $content) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $this->authorize('viewAny', Blog::class);

        $blogs = QueryBuilder::for(Blog::query()->with('category', 'author:id,name'))
            ->allowedFilters([AllowedFilter::exact('status'), AllowedFilter::exact('blog_category_id')])
            ->allowedSorts(['created_at', 'published_at', 'views'])
            ->defaultSort('-created_at')
            ->paginate($this->perPage($request, 20))
            ->withQueryString();

        return BlogResource::collection($blogs);
    }

    public function store(BlogRequest $request): JsonResponse
    {
        $this->authorize('create', Blog::class);

        $blog = $this->content->saveBlog($request->safe()->except('cover'), $request->file('cover'), $request->user());

        return (new BlogResource($blog))->additional(['message' => 'Artikel berhasil disimpan.'])->response()->setStatusCode(201);
    }

    public function show(Blog $blog): JsonResponse
    {
        $this->authorize('view', $blog);

        return (new BlogResource($blog->load('category', 'author')))->additional(['content' => $blog->content])->response();
    }

    public function update(BlogRequest $request, Blog $blog): BlogResource
    {
        $this->authorize('update', $blog);

        return (new BlogResource($this->content->saveBlog($request->safe()->except('cover'), $request->file('cover'), $request->user(), $blog)))
            ->additional(['message' => 'Artikel berhasil diperbarui.']);
    }

    public function destroy(Blog $blog): JsonResponse
    {
        $this->authorize('delete', $blog);

        $blog->delete();

        return response()->json(['message' => 'Artikel berhasil dihapus.']);
    }
}
