<?php

namespace App\Models\Scopes;

use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Scope;
use Illuminate\Support\Facades\Auth;

/**
 * Global scope: Admin Outlet hanya melihat data milik outlet_id-nya.
 * Tidak aktif untuk Super Admin, pelanggan, tamu, maupun proses latar (scheduler/queue).
 */
class OutletScope implements Scope
{
    public function apply(Builder $builder, Model $model): void
    {
        $user = Auth::hasUser() ? Auth::user() : null;

        if ($user instanceof User && $user->isOutletAdmin()) {
            $builder->where($model->qualifyColumn('outlet_id'), $user->outlet_id);
        }
    }
}
