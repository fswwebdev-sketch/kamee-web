<?php

namespace App\Support\Cache;

use Illuminate\Cache\DatabaseLock;

/**
 * DatabaseLock yang tidak memicu error saat kunci sedang dipegang pihak lain.
 *
 * Bawaan Laravel mencoba INSERT lalu menangkap pelanggaran unique key. Di PostgreSQL error itu
 * membatalkan seluruh transaksi yang sedang berjalan ("current transaction is aborted"), jadi di sini
 * dipakai INSERT ... ON CONFLICT DO NOTHING (insertOrIgnore) yang aman di MySQL, SQLite, dan PostgreSQL.
 */
class TransactionSafeDatabaseLock extends DatabaseLock
{
    public function acquire()
    {
        $acquired = $this->connection->table($this->table)->insertOrIgnore([
            'key' => $this->name,
            'owner' => $this->owner,
            'expiration' => $this->expiresAt(),
        ]) > 0;

        if (! $acquired) {
            $acquired = $this->connection->table($this->table)
                ->where('key', $this->name)
                ->where(fn ($query) => $query->where('owner', $this->owner)->orWhere('expiration', '<=', $this->currentTime()))
                ->update([
                    'owner' => $this->owner,
                    'expiration' => $this->expiresAt(),
                ]) >= 1;
        }

        if (count($this->lottery ?? []) === 2 && random_int(1, $this->lottery[1]) <= $this->lottery[0]) {
            $this->pruneExpiredLocks();
        }

        return $acquired;
    }
}
