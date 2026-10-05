<?php

namespace App\Http\Middleware;

use App\Models\Customer;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureCustomer
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user instanceof Customer || ! $user->tokenCan('customer')) {
            return response()->json(['message' => 'Endpoint ini khusus pelanggan. Silakan masuk dengan OTP WhatsApp.'], 403);
        }

        return $next($request);
    }
}
