<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\BannerRequest;
use App\Http\Resources\BannerResource;
use App\Models\Banner;
use App\Services\Admin\ContentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/**
 * @group Admin: Promo & Banner
 *
 * @authenticated
 */
class BannerController extends Controller
{
    public function __construct(private readonly ContentService $content) {}

    public function index(): AnonymousResourceCollection
    {
        $this->authorize('viewAny', Banner::class);

        return BannerResource::collection(Banner::query()->orderBy('placement')->orderBy('sort_order')->get());
    }

    public function store(BannerRequest $request): JsonResponse
    {
        $this->authorize('create', Banner::class);

        $banner = $this->content->saveBanner($request->validated(), $request->allFiles());

        return (new BannerResource($banner))->additional(['message' => 'Banner berhasil ditambahkan.'])->response()->setStatusCode(201);
    }

    public function show(Banner $banner): BannerResource
    {
        $this->authorize('view', $banner);

        return new BannerResource($banner);
    }

    public function update(BannerRequest $request, Banner $banner): BannerResource
    {
        $this->authorize('update', $banner);

        return (new BannerResource($this->content->saveBanner($request->validated(), $request->allFiles(), $banner)))
            ->additional(['message' => 'Banner berhasil diperbarui.']);
    }

    public function destroy(Banner $banner): JsonResponse
    {
        $this->authorize('delete', $banner);

        $banner->delete();

        return response()->json(['message' => 'Banner berhasil dihapus.']);
    }
}
