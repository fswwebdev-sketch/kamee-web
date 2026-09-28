<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\BlogCategoryRequest;
use App\Http\Resources\BlogCategoryResource;
use App\Models\BlogCategory;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/**
 * @group Admin: Blog
 *
 * @authenticated
 */
class BlogCategoryController extends Controller
{
    public function index(): AnonymousResourceCollection
    {
        $this->authorize('viewAny', BlogCategory::class);

        return BlogCategoryResource::collection(BlogCategory::query()->withCount('blogs')->orderBy('name')->get());
    }

    public function store(BlogCategoryRequest $request): JsonResponse
    {
        $this->authorize('create', BlogCategory::class);

        return (new BlogCategoryResource(BlogCategory::create($request->validated())))
            ->additional(['message' => 'Kategori blog berhasil ditambahkan.'])->response()->setStatusCode(201);
    }

    public function show(BlogCategory $blogCategory): BlogCategoryResource
    {
        $this->authorize('view', $blogCategory);

        return new BlogCategoryResource($blogCategory->loadCount('blogs'));
    }

    public function update(BlogCategoryRequest $request, BlogCategory $blogCategory): BlogCategoryResource
    {
        $this->authorize('update', $blogCategory);

        $blogCategory->update($request->validated());

        return (new BlogCategoryResource($blogCategory))->additional(['message' => 'Kategori blog berhasil diperbarui.']);
    }

    public function destroy(BlogCategory $blogCategory): JsonResponse
    {
        $this->authorize('delete', $blogCategory);

        $blogCategory->delete();

        return response()->json(['message' => 'Kategori blog berhasil dihapus.']);
    }
}
