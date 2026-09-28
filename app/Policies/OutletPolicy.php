<?php

namespace App\Policies;

use App\Models\Outlet;
use App\Models\User;

class OutletPolicy extends SuperAdminManagedPolicy
{
    public function view(User $user, mixed $outlet): bool
    {
        return $user->canAccessOutlet($outlet->id);
    }

    /** Tandai produk tersedia/habis: Super Admin atau Admin Outlet pemilik outlet. */
    public function manageAvailability(User $user, Outlet $outlet): bool
    {
        return $user->canAccessOutlet($outlet->id);
    }
}
