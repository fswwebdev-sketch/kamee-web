<?php

namespace Tests;

use Database\Seeders\LoyaltyTierSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Illuminate\Support\Carbon;

abstract class TestCase extends BaseTestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        // Waktu tetap di jam operasional outlet agar tes deterministik.
        $this->travelTo(Carbon::parse('2026-09-28 10:00:00', 'Asia/Jakarta'));

        if (in_array(RefreshDatabase::class, class_uses_recursive(static::class), true)) {
            $this->seed(LoyaltyTierSeeder::class);
        }
    }
}
