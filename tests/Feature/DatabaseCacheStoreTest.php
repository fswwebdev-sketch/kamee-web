<?php

use App\Support\Cache\TransactionSafeDatabaseLock;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\RateLimiter;

// CACHE_STORE=database dipakai di Vercel (tanpa Redis). Uji di sqlite/mysql/pgsql.
beforeEach(fn () => config(['cache.default' => 'database']));

it('kunci cache database tidak merusak transaksi saat kunci sedang dipegang', function () {
    $store = Cache::store('database');
    $first = $store->lock('uji:kunci', 30);

    expect($first)->toBeInstanceOf(TransactionSafeDatabaseLock::class);

    DB::transaction(function () use ($store, $first) {
        expect($first->get())->toBeTrue()
            ->and($store->lock('uji:kunci', 30)->get())->toBeFalse()
            // Transaksi tetap sehat (di PostgreSQL INSERT duplikat biasa akan membatalkannya).
            ->and(DB::table('cache_locks')->count())->toBe(1);

        $first->release();
        expect($store->lock('uji:kunci', 30)->get())->toBeTrue();
    });
});

it('kunci yang kedaluwarsa dapat diambil alih', function () {
    $store = Cache::store('database');
    expect($store->lock('uji:lama', 1)->get())->toBeTrue();

    $this->travel(5)->seconds();

    expect($store->lock('uji:lama', 10)->get())->toBeTrue();
});

it('rate limiter dan cache add/increment bekerja dengan store database', function () {
    foreach (range(1, 3) as $_) {
        RateLimiter::hit('uji:limit', 60);
    }

    expect(RateLimiter::tooManyAttempts('uji:limit', 3))->toBeTrue()
        ->and(RateLimiter::tooManyAttempts('uji:lain', 3))->toBeFalse()
        ->and(Cache::add('uji:add', ['a' => 1], 60))->toBeTrue()
        ->and(Cache::add('uji:add', ['a' => 2], 60))->toBeFalse()
        ->and(Cache::get('uji:add'))->toBe(['a' => 1]);
});
