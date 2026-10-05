<?php

namespace App\Policies;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;

/**
 * Dasar policy data pembukuan per outlet: Super Admin & Admin Outlet sama-sama boleh mengelola,
 * Admin Outlet hanya untuk outletnya sendiri.
 */
abstract class OutletOwnedPolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, Model $model): bool
    {
        return $user->canAccessOutlet($model->getAttribute('outlet_id'));
    }

    public function create(User $user): bool
    {
        return true;
    }

    public function update(User $user, Model $model): bool
    {
        return $user->canAccessOutlet($model->getAttribute('outlet_id'));
    }

    public function delete(User $user, Model $model): bool
    {
        return $user->canAccessOutlet($model->getAttribute('outlet_id'));
    }
}
