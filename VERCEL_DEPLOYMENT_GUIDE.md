# Panduan Deployment: Supabase & Vercel (Next.js)

Dokumen ini berisi panduan *step-by-step* untuk mendeploy aplikasi KeluargaKita. Karena aplikasi sekarang menggunakan arsitektur **Next.js dengan Server Actions** (meninggalkan FastAPI) dan **Supabase**, proses deployment menjadi jauh lebih sederhana.

## Tahap 1: Setup Supabase Production (Cloud)

Karena Anda telah menyiapkan Supabase lokal dengan sangat baik (migrasi lengkap dan data *seed*), kita hanya perlu menghubungkan proyek lokal ke cloud dan mendorong (push) skema database-nya.

### 1. Buat Proyek di Supabase Cloud
1. Buka [supabase.com](https://supabase.com) dan login.
2. Klik tombol **New Project**.
3. Pilih organisasi Anda, beri nama proyek (misal: `keluargakitas-prod`).
4. Buat password database yang kuat (simpan baik-baik).
5. Pilih region terdekat (misal: `Singapore`).
6. Klik **Create new project** dan tunggu hingga proses provisioning selesai.

### 2. Dapatkan Project Reference ID
1. Di dashboard Supabase proyek baru Anda, buka **Settings > General**.
2. Salin **Reference ID** (Kumpulan huruf/angka unik pada URL, misal: `tckpyfvdbahgxidbxkaz`).

### 3. Hubungkan Repositori Lokal ke Cloud
Buka terminal Anda di direktori *root* proyek (`family-house`), lalu jalankan:

```bash
# Login ke akun Supabase Anda via CLI (jika belum)
npx supabase login

# Hubungkan proyek lokal dengan proyek cloud
npx supabase link --project-ref <REFERENCE_ID_ANDA>
```
*(Saat diminta, masukkan password database yang Anda buat pada Langkah 1).*

### 4. Deploy Skema Database (Push)
Dorong semua file migrasi (yang ada di `supabase/migrations/`) ke production:

```bash
npx supabase db push
```

*(Opsional)* Jika Anda ingin menggunakan data *seed* (akun Yogi, Siti, dll) di production:
```bash
npx supabase db execute --file supabase/seed.sql
```

---

## Tahap 2: Deployment Next.js ke Vercel

### 1. Siapkan Environment Variables
Di dashboard Supabase proyek Anda, buka **Settings > API**. Anda akan membutuhkan dua nilai ini:
- **Project URL**
- **Project API Keys (anon / public)**

### 2. Buat Proyek di Vercel
1. Pastikan kode Anda sudah di-push ke GitHub (`origin/main`).
2. Buka [vercel.com](https://vercel.com) dan login menggunakan akun GitHub Anda.
3. Klik **Add New... > Project**.
4. Cari repositori GitHub `family-house` Anda, lalu klik **Import**.

### 3. Konfigurasi Vercel
Pada halaman konfigurasi proyek di Vercel, lakukan penyesuaian berikut:
- **Framework Preset:** Pilih `Next.js` (biasanya terdeteksi otomatis).
- **Root Directory:** **(PENTING!)** Klik tombol *Edit*, lalu pilih direktori `frontend`. Ini karena aplikasi Next.js Anda berada di dalam folder tersebut.
- **Environment Variables:** Tambahkan dua variabel berikut dari Supabase:
  - Name: `NEXT_PUBLIC_SUPABASE_URL` | Value: `https://<REFERENCE_ID>.supabase.co`
  - Name: `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Value: `sb_publishable_...` (Kunci anon/public Anda)

### 4. Deploy
Klik tombol **Deploy**. Vercel akan secara otomatis membangun (*build*) proyek Anda. Tunggu sekitar 2-3 menit. Jika berhasil, Anda akan mendapatkan URL publik aplikasi Anda (misal: `https://family-house.vercel.app`).

---

## Catatan Struktur Direktori (Airbnb Style / Standar Next.js)

Saat ini struktur direktori `frontend/src` Anda sudah cukup mengikuti standar modern Next.js (App Router) yang baik:

```text
frontend/src/
├── app/                  # Routing Next.js (Server Components secara default)
├── components/           # Komponen UI
│   ├── common/           # Komponen reusable standar (PascalCase: CreateFamilyDialog.jsx)
│   ├── layout/           # Komponen layout (Header, Sidebar)
│   ├── ui/               # Komponen shadcn/ui (kebab-case: button.jsx, dialog.jsx)
│   └── ...               # Komponen berbasis fitur (family, journal)
├── constants/            # Konstanta (testIds, dll)
├── context/              # React Context providers
├── hooks/                # Custom React hooks (useAuth, dll)
├── lib/                  # Utility functions & koneksi pihak ketiga (supabase.js)
└── legacy-pages/         # Halaman lama (jika sedang migrasi dari Pages Router)
```

**Tips tambahan untuk menjaga standar Airbnb/Clean Code:**
1. **Penamaan File Komponen:** Gunakan `PascalCase` untuk komponen React standar (contoh: `UserProfile.jsx`), dan `kebab-case` untuk utilitas/fungsi (contoh: `format-date.js`). Komponen `shadcn/ui` umumnya dibiarkan `kebab-case` sesuai bawaannya.
2. **Co-location:** Simpan *file* yang hanya digunakan oleh satu fitur berdekatan dengan fitur tersebut (misal, `components/family/` untuk komponen khusus domain keluarga).
3. **Pemisahan Logika:** Pindahkan logika bisnis (termasuk *Server Actions*) ke dalam file terpisah (misal di folder `lib/actions/` atau di dalam folder `app/` terkait) agar komponen UI tetap "bersih" dan mudah di-test.
