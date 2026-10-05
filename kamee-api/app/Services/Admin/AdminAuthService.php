<?php

namespace App\Services\Admin;

use App\Exceptions\BusinessException;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

class AdminAuthService
{
    /** @return array{user: User, token: string} */
    public function login(string $email, string $password, ?string $device = null): array
    {
        $user = User::query()->where('email', strtolower($email))->first();

        if ($user === null || ! Hash::check($password, $user->password)) {
            throw BusinessException::field('email', 'Email atau kata sandi salah.');
        }

        if (! $user->is_active) {
            throw BusinessException::field('email', 'Akun Anda dinonaktifkan. Hubungi Super Admin.', 403);
        }

        $user->forceFill(['last_login_at' => now()])->save();

        return [
            'user' => $user->load('outlet'),
            'token' => $user->createToken($device ?: 'dashboard', ['admin'])->plainTextToken,
        ];
    }
}
