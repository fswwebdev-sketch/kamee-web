<?php

namespace App\Enums;

enum OrderStatus: string
{
    use Concerns;

    case Pending = 'pending';
    case Paid = 'paid';
    case Processing = 'processing';
    case Shipped = 'shipped';
    case Completed = 'completed';
    case Cancelled = 'cancelled';

    public function label(): string
    {
        return match ($this) {
            self::Pending => 'Menunggu pembayaran',
            self::Paid => 'Sudah dibayar',
            self::Processing => 'Sedang diproses',
            self::Shipped => 'Dalam pengantaran',
            self::Completed => 'Selesai',
            self::Cancelled => 'Dibatalkan',
        };
    }

    /**
     * Transisi dasar yang diizinkan. Aturan tambahan (tunai, jenis pemenuhan, refund)
     * diperiksa oleh OrderStateMachine.
     *
     * @return list<self>
     */
    public function allowedTransitions(): array
    {
        return match ($this) {
            self::Pending => [self::Paid, self::Processing, self::Cancelled],
            self::Paid => [self::Processing],
            self::Processing => [self::Shipped, self::Completed, self::Cancelled],
            self::Shipped => [self::Completed],
            self::Completed, self::Cancelled => [],
        };
    }

    public function canTransitionTo(self $to): bool
    {
        return in_array($to, $this->allowedTransitions(), true);
    }

    public function isFinal(): bool
    {
        return in_array($this, [self::Completed, self::Cancelled], true);
    }

    /** Status yang dihitung sebagai penjualan (sudah dibayar / sedang berjalan / selesai). */
    public static function revenueStatuses(): array
    {
        return [self::Paid, self::Processing, self::Shipped, self::Completed];
    }
}
