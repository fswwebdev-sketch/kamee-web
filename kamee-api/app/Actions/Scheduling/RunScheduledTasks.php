<?php

namespace App\Actions\Scheduling;

use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Cache;
use Throwable;

/**
 * Menjalankan tugas terjadwal (routes/console.php) secara sinkron tanpa daemon `schedule:work`.
 *
 * Dipanggil oleh POST /api/v1/internal/cron (mis. pg_cron + pg_net setiap 5 menit) atau `php artisan kamee:cron`.
 * - Tugas EVERY_RUN dijalankan pada setiap pemanggilan (idempoten & murah).
 * - Tugas DAILY dijalankan sekali per hari (zona waktu aplikasi) pada pemanggilan pertama setelah jamnya.
 * Satu kunci cache global mencegah dua pemanggilan berjalan bersamaan (setara withoutOverlapping/onOneServer).
 */
final class RunScheduledTasks
{
    /** @var list<string> */
    public const EVERY_RUN = ['orders:cancel-unpaid', 'payments:reconcile'];

    /** @var array<string, string> perintah => jam (H:i, APP_TIMEZONE) */
    public const DAILY = ['loyalty:expire-points' => '00:15', 'kamee:prune-cache' => '03:00'];

    private const LOCK = 'kamee:cron:run';

    /**
     * @return array{status:string, ran_at:string, tasks:array<string, array<string, mixed>>}
     */
    public function __invoke(): array
    {
        $now = Carbon::now();
        $lock = Cache::lock(self::LOCK, 600);

        if (! $lock->get()) {
            return ['status' => 'busy', 'ran_at' => $now->toIso8601String(), 'tasks' => []];
        }

        $tasks = [];

        try {
            foreach (self::EVERY_RUN as $command) {
                $tasks[$command] = $this->run($command);
            }

            foreach (self::DAILY as $command => $at) {
                $tasks[$command] = $this->runDaily($command, $at, $now);
            }
        } finally {
            $lock->release();
        }

        $failed = collect($tasks)->contains(fn (array $t) => $t['status'] === 'failed');

        return ['status' => $failed ? 'partial' : 'ok', 'ran_at' => $now->toIso8601String(), 'tasks' => $tasks];
    }

    /** @return array<string, mixed> */
    private function runDaily(string $command, string $at, Carbon $now): array
    {
        if ($now->lt($now->copy()->setTimeFromTimeString($at))) {
            return ['status' => 'skipped', 'reason' => "Dijadwalkan harian pukul {$at}."];
        }

        $key = "kamee:cron:daily:{$command}:{$now->toDateString()}";
        if (Cache::has($key)) {
            return ['status' => 'skipped', 'reason' => 'Sudah dijalankan hari ini.'];
        }

        $result = $this->run($command);
        if ($result['status'] === 'ok') {
            Cache::put($key, $now->toIso8601String(), $now->copy()->addDays(2));
        }

        return $result;
    }

    /** @return array<string, mixed> */
    private function run(string $command): array
    {
        $started = hrtime(true);

        try {
            $exitCode = Artisan::call($command);

            return [
                'status' => $exitCode === 0 ? 'ok' : 'failed',
                'exit_code' => $exitCode,
                'output' => trim(Artisan::output()),
                'duration_ms' => $this->elapsed($started),
            ];
        } catch (Throwable $e) {
            report($e);

            return ['status' => 'failed', 'error' => $e->getMessage(), 'duration_ms' => $this->elapsed($started)];
        }
    }

    private function elapsed(int $started): int
    {
        return (int) round((hrtime(true) - $started) / 1_000_000);
    }
}
