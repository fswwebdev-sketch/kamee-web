<?php

namespace App\Enums;

enum LoyaltyTransactionType: string
{
    use Concerns;

    case Earn = 'earn';
    case Redeem = 'redeem';
    case Expire = 'expire';
    case Adjust = 'adjust';

    public function label(): string
    {
        return match ($this) {
            self::Earn => 'Poin didapat',
            self::Redeem => 'Poin ditukar',
            self::Expire => 'Poin kedaluwarsa',
            self::Adjust => 'Penyesuaian poin',
        };
    }
}
