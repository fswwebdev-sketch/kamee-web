<?php

namespace App\Models\Concerns;

use Illuminate\Support\Str;

/**
 * Membuat slug unik otomatis dari kolom sumber (default: name).
 */
trait HasSlug
{
    public static function bootHasSlug(): void
    {
        static::saving(function ($model) {
            if (blank($model->slug)) {
                $model->slug = $model->uniqueSlug(Str::slug($model->{$model->slugSource()}));
            }
        });
    }

    protected function slugSource(): string
    {
        return 'name';
    }

    protected function uniqueSlug(string $base): string
    {
        $base = $base !== '' ? $base : Str::lower(Str::random(6));
        $slug = $base;
        $i = 2;
        $query = fn (string $s) => static::query()
            ->when(method_exists($this, 'bootSoftDeletes'), fn ($q) => $q->withTrashed())
            ->where('slug', $s)
            ->when($this->exists, fn ($q) => $q->whereKeyNot($this->getKey()))
            ->exists();

        while ($query($slug)) {
            $slug = "{$base}-{$i}";
            $i++;
        }

        return $slug;
    }
}
