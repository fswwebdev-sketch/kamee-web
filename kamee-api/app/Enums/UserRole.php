<?php

namespace App\Enums;

enum UserRole: string
{
    use Concerns;

    case SuperAdmin = 'super_admin';
    case OutletAdmin = 'outlet_admin';

    public function label(): string
    {
        return match ($this) {
            self::SuperAdmin => 'Admin',
            self::OutletAdmin => 'Admin Outlet',
        };
    }
}
