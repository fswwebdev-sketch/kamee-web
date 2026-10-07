<?php

namespace App\Enums;

enum FulfillmentType: string
{
    use Concerns;

    case Pickup = 'pickup';
    case Delivery = 'delivery';
    case DineIn = 'dine_in';

    public function label(): string
    {
        return match ($this) {
            self::Pickup => 'Ambil di outlet',
            self::Delivery => 'Kirim via ojol',
            self::DineIn => 'Makan di tempat',
        };
    }
}
