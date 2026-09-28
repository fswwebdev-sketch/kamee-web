<?php

namespace App\Policies;

use App\Models\Order;
use App\Models\User;

class OrderPolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, Order $order): bool
    {
        return $user->canAccessOutlet($order->outlet_id);
    }

    public function updateStatus(User $user, Order $order): bool
    {
        return $user->canAccessOutlet($order->outlet_id);
    }

    public function refund(User $user, Order $order): bool
    {
        return $user->isSuperAdmin();
    }

    public function export(User $user): bool
    {
        return true;
    }
}
