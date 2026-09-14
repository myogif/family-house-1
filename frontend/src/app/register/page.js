"use client";

import { Suspense } from "react";
import Register from "../../legacy-pages/Register";

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Memuat...</div>}>
      <Register />
    </Suspense>
  );
}