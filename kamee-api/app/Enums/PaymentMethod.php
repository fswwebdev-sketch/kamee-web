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

    /** Label singkat untuk pembukuan admin (Tunai / QRIS / Transfer). */
    public function bookLabel(): string
    {
        return match ($this) {
            self::BankTransfer => 'Transfer',
            default => $this->label(),
        };
    }

    /** Label dengan nama bank, mis. "Transfer BCA". */
    public function bookLabelWithBank(?string $bank): string
    {
        return $this === self::BankTransfer && filled($bank) ? 'Transfer '.trim($bank) : $this->bookLabel();
    }

    /**
     * Metode yang dipakai pembukuan (kas, belanja stok, kasir, konfirmasi manual).
     *
     * @return list<string>
     */
    public static function bookkeepingValues(): array
    {
        return [self::Cash->value, self::Qris->value, self::BankTransfer->value];
    }

    public function isOnline(): bool
    {
        return $this !== self::Cash;
    }
}
