"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import AppLayout from "@/components/layout/AppLayout";
import { FamilyProvider } from "@/context/FamilyContext";
import { useAuth } from "@/context/AuthContext";
import PWAInstallPrompt from "@/components/common/PWAInstallPrompt";

const PUBLIC_PREFIXES = ["/login", "/register", "/join-family"];

function isPublicPath(pathname) {
  return pathname === "/" || PUBLIC_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export default function RouteShell({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const publicPath = isPublicPath(pathname);

  useEffect(() => {
    if (!publicPath && user === false) router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
  }, [pathname, publicPath, router, user]);

  if (publicPath) {
    return (
      <>
        {children}
        <PWAInstallPrompt />
      </>
    );
  }
  if (user === null) return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Memuat…</div>;
  if (!user) return null;

  return (
    <FamilyProvider>
      <AppLayout>{children}</AppLayout>
      <PWAInstallPrompt />
    </FamilyProvider>
  );
}

