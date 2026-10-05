<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\CategoryRequest;
use App\Http\Resources\CategoryResource;
use App\Models\Category;
use App\Services\Admin\CatalogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/**
 * @group Admin: Katalog
 *
 * @authenticated
 */
class CategoryController extends Controller
{
    public function index(): AnonymousResourceCollection
    {
        $this->authorize('viewAny', Category::class);

        return CategoryResource::collection(Category::query()->withCount('products')->orderBy('sort_order')->get());
    }

    public function store(CategoryRequest $request): JsonResponse
    {
        $this->authorize('create', Category::class);

        $category = Category::create($request->validated());

        return (new CategoryResource($category))->additional(['message' => 'Kategori berhasil ditambahkan.'])->response()->setStatusCode(201);
    }

    public function show(Category $category): CategoryResource
    {
        $this->authorize('view', $category);

        return new CategoryResource($category->loadCount('products'));
    }

    public function update(CategoryRequest $request, Category $category): CategoryResource
    {
        $this->authorize('update', $category);

        $category->update($request->validated());

        return (new CategoryResource($category))->additional(['message' => 'Kategori berhasil diperbarui.']);
    }

    public function destroy(Category $category, CatalogService $catalog): JsonResponse
    {
        $this->authorize('delete', $category);

        $catalog->deleteCategory($category);

        return response()->json(['message' => 'Kategori berhasil dihapus.']);
    }
}
