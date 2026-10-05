<?php

namespace App\Enums;

enum PromotionType: string
{
    use Concerns;

    case Percent = 'percent';
    case Fixed = 'fixed';
    case Bogo = 'bogo';
    case FreeDelivery = 'free_delivery';

    public function label(): string
    {
        return match ($this) {
            self::Percent => 'Diskon persen',
            self::Fixed => 'Potongan harga',
            self::Bogo => 'Beli 1 gratis 1',
            self::FreeDelivery => 'Gratis ongkir',
        };
    }
}
