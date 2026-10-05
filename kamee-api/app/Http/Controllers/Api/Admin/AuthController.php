<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\LoginRequest;
use App\Http\Resources\UserResource;
use App\Services\Admin\AdminAuthService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * @group Admin: Autentikasi
 */
class AuthController extends Controller
{
    /**
     * Login admin.
     *
     * @unauthenticated
     */
    public function login(LoginRequest $request, AdminAuthService $auth): JsonResponse
    {
        $result = $auth->login($request->string('email'), $request->string('password'), $request->input('device_name'));

        return response()->json([
            'message' => 'Berhasil masuk.',
            'data' => ['token' => $result['token'], 'token_type' => 'Bearer', 'user' => new UserResource($result['user'])],
        ]);
    }

    /**
     * Profil admin yang login.
     *
     * @authenticated
     */
    public function me(Request $request): UserResource
    {
        return new UserResource($request->user()->load('outlet'));
    }

    /**
     * Logout admin.
     *
     * @authenticated
     */
    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Berhasil keluar.']);
    }
}
