import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <section className="w-full max-w-lg space-y-4 rounded-lg border bg-card p-8 text-center shadow-sm">
        <h1 className="text-3xl font-bold">KeluargaKita</h1>
        <p className="text-muted-foreground">
          Fondasi Next.js dan Supabase siap digunakan. Fitur aplikasi akan
          dipindahkan secara bertahap.
        </p>
        <Link className="inline-flex rounded-md bg-primary px-4 py-2 text-primary-foreground" href="/login">
          Masuk
        </Link>
      </section>
    </main>
  );
}
