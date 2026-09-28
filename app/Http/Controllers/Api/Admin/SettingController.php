<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\UpdateSettingsRequest;
use App\Models\Setting;
use App\Services\SettingService;
use Illuminate\Http\JsonResponse;

/**
 * @group Admin: Pengaturan
 *
 * @authenticated
 */
class SettingController extends Controller
{
    public function __construct(private readonly SettingService $settings) {}

    /** Pengaturan ongkir, biaya, rasio poin, nomor WA. */
    public function show(): JsonResponse
    {
        $this->authorize('viewAny', Setting::class);

        return response()->json(['data' => $this->settings->all()]);
    }

    public function update(UpdateSettingsRequest $request): JsonResponse
    {
        $this->authorize('update', Setting::class);

        return response()->json([
            'message' => 'Pengaturan berhasil disimpan.',
            'data' => $this->settings->update($request->validated()),
        ]);
    }
}
