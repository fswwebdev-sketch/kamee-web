<?php

use App\Actions\Scheduling\RunScheduledTasks;
use App\Enums\OrderStatus;
use App\Models\Order;
use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

beforeEach(fn () => config(['kamee.cron_secret' => 'rahasia-cron-uji']));

it('menolak pemicu cron tanpa rahasia yang benar', function () {
    $this->postJson('/api/v1/internal/cron')->assertUnauthorized()->assertJsonPath('message', 'Rahasia cron tidak valid.');
    $this->postJson('/api/v1/internal/cron', [], ['X-Cron-Secret' => 'salah'])->assertUnauthorized();
    $this->getJson('/api/v1/internal/cron', ['Authorization' => 'Bearer salah'])->assertUnauthorized();

    // CRON_SECRET kosong = endpoint nonaktif, walau header juga kosong.
    config(['kamee.cron_secret' => '']);
    $this->postJson('/api/v1/internal/cron', [], ['X-Cron-Secret' => ''])->assertUnauthorized();
});

it('menjalankan tugas terjadwal secara sinkron dan mengembalikan ringkasan', function () {
    $this->travelTo(now()->setDate(2026, 10, 5)->setTime(9, 0));
    $stale = Order::factory()->create(['created_at' => now()->subMinutes(61)]);

    $response = $this->postJson('/api/v1/internal/cron', [], ['X-Cron-Secret' => 'rahasia-cron-uji'])
        ->assertOk()
        ->assertJsonPath('data.status', 'ok')
        ->assertJsonPath('data.tasks.orders:cancel-unpaid.status', 'ok')
        ->assertJsonPath('data.tasks.orders:cancel-unpaid.output', '1 pesanan dibatalkan otomatis.')
        ->assertJsonPath('data.tasks.payments:reconcile.status', 'ok')
        ->assertJsonPath('data.tasks.loyalty:expire-points.status', 'ok');

    expect($stale->fresh()->status)->toBe(OrderStatus::Cancelled)
        ->and($response->json('data.tasks.orders:cancel-unpaid.duration_ms'))->toBeInt();

    // Tugas harian hanya sekali per hari.
    $this->postJson('/api/v1/internal/cron', [], ['X-Cron-Secret' => 'rahasia-cron-uji'])
        ->assertOk()
        ->assertJsonPath('data.tasks.loyalty:expire-points.status', 'skipped')
        ->assertJsonPath('data.tasks.orders:cancel-unpaid.output', '0 pesanan dibatalkan otomatis.');
});

it('menunda tugas harian sampai jamnya dan menerima Bearer dari Vercel Cron', function () {
    $this->travelTo(now()->setDate(2026, 10, 5)->setTime(0, 10));

    $this->getJson('/api/v1/internal/cron', ['Authorization' => 'Bearer rahasia-cron-uji'])
        ->assertOk()->assertJsonPath('data.tasks.loyalty:expire-points.status', 'skipped')
        ->assertJsonPath('data.tasks.loyalty:expire-points.reason', 'Dijadwalkan harian pukul 00:15.');

    $this->travelTo(now()->setTime(0, 15));
    $this->getJson('/api/v1/internal/cron', ['Authorization' => 'Bearer rahasia-cron-uji'])
        ->assertOk()->assertJsonPath('data.tasks.loyalty:expire-points.status', 'ok');
});

it('menolak pemanggilan ganda saat cron sebelumnya masih berjalan', function () {
    $lock = Cache::lock('kamee:cron:run', 60);
    $lock->get();

    $this->postJson('/api/v1/internal/cron', [], ['X-Cron-Secret' => 'rahasia-cron-uji'])
        ->assertStatus(409)->assertJsonPath('data.status', 'busy');

    $lock->release();
});

it('mencakup semua perintah yang dijadwalkan di routes/console.php', function () {
    $scheduled = collect(app(Schedule::class)->events())
        ->map(fn ($e) => str($e->command)->after("artisan' ")->toString())
        ->sort()->values()->all();

    $covered = collect(RunScheduledTasks::EVERY_RUN)->merge(array_keys(RunScheduledTasks::DAILY))->sort()->values()->all();

    expect($covered)->toBe($scheduled);
});

it('membersihkan entri cache database yang kedaluwarsa', function () {
    DB::table('cache')->insert([
        ['key' => 'lama', 'value' => 'x', 'expiration' => now()->subMinute()->getTimestamp()],
        ['key' => 'baru', 'value' => 'x', 'expiration' => now()->addHour()->getTimestamp()],
    ]);
    DB::table('cache_locks')->insert(['key' => 'kunci-lama', 'owner' => 'a', 'expiration' => now()->subMinute()->getTimestamp()]);

    $this->artisan('kamee:prune-cache')->expectsOutput('1 entri cache & 1 kunci kedaluwarsa dihapus.')->assertSuccessful();

    expect(DB::table('cache')->pluck('key')->all())->toBe(['baru'])
        ->and(DB::table('cache_locks')->count())->toBe(0);
});

it('perintah kamee:cron menjalankan tugas yang sama', function () {
    $this->artisan('kamee:cron')->assertSuccessful();
});
