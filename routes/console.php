<?php

use App\Actions\Orders\CancelUnpaidOrders;
use App\Services\LoyaltyService;
use App\Services\PaymentService;
use Illuminate\Support\Facades\Artisan;
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

Schedule::command('orders:cancel-unpaid')->everyMinute()->withoutOverlapping()->onOneServer();
Schedule::command('payments:reconcile')->everyFiveMinutes()->withoutOverlapping()->onOneServer();
Schedule::command('loyalty:expire-points')->dailyAt('00:15')->withoutOverlapping()->onOneServer();
