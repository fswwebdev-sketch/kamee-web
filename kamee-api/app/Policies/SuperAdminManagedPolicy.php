<?php

namespace App\Policies;

use App\Models\User;

/**
 * Dasar policy untuk data master: semua admin boleh melihat, hanya Super Admin yang boleh mengubah.
 */
abstract class SuperAdminManagedPolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, mixed $model): bool
    {
        return true;
    }

    public function create(User $user): bool
    {
        return $user->isSuperAdmin();
    }

    public function update(User $user, mixed $model): bool
    {
        return $user->isSuperAdmin();
    }

    public function delete(User $user, mixed $model): bool
    {
        return $user->isSuperAdmin();
    }
}
