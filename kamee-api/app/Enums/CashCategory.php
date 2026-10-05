<?php

namespace App\Enums;

/** Kategori buku kas. Tiap kategori milik satu jenis (pemasukan/pengeluaran). */
enum CashCategory: string
{
    use Concerns;

    // Pemasukan
    case Penjualan = 'penjualan';
    case Modal = 'modal';
    case LainnyaMasuk = 'lainnya_masuk';

    // Pengeluaran
    case BahanBaku = 'bahan_baku';
    case Kemasan = 'kemasan';
    case Ongkir = 'ongkir';
    case Operasional = 'operasional';
    case Gaji = 'gaji';
    case Sewa = 'sewa';
    case Lainnya = 'lainnya';

    public function label(): string
    {
        return match ($this) {
            self::Penjualan => 'Penjualan di luar sistem',
            self::Modal => 'Modal/setoran',
            self::LainnyaMasuk => 'Pemasukan lain',
            self::BahanBaku => 'Bahan baku',
            self::Kemasan => 'Kemasan',
            self::Ongkir => 'Ongkir/transport',
            self::Operasional => 'Operasional',
            self::Gaji => 'Gaji/upah',
            self::Sewa => 'Sewa & listrik',
            self::Lainnya => 'Lain-lain',
        };
    }

    public function type(): CashEntryType
    {
        return in_array($this, [self::Penjualan, self::Modal, self::LainnyaMasuk], true)
            ? CashEntryType::Income
            : CashEntryType::Expense;
    }

    /** @return list<string> */
    public static function valuesFor(CashEntryType $type): array
    {
        return array_values(array_map(fn (self $c) => $c->value, array_filter(self::cases(), fn (self $c) => $c->type() === $type)));
    }

    /** Kategori pengeluaran yang dihitung sebagai belanja stok. */
    public function isStockPurchase(): bool
    {
        return in_array($this, [self::BahanBaku, self::Kemasan], true);
    }
}
