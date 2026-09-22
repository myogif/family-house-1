"use client";

import { useState, useEffect } from "react";
import { Download, Share, X, Smartphone, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  useEffect(() => {
    // 1. Check if app is already running in standalone mode
    const inStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone === true;

    if (inStandalone) {
      setIsStandalone(true);
      return;
    }

    // 2. Check if user previously dismissed prompt
    const dismissed = localStorage.getItem("pwa_prompt_dismissed");
    if (dismissed && Date.now() - parseInt(dismissed, 10) < 7 * 24 * 60 * 60 * 1000) {
      // Don't show again for 7 days if dismissed
      return;
    }

    // 3. Detect iOS
    const ua = window.navigator.userAgent;
    const isIOSDevice = /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
    setIsIOS(isIOSDevice);

    if (isIOSDevice) {
      setShowPrompt(true);
    }

    // 4. Android / Chrome install prompt listener
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // 5. Register Service Worker if supported
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => {
          console.log("Service Worker registered with scope:", reg.scope);
        })
        .catch((err) => {
          console.warn("Service Worker registration failed:", err);
        });
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to install prompt: ${outcome}`);
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    localStorage.setItem("pwa_prompt_dismissed", Date.now().toString());
    setShowPrompt(false);
    setShowIOSGuide(false);
  };

  if (isStandalone || !showPrompt) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-md z-50 animate-in fade-in slide-in-from-bottom-5 duration-300">
      <div className="bg-slate-900/95 backdrop-blur-md text-white border border-slate-700/80 rounded-2xl p-4 shadow-2xl space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center shrink-0 shadow-inner">
              <Smartphone className="w-6 h-6 text-white" />
            </div>
            <div>
              <h4 className="font-semibold text-sm text-slate-100">
                Instal Aplikasi KeluargaKita
              </h4>
              <p className="text-xs text-slate-300">
                Akses lebih cepat & dapat digunakan di layar utama HP Anda.
              </p>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
            aria-label="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Button for Android / Chrome */}
        {deferredPrompt && (
          <Button
            onClick={handleInstallClick}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-2 rounded-xl flex items-center justify-center gap-2 shadow-md transition-all"
          >
            <Download className="w-4 h-4" />
            Instal Sekarang
          </Button>
        )}

        {/* Action / Guide for iOS Safari */}
        {isIOS && !deferredPrompt && (
          <div>
            {!showIOSGuide ? (
              <Button
                onClick={() => setShowIOSGuide(true)}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-2 rounded-xl flex items-center justify-center gap-2 shadow-md transition-all text-sm"
              >
                <Share className="w-4 h-4" />
                Cara Instal di iPhone / iPad
              </Button>
            ) : (
              <div className="bg-slate-800/90 rounded-xl p-3 text-xs text-slate-200 space-y-2 border border-slate-700">
                <p className="font-medium text-blue-400 flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-emerald-400" /> Langkah Instal di Safari iOS:
                </p>
                <ol className="list-decimal list-inside space-y-1 text-slate-300">
                  <li>
                    Tekan tombol <span className="font-semibold text-white">Share / Bagikan</span>{" "}
                    <Share className="inline w-3.5 h-3.5 text-blue-400 mb-0.5" /> di menu Safari.
                  </li>
                  <li>
                    Gulir ke bawah & pilih{" "}
                    <span className="font-semibold text-white">
                      "Tambah ke Layar Utama" (Add to Home Screen)
                    </span>.
                  </li>
                  <li>Tekan tombol **Tambah** di pojok kanan atas.</li>
                </ol>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
