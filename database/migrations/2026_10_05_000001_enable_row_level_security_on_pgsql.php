<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Supabase: schema `public` otomatis diekspos lewat Data API (PostgREST) untuk role `anon` & `authenticated`.
 * Aplikasi ini hanya diakses lewat Laravel (role `postgres`, pemilik tabel → tidak terkena RLS), jadi seluruh
 * tabel dikunci: RLS aktif tanpa policy (= tolak semua untuk role lain) dan hak akses anon/authenticated dicabut.
 *
 * Hanya berjalan di PostgreSQL; MySQL/SQLite dilewati. Tabel dari migrasi berikutnya perlu memanggil
 * ulang perintah serupa (lihat README bagian Deploy).
 */
return new class extends Migration
{
    public function up(): void
    {
        if (DB::getDriverName() !== 'pgsql') {
            return;
        }

        foreach ($this->tables() as $table) {
            DB::statement("alter table {$table} enable row level security");
        }

        DB::unprepared(<<<'SQL'
            DO $$
            DECLARE r text;
            BEGIN
                FOREACH r IN ARRAY ARRAY['anon', 'authenticated'] LOOP
                    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = r) THEN
                        EXECUTE format('REVOKE ALL ON ALL TABLES IN SCHEMA public FROM %I', r);
                        EXECUTE format('REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM %I', r);
                    END IF;
                END LOOP;
            END $$;
            SQL);
    }

    public function down(): void
    {
        if (DB::getDriverName() !== 'pgsql') {
            return;
        }

        foreach ($this->tables() as $table) {
            DB::statement("alter table {$table} disable row level security");
        }
    }

    /** @return list<string> nama tabel ter-quote di schema aktif */
    private function tables(): array
    {
        return array_map(
            fn (object $row) => DB::getQueryGrammar()->wrapTable($row->tablename),
            DB::select('select tablename from pg_tables where schemaname = current_schema() order by tablename'),
        );
    }
};
