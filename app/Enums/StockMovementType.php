<?php

namespace App\Enums;

enum StockMovementType: string
{
    use Concerns;

    case Opening = 'opening';
    case Purchase = 'purchase';
    case Sale = 'sale';
    case SaleReversal = 'sale_reversal';
    case Adjustment = 'adjustment';

    public function label(): string
    {
        return match ($this) {
            self::Opening => 'Stok awal',
            self::Purchase => 'Belanja',
            self::Sale => 'Penjualan',
            self::SaleReversal => 'Pembatalan penjualan',
            self::Adjustment => 'Stok opname',
        };
    }
}
