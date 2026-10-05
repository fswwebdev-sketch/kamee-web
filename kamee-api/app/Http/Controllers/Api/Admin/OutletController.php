<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\OutletRequest;
use App\Http\Resources\OutletResource;
use App\Models\Outlet;
use App\Services\Admin\OutletService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/**
 * @group Admin: Outlet & Pengguna
 *
 * @authenticated
 */
class OutletController extends Controller
{
    public function __construct(private readonly OutletService $outlets) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $this->authorize('viewAny', Outlet::class);

        $user = $request->user();

        return OutletResource::collection(
            Outlet::query()->when($user->isOutletAdmin(), fn ($q) => $q->whereKey($user->outlet_id))->orderBy('name')->get()
        );
    }

    public function store(OutletRequest $request): JsonResponse
    {
        $this->authorize('create', Outlet::class);

        return (new OutletResource($this->outlets->save($request->validated())))
            ->additional(['message' => 'Outlet berhasil ditambahkan.'])->response()->setStatusCode(201);
    }

    public function show(Outlet $outlet): OutletResource
    {
        $this->authorize('view', $outlet);

        return new OutletResource($outlet);
    }

    public function update(OutletRequest $request, Outlet $outlet): OutletResource
    {
        $this->authorize('update', $outlet);

        return (new OutletResource($this->outlets->save($request->validated(), $outlet)))
            ->additional(['message' => 'Outlet berhasil diperbarui.']);
    }

    public function destroy(Outlet $outlet): JsonResponse
    {
        $this->authorize('delete', $outlet);

        $this->outlets->delete($outlet);

        return response()->json(['message' => 'Outlet berhasil dihapus.']);
    }
}
