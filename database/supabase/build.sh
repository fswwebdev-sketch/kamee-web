#!/usr/bin/env bash
#
# Membangun ulang database/supabase/schema.sql dan seed.sql dari migrasi + seeder Laravel.
# Jalankan ulang setiap kali ada migrasi baru, lalu terapkan perubahan ke Supabase.
#
# Kebutuhan: PostgreSQL lokal dengan database KOSONG (akan di-migrate:fresh!) dan pg_dump
# dengan versi >= versi server lokal tersebut. Contoh:
#
#   PGHOST=127.0.0.1 PGPORT=5432 PGUSER=postgres PGDATABASE=kamee_dump database/supabase/build.sh
#
set -euo pipefail

cd "$(dirname "$0")/../.."
OUT=database/supabase

export PGHOST="${PGHOST:-127.0.0.1}" PGPORT="${PGPORT:-5432}" PGUSER="${PGUSER:-postgres}" PGDATABASE="${PGDATABASE:-kamee_dump}"
export DB_CONNECTION=pgsql DB_URL= DB_HOST="$PGHOST" DB_PORT="$PGPORT" DB_DATABASE="$PGDATABASE" \
       DB_USERNAME="$PGUSER" DB_PASSWORD="${PGPASSWORD:-}" DB_PGSQL_DISABLE_PREPARES=false \
       CACHE_STORE=array QUEUE_CONNECTION=sync BROADCAST_CONNECTION=log BCRYPT_ROUNDS=12 \
       KAMEE_SEED_DEMO=false

# pg_dump >= 16.10 menambahkan meta-command psql \restrict/\unrestrict yang tidak dikenal SQL Editor Supabase.
dump() { pg_dump --no-owner --no-privileges "$@" | grep -v -E '^\\(un)?restrict '; }

header() {
    cat <<SQL
-- =============================================================================
-- Kamee Coffee API — $1
-- Dihasilkan oleh database/supabase/build.sh pada $(date -u +"%Y-%m-%d %H:%M UTC"). Jangan edit manual.
-- $2
-- =============================================================================

SQL
}

php artisan migrate:fresh --force --no-interaction >/dev/null

{
    header "skema database (PostgreSQL 15–17 / Supabase)" \
        "Jalankan SEKALI di database kosong (Supabase → SQL Editor → tempel → Run), lalu seed.sql."
    echo "BEGIN;"
    echo
    dump --schema-only
    echo "-- Riwayat migrasi: agar 'php artisan migrate' berikutnya hanya menjalankan migrasi baru."
    dump --data-only --column-inserts --table=public.migrations
    cat <<'SQL'
-- Supabase Data API (PostgREST): cabut akses role anon/authenticated (dilewati bila role tidak ada).
-- Laravel memakai role postgres (pemilik tabel) sehingga tidak terpengaruh RLS di atas.
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

COMMIT;
SQL
} > "$OUT/schema.sql"

php artisan db:seed --force --no-interaction >/dev/null

EXCLUDE=()
for t in migrations cache cache_locks sessions jobs job_batches failed_jobs personal_access_tokens password_reset_tokens otp_codes; do
    EXCLUDE+=("--exclude-table-data=public.$t")
done

{
    header "data awal TANPA data demo (KAMEE_SEED_DEMO=false)" \
        "Isi: outlet, 2 akun admin (sandi: password — SEGERA GANTI), menu, opsi, promo, banner, blog, tier loyalitas, pembukuan awal."
    echo "BEGIN;"
    echo
    dump --data-only --column-inserts "${EXCLUDE[@]}" | grep -v "migrations_id_seq"
    echo "COMMIT;"
} > "$OUT/seed.sql"

echo "OK: $OUT/schema.sql ($(wc -l < "$OUT/schema.sql") baris), $OUT/seed.sql ($(wc -l < "$OUT/seed.sql") baris)"
