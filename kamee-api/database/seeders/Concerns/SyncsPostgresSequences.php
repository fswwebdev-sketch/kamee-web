<?php

namespace Database\Seeders\Concerns;

use Illuminate\Support\Facades\DB;

/**
 * Seeder yang menyisipkan ID eksplisit tidak memajukan sequence PostgreSQL, sehingga INSERT berikutnya
 * (mis. tambah kategori dari dashboard) bentrok di primary key. Panggil setelah upsert ber-ID tetap.
 */
trait SyncsPostgresSequences
{
    protected function syncPostgresSequences(string ...$tables): void
    {
        if (DB::getDriverName() !== 'pgsql') {
            return;
        }

        foreach ($tables as $table) {
            $quoted = DB::getQueryGrammar()->wrapTable($table);
            DB::select("select setval(pg_get_serial_sequence(?, 'id'), coalesce((select max(id) from {$quoted}), 0) + 1, false)", [$table]);
        }
    }
}
