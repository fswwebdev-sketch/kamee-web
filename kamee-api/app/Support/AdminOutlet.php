<?php

namespace App\Support;

use App\Exceptions\BusinessException;
use App\Models\Outlet;
use App\Models\User;
use Illuminate\Http\Request;

/**
 * Penentuan outlet untuk fitur admin per outlet (pembukuan, kasir).
 * Admin Outlet selalu dikunci ke outletnya; Super Admin memakai ?outlet_id= / body outlet_id.
 */
final class AdminOutlet
{
    /** Filter outlet untuk daftar/ringkasan: null = semua outlet (khusus Super Admin). */
    public static function filter(Request $request): ?int
    {
        /** @var User $user */
        $user = $request->user();

        if ($user->isOutletAdmin()) {
            return $user->outlet_id;
        }

        $id = (int) $request->input('outlet_id');

        return $id > 0 ? $id : null;
    }

    /** Outlet tunggal untuk data baru / resep. Super Admin tanpa outlet_id → outlet pertama. */
    public static function resolve(Request $request): int
    {
        /** @var User $user */
        $user = $request->user();

        if ($user->isOutletAdmin()) {
            return (int) $user->outlet_id;
        }

        $id = (int) $request->input('outlet_id');
        if ($id > 0) {
            if (! Outlet::query()->whereKey($id)->exists()) {
                throw BusinessException::field('outlet_id', 'Outlet tidak ditemukan.');
            }

            return $id;
        }

        return (int) (Outlet::query()->orderBy('id')->value('id')
            ?? throw BusinessException::field('outlet_id', 'Belum ada outlet.'));
    }
}
