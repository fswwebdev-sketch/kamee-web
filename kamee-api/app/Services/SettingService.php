<?php

namespace App\Services;

use App\Models\Setting;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

/**
 * Pengaturan bisnis: default dari config/kamee.php, dapat ditimpa di tabel settings.
 */
class SettingService
{
    private const CACHE_KEY = 'kamee:settings';

    /** @return array<string, mixed> */
    public function all(): array
    {
        $overrides = Cache::rememberForever(self::CACHE_KEY, fn () => Setting::query()->pluck('value', 'key')->all());

        return array_merge(config('kamee.settings'), array_intersect_key($overrides, config('kamee.settings')));
    }

    public function get(string $key, mixed $default = null): mixed
    {
        return $this->all()[$key] ?? $default;
    }

    public function int(string $key): int
    {
        return (int) $this->get($key, 0);
    }

    /** @param array<string, mixed> $values */
    public function update(array $values): array
    {
        DB::transaction(function () use ($values) {
            foreach (array_intersect_key($values, config('kamee.settings')) as $key => $value) {
                Setting::updateOrCreate(['key' => $key], ['value' => $value]);
            }
        });

        Cache::forget(self::CACHE_KEY);

        return $this->all();
    }
}
