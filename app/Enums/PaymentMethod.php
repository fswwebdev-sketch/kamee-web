<?php

namespace App\Enums;

enum PaymentMethod: string
{
    use Concerns;

    case Qris = 'qris';
    case EWallet = 'ewallet';
    case BankTransfer = 'bank_transfer';
    case Cash = 'cash';

    public function label(): string
    {
        return match ($this) {
            self::Qris => 'QRIS',
            self::EWallet => 'E-Wallet',
            self::BankTransfer => 'Transfer Bank (VA)',
            self::Cash => 'Tunai',
        };
    }

    public function isOnline(): bool
    {
        return $this !== self::Cash;
    }
}
