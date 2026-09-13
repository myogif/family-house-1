#!/usr/bin/env bash
set -euo pipefail

DATABASE_URL="${SUPABASE_LOCAL_DATABASE_URL:-postgresql://postgres:postgres@127.0.0.1:54322/postgres}"

if [[ "$DATABASE_URL" != *"@127.0.0.1:54322/"* && "$DATABASE_URL" != *"@localhost:54322/"* ]]; then
  printf 'Refusing non-local database URL: %s\n' "$DATABASE_URL" >&2
  exit 1
fi

if ! command -v psql >/dev/null 2>&1; then
  printf 'psql is required to run local Supabase tests\n' >&2
  exit 1
fi

if ! psql "$DATABASE_URL" -Atc 'select 1' >/dev/null 2>&1; then
  printf 'Local Supabase database is unavailable at %s\n' "$DATABASE_URL" >&2
  exit 1
fi

if ! psql "$DATABASE_URL" -Atc "select 1 from pg_extension where extname = 'pgtap'" | grep -q 1; then
  printf 'The local pgtap extension is unavailable; install/enable it before running SQL tests\n' >&2
  exit 1
fi

psql "$DATABASE_URL" --set ON_ERROR_STOP=1 --file supabase/tests/rls_rpc_test.sql
