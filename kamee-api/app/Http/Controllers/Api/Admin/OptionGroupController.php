<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\OptionGroupRequest;
use App\Http\Resources\OptionGroupResource;
use App\Models\OptionGroup;
use App\Services\Admin\CatalogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/**
 * @group Admin: Katalog
 *
 * @authenticated
 */
class OptionGroupController extends Controller
{
    public function __construct(private readonly CatalogService $catalog) {}

    public function index(): AnonymousResourceCollection
    {
        $this->authorize('viewAny', OptionGroup::class);

        return OptionGroupResource::collection(OptionGroup::query()->with('options')->orderBy('id')->get());
    }

    /** Tambah grup opsi beserta opsinya. */
    public function store(OptionGroupRequest $request): JsonResponse
    {
        $this->authorize('create', OptionGroup::class);

        $group = $this->catalog->saveOptionGroup($request->validated());

        return (new OptionGroupResource($group))->additional(['message' => 'Grup opsi berhasil ditambahkan.'])->response()->setStatusCode(201);
    }

    public function show(OptionGroup $optionGroup): OptionGroupResource
    {
        $this->authorize('view', $optionGroup);

        return new OptionGroupResource($optionGroup->load('options'));
    }

    /** Ubah grup opsi. Opsi yang tidak dikirim akan dihapus. */
    public function update(OptionGroupRequest $request, OptionGroup $optionGroup): OptionGroupResource
    {
        $this->authorize('update', $optionGroup);

        $group = $this->catalog->saveOptionGroup($request->validated(), $optionGroup);

        return (new OptionGroupResource($group))->additional(['message' => 'Grup opsi berhasil diperbarui.']);
    }

    public function destroy(OptionGroup $optionGroup): JsonResponse
    {
        $this->authorize('delete', $optionGroup);

        $optionGroup->delete();

        return response()->json(['message' => 'Grup opsi berhasil dihapus.']);
    }
}
