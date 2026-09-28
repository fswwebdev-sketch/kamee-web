<?php

use App\Models\Customer;
use App\Models\Order;
use App\Models\User;
use Illuminate\Support\Facades\Broadcast;

/*
| Channel privat realtime (Laravel Reverb).
| Otorisasi: POST /api/v1/broadcasting/auth dengan Bearer token Sanctum.
*/

// Dashboard outlet: Super Admin atau Admin Outlet pemilik outlet.
Broadcast::channel('outlet.{outletId}', function ($user, int $outletId) {
    return $user instanceof User && $user->is_active && $user->canAccessOutlet($outletId);
});

// Halaman lacak pesanan: pelanggan pemilik pesanan atau admin outlet terkait.
Broadcast::channel('order.{code}', function ($user, string $code) {
    $order = Order::query()->withoutGlobalScopes()->where('code', $code)->first();

    if ($order === null) {
        return false;
    }

    return match (true) {
        $user instanceof Customer => $order->customer_id === $user->id,
        $user instanceof User => $user->is_active && $user->canAccessOutlet($order->outlet_id),
        default => false,
    };
});
