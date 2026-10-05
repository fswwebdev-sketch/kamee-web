<?php

namespace App\Enums;

enum CashEntrySource: string
{
    use Concerns;

    case Manual = 'manual';
    case StockPurchase = 'stock_purchase';
}
