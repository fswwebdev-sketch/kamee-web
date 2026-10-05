<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Schema;
use Throwable;

/**
 * @group Internal
 *
 * Penyiapan database untuk hosting tanpa terminal (Vercel + Supabase): menjalankan migrasi yang
 * tertunda, lalu mengisi data awal (tanpa data demo) bila belum ada pengguna. Idempoten — aman
 * dipanggil berulang. Diamankan dengan CRON_SECRET (header `X-Cron-Secret`, Bearer, atau `?key=`
 * agar bisa dibuka sekali dari browser) dan bisa dimatikan dengan KAMEE_SETUP_ENABLED=false.
 *
 * @unauthenticated
 */
class InternalSetupController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $secret = (string) config('kamee.cron_secret');
        // Kunci juga boleh di path (/internal/setup/{key}): sebagian proxy/rewrite membuang query string.
        $given = (string) ($request->header('X-Cron-Secret') ?: ($request->bearerToken() ?: ($request->query('key') ?: $request->route('key', ''))));

        if (! config('kamee.setup_enabled') || $secret === '' || $given === '' || ! hash_equals($secret, $given)) {
            return response()->json(['message' => 'Penyiapan tidak diizinkan.'], 401);
        }

        $steps = [];
        try {
            Artisan::call('migrate', ['--force' => true]);
            $steps['migrate'] = trim(Artisan::output()) ?: 'Tidak ada migrasi tertunda.';

            if (Schema::hasTable('users') && User::query()->doesntExist()) {
                config(['kamee.seed_demo' => false]);
                Artisan::call('db:seed', ['--force' => true]);
                $steps['seed'] = 'Data awal diisi (tanpa data demo).';
            } else {
                $steps['seed'] = 'Dilewati: data sudah ada.';
            }

            Cache::flush();
        } catch (Throwable $e) {
            report($e);

            return response()->json(['message' => 'Penyiapan gagal: '.$e->getMessage(), 'steps' => $steps], 500);
        }

        return response()->json(['message' => 'Database siap.', 'steps' => $steps]);
    }
}
