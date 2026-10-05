<?php

use App\Actions\Orders\CancelUnpaidOrders;
use App\Actions\Scheduling\RunScheduledTasks;
use App\Services\LoyaltyService;
use App\Services\PaymentService;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schedule;

Artisan::command('orders:cancel-unpaid', function (CancelUnpaidOrders $action) {
    $this->info("{$action()} pesanan dibatalkan otomatis.");
})->purpose('Batalkan pesanan non-tunai yang belum dibayar melewati batas waktu');

Artisan::command('loyalty:expire-points', function (LoyaltyService $loyalty) {
    $this->info("{$loyalty->expireAll()} poin kedaluwarsa.");
})->purpose('Kedaluwarsakan poin loyalitas (FIFO)');

Artisan::command('payments:reconcile', function (PaymentService $payments) {
    $this->info("{$payments->reconcilePending()} pembayaran diperbarui.");
})->purpose('Cocokkan status pembayaran pending dengan gateway');

Artisan::command('kamee:prune-cache', function () {
    // Store cache "database" (Vercel) tidak membersihkan baris kedaluwarsa yang tak pernah dibaca lagi
    // (mis. kunci rate limit per IP). Redis/array tidak perlu.
    $config = config('cache.stores.database');
    $now = now()->getTimestamp();
    $entries = DB::connection($config['connection'] ?? null)->table($config['table'] ?? 'cache')->where('expiration', '<=', $now)->delete();
    $locks = DB::connection($config['lock_connection'] ?? $config['connection'] ?? null)
        ->table($config['lock_table'] ?? 'cache_locks')->where('expiration', '<=', $now)->delete();

    $this->info("{$entries} entri cache & {$locks} kunci kedaluwarsa dihapus.");
})->purpose('Hapus entri cache database yang sudah kedaluwarsa');

Artisan::command('kamee:cron', function (RunScheduledTasks $run) {
    $summary = $run();
    foreach ($summary['tasks'] as $command => $task) {
        $this->line(sprintf('%-24s %-8s %s', $command, $task['status'], $task['output'] ?? $task['reason'] ?? $task['error'] ?? ''));
    }

    return $summary['status'] === 'ok' ? 0 : 1;
})->purpose('Jalankan tugas terjadwal sekali (pengganti schedule:work di hosting serverless)');

// Server biasa: `php artisan schedule:work`. Serverless (Vercel): POST /api/v1/internal/cron setiap 5 menit
// menjalankan tugas yang sama lewat App\Actions\Scheduling\RunScheduledTasks.
Schedule::command('orders:cancel-unpaid')->everyMinute()->withoutOverlapping()->onOneServer();
Schedule::command('payments:reconcile')->everyFiveMinutes()->withoutOverlapping()->onOneServer();
Schedule::command('loyalty:expire-points')->dailyAt('00:15')->withoutOverlapping()->onOneServer();
Schedule::command('kamee:prune-cache')->dailyAt('03:00')->withoutOverlapping()->onOneServer();
