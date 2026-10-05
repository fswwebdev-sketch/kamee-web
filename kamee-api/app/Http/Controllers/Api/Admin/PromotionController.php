<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\PromotionRequest;
use App\Http\Resources\Admin\AdminPromotionResource;
use App\Models\Promotion;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Spatie\QueryBuilder\AllowedFilter;
use Spatie\QueryBuilder\QueryBuilder;

/**
 * @group Admin: Promo & Banner
 *
 * @authenticated
 */
class PromotionController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $this->authorize('viewAny', Promotion::class);

        $promotions = QueryBuilder::for(Promotion::query()->withCount('usages'))
            ->allowedFilters([AllowedFilter::exact('type'), AllowedFilter::exact('is_active'), AllowedFilter::exact('outlet_id')])
            ->allowedSorts(['id', 'starts_at', 'ends_at'])
            ->defaultSort('-id')
            ->paginate($this->perPage($request, 20))
            ->withQueryString();

        return AdminPromotionResource::collection($promotions);
    }

    public function store(PromotionRequest $request): JsonResponse
    {
        $this->authorize('create', Promotion::class);

        $promotion = Promotion::create($request->validated());

        return (new AdminPromotionResource($promotion->loadCount('usages')))->additional(['message' => 'Promo berhasil dibuat.'])->response()->setStatusCode(201);
    }

    public function show(Promotion $promotion): AdminPromotionResource
    {
        $this->authorize('view', $promotion);

        return new AdminPromotionResource($promotion->loadCount('usages'));
    }

    public function update(PromotionRequest $request, Promotion $promotion): AdminPromotionResource
    {
        $this->authorize('update', $promotion);

        $promotion->update($request->validated());

        return (new AdminPromotionResource($promotion->loadCount('usages')))->additional(['message' => 'Promo berhasil diperbarui.']);
    }

    public function destroy(Promotion $promotion): JsonResponse
    {
        $this->authorize('delete', $promotion);

        $promotion->usages()->exists() ? $promotion->update(['is_active' => false]) : $promotion->delete();

        return response()->json(['message' => 'Promo berhasil dihapus.']);
    }
}
