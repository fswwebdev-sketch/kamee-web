<?php

namespace App\Http\Controllers\Api;

use App\Actions\Scheduling\RunScheduledTasks;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * @group Internal
 *
 * Pemicu tugas terjadwal untuk hosting tanpa daemon (Vercel). Wajib header `X-Cron-Secret`
 * (atau `Authorization: Bearer <CRON_SECRET>` dari Vercel Cron) yang sama dengan env CRON_SECRET.
 *
 * @unauthenticated
 */
class InternalCronController extends Controller
{
    public function __invoke(Request $request, RunScheduledTasks $runTasks): JsonResponse
    {
        $secret = (string) config('kamee.cron_secret');
        $given = (string) ($request->header('X-Cron-Secret') ?: $request->bearerToken());

        // CRON_SECRET kosong = endpoint nonaktif. hash_equals: perbandingan waktu-konstan.
        if ($secret === '' || $given === '' || ! hash_equals($secret, $given)) {
            return response()->json(['message' => 'Rahasia cron tidak valid.'], 401);
        }

        $summary = $runTasks();

        return response()->json(['data' => $summary], $summary['status'] === 'busy' ? 409 : 200);
    }
}
