<?php

namespace App\Enums;

enum PaymentStatus: string
{
    use Concerns;

    case Pending = 'pending';
    case Paid = 'paid';
    case Expired = 'expired';
    case Failed = 'failed';
    case Refunded = 'refunded';

    public function label(): string
    {
        return match ($this) {
            self::Pending => 'Menunggu pembayaran',
            self::Paid => 'Berhasil',
            self::Expired => 'Kedaluwarsa',
            self::Failed => 'Gagal',
            self::Refunded => 'Dikembalikan',
        };
    }

    public function isFinal(): bool
    {
        return $this !== self::Pending;
    }
}
