<?php

namespace App\Models;

use App\Enums\UserRole;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable;

    protected $fillable = ['name', 'email', 'password', 'role', 'outlet_id', 'is_active', 'last_login_at'];

    protected $hidden = ['password', 'remember_token'];

    protected function casts(): array
    {
        return [
            'password' => 'hashed',
            'role' => UserRole::class,
            'is_active' => 'boolean',
            'last_login_at' => 'datetime',
        ];
    }

    public function outlet(): BelongsTo
    {
        return $this->belongsTo(Outlet::class);
    }

    public function isSuperAdmin(): bool
    {
        return $this->role === UserRole::SuperAdmin;
    }

    public function isOutletAdmin(): bool
    {
        return $this->role === UserRole::OutletAdmin;
    }

    /** Apakah user boleh mengelola data outlet tertentu. */
    public function canAccessOutlet(?int $outletId): bool
    {
        return $this->isSuperAdmin() || ($outletId !== null && $this->outlet_id === $outletId);
    }
}
