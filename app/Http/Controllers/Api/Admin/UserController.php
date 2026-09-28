<?php

namespace App\Http\Controllers\Api\Admin;

use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\UserRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/**
 * @group Admin: Outlet & Pengguna
 *
 * @authenticated
 */
class UserController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $this->authorize('viewAny', User::class);

        return UserResource::collection(User::query()->with('outlet')->orderBy('name')->paginate($this->perPage($request, 20)));
    }

    public function store(UserRequest $request): JsonResponse
    {
        $this->authorize('create', User::class);

        $user = User::create($this->payload($request));

        return (new UserResource($user->load('outlet')))->additional(['message' => 'Pengguna berhasil ditambahkan.'])->response()->setStatusCode(201);
    }

    public function show(User $user): UserResource
    {
        $this->authorize('view', $user);

        return new UserResource($user->load('outlet'));
    }

    public function update(UserRequest $request, User $user): UserResource
    {
        $this->authorize('update', $user);

        $user->update($this->payload($request));

        if (! $user->is_active) {
            $user->tokens()->delete();
        }

        return (new UserResource($user->load('outlet')))->additional(['message' => 'Pengguna berhasil diperbarui.']);
    }

    public function destroy(User $user): JsonResponse
    {
        $this->authorize('delete', $user);

        $user->tokens()->delete();
        $user->delete();

        return response()->json(['message' => 'Pengguna berhasil dihapus.']);
    }

    private function payload(UserRequest $request): array
    {
        $data = array_filter($request->validated(), fn ($v, $k) => $k !== 'password' || filled($v), ARRAY_FILTER_USE_BOTH);

        if (isset($data['email'])) {
            $data['email'] = strtolower($data['email']);
        }

        if (($data['role'] ?? null) === UserRole::SuperAdmin->value) {
            $data['outlet_id'] = null;
        }

        return $data;
    }
}
