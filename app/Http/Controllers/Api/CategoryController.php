<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\CategoryResource;
use App\Models\Category;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/**
 * @group Katalog
 *
 * @unauthenticated
 */
class CategoryController extends Controller
{
    /** Daftar kategori aktif. */
    public function index(): AnonymousResourceCollection
    {
        return CategoryResource::collection(
            Category::query()->active()->withCount(['products' => fn ($q) => $q->active()])->orderBy('sort_order')->get()
        );
    }
}
