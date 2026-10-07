<?php

namespace App\Http\Middleware;

use App\Models\User;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureAdmin
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user instanceof User || ! $user->tokenCan('admin')) {
            return response()->json(['message' => 'Endpoint ini khusus admin.'], 403);
        }

        if (! $user->is_active) {
            $user->currentAccessToken()?->delete();

            return response()->json(['message' => 'Akun Anda dinonaktifkan. Hubungi pemilik usaha.'], 403);
        }

        return $next($request);
    }
}
