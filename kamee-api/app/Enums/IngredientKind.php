<?php

namespace App\Enums;

enum IngredientKind: string
{
    use Concerns;

    case Bahan = 'bahan';
    case Kemasan = 'kemasan';

    public function label(): string
    {
        return match ($this) {
            self::Bahan => 'Bahan',
            self::Kemasan => 'Kemasan',
        };
    }
}
