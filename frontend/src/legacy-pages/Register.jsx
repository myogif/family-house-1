"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { errorMessage } from "@/lib/errors";
import { HeartHandshake } from "lucide-react";

export default function Register() {
  const { register } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const rawRedirect = searchParams.get("redirect");
  const isSafeRedirect =
    rawRedirect &&
    rawRedirect.startsWith("/") &&
    !rawRedirect.startsWith("//") &&
    !rawRedirect.startsWith("/\\");
  const destination = isSafeRedirect ? rawRedirect : "/dashboard";

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await register(name.trim(), email.trim(), password);
      toast.success("Akun berhasil dibuat");
      router.push(destination);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary/40 px-4">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <HeartHandshake className="h-6 w-6" />
          </div>
          <span className="text-xl font-bold font-display">KeluargaKita</span>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Buat Akun</CardTitle>
            <CardDescription>Mulai kelola keluarga Anda dalam hitungan menit.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nama Lengkap</Label>
                <Input id="name" data-testid="register-name-input" value={name}
                  onChange={(e) => setName(e.target.value)} placeholder="Yogi Fernanda" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" data-testid="register-email-input" value={email}
                  onChange={(e) => setEmail(e.target.value)} placeholder="nama@email.com" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Kata Sandi</Label>
                <Input id="password" type="password" data-testid="register-password-input" value={password}
                  minLength={6} onChange={(e) => setPassword(e.target.value)} placeholder="Minimal 6 karakter" required />
              </div>
              <Button type="submit" className="w-full" data-testid="register-submit-button" disabled={busy}>
                {busy ? "Memproses…" : "Daftar"}
              </Button>
            </form>
            <p className="mt-4 text-center text-sm text-muted-foreground">
              Sudah punya akun?{" "}
              <Link href="/login" className="font-medium text-primary hover:underline" data-testid="go-login-link">
                Masuk
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}