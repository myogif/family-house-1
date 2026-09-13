# Prompt Lanjutan Migrasi Next.js dan Supabase

Gunakan prompt berikut besok untuk melanjutkan pekerjaan:

```text
Lanjutkan migrasi aplikasi family-house dari posisi terakhir di working tree saat ini.

Target arsitektur:
- Next.js App Router
- Supabase Auth, Postgres, RLS, dan RPC
- Deploy ke Vercel
- Tanpa FastAPI dan tanpa MongoDB pada hasil akhir

Status yang sudah dikerjakan:
- Next.js foundation sudah ditambahkan
- Supabase browser/server client sudah ada
- AuthContext mulai memakai Supabase Auth
- Schema lokal ada di:
  - supabase/migrations/202609120001_initial_schema.sql
  - supabase/migrations/202609120002_rpc_workflows.sql
- RPC tersedia:
  - create_family_with_owner
  - accept_invitation
  - request_family_join
- FamilyContext, CreateFamilyDialog, JoinFamilyDialog, dan useResource mulai memakai Supabase
- 10 unit test sudah passing

Sebelum mengubah kode:
1. Baca git status dan diff terbaru.
2. Baca file yang sudah berubah, jangan mengasumsikan isi dari percakapan saja.
3. Jalankan unit test dan build untuk mendapatkan baseline.
4. Periksa migration SQL, RLS, dan RPC untuk masalah keamanan atau SQL yang tidak valid.
5. Jangan menghapus backend FastAPI/MongoDB dulu.
6. Jangan menjalankan migration atau perubahan apa pun ke Supabase remote tanpa konfirmasi eksplisit terlebih dahulu.
7. Jangan menampilkan atau menambahkan secret/service_role key ke repository.

Lanjutkan fase berikutnya secara bertahap:
1. Selesaikan data access layer Supabase untuk:
   - transactions
   - budgets
   - goals
   - journal_entries
   - tasks
   - calendar_events
   - shopping_items
   - meals
   - activity_logs
2. Migrasikan page dan component yang masih memakai Axios/API FastAPI.
3. Tambahkan operasi create/update/delete/toggle dengan validasi input.
4. Gunakan RLS sebagai authorization utama, bukan pemeriksaan permission dari client saja.
5. Buat RPC untuk operasi sensitif:
   - approval/rejection join request
   - revoke invitation
   - role change
   - remove member
   - ownership transfer
   - family deletion
   - dashboard aggregation
6. Tambahkan unit test terlebih dahulu sebelum setiap data-layer implementation.
7. Tambahkan integration test untuk RLS dan RPC jika local Supabase tersedia.
8. Perbaiki seluruh route App Router yang masih kurang.
9. Jalankan:
   - npm --prefix frontend test -- --watchAll=false --runInBand
   - npm --prefix frontend run build
   - git diff --check
10. Setelah selesai, jalankan code review dan security review terhadap perubahan.

Prioritas utama:
- Jangan melakukan big-bang rewrite.
- Pertahankan UI dan perilaku aplikasi yang sudah ada.
- Jangan menghapus file legacy sebelum penggantinya sudah berjalan dan diuji.
- Laporkan file yang diubah, test yang berhasil/gagal, serta blocker secara jelas.
```

## Versi singkat

```text
Lanjutkan migrasi Next.js + Supabase family-house dari working tree saat ini. Baca git status/diff dan jalankan test/build terlebih dahulu. Migrasikan resource yang masih memakai FastAPI secara bertahap: transactions, budgets, goals, journal, tasks, calendar, shopping, meals, members, invitations, dan dashboard. Gunakan Supabase client, RLS, dan RPC untuk workflow sensitif. Tulis test terlebih dahulu, jangan hapus FastAPI/MongoDB sebelum cutover tervalidasi, jangan jalankan perubahan remote Supabase tanpa konfirmasi, lalu jalankan unit test, build, diff check, code review, dan security review.
```

## Catatan status

- Belum ada commit yang dibuat.
- Perubahan masih berada di working tree.
- Remote Supabase belum dimigrasikan.
- Backend FastAPI dan MongoDB masih dipertahankan sementara.
