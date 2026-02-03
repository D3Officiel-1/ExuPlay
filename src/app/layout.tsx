
"use client";

import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { FirebaseClientProvider, useUser, useFirestore } from "@/firebase";
import { Toaster } from "@/components/ui/toaster";
import { useEffect, useState, useCallback } from "react";
import { WifiOff } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { PrivacyShield } from "@/components/PrivacyShield";
import { BiometricLock } from "@/components/BiometricLock";
import { InstallPwa } from "@/components/InstallPwa";
import { FirebaseErrorListener } from "@/components/FirebaseErrorListener";
import { doc, getDoc } from "firebase/firestore";
import { useTheme } from "next-themes";

function ThemeSync() {
  const { user } = useUser();
  const db = useFirestore();
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    if (!user) return;
    const syncTheme = async () => {
      const snap = await getDoc(doc(db, "users", user.uid));
      if (snap.exists()) {
        const data = snap.data();
        if (data.theme && data.theme !== theme) {
          setTheme(data.theme);
        }
      }
    };
    syncTheme();
  }, [user, db, setTheme, theme]);

  return null;
}

function SecurityWrapper({ children }: { children: React.ReactNode }) {
  const [isOffline, setIsOffline] = useState(false);
  const [isAppLocked, setIsAppLocked] = useState(false);
  const [showPwaPrompt, setShowPwaPrompt] = useState(false);
  const { user } = useUser();
  const db = useFirestore();

  const checkLockRequirement = useCallback(async () => {
    if (!user) return;
    const isBiometricLocal = localStorage.getItem("citation_biometric_enabled") === "true";
    if (isBiometricLocal) {
      setIsAppLocked(true);
    } else {
      const snap = await getDoc(doc(db, "users", user.uid));
      if (snap.exists() && snap.data().biometricEnabled) {
        localStorage.setItem("citation_biometric_enabled", "true");
        setIsAppLocked(true);
      }
    }
  }, [user, db]);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    setIsOffline(!navigator.onLine);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkLockRequirement();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    if (document.visibilityState === 'visible') {
      checkLockRequirement();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [checkLockRequirement]);

  const handleUnlockSuccess = () => {
    setIsAppLocked(false);
    setShowPwaPrompt(true);
  };

  return (
    <>
      <PrivacyShield />
      <AnimatePresence mode="wait">
        {isAppLocked ? (
          <BiometricLock key="lock" onSuccess={handleUnlockSuccess} />
        ) : showPwaPrompt ? (
          <InstallPwa key="pwa-prompt" />
        ) : null}
      </AnimatePresence>
      <AnimatePresence>
        {isOffline && (
          <motion.div 
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -50, opacity: 0 }}
            className="fixed top-0 left-0 right-0 z-[100] bg-destructive text-destructive-foreground py-2 px-4 flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-widest"
          >
            <div className="flex items-center gap-2">
              <WifiOff className="h-4 w-4" />
              <span>Mode Hors Ligne activé</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <ThemeSync />
      {children}
    </>
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', function() {
        navigator.serviceWorker.register('/sw.js').then(
          (reg) => console.log('SW registered'),
          (err) => console.log('SW failed', err)
        );
      });
    }
  }, []);

  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Exu Play" />
        <meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)" />
        <meta name="theme-color" content="#000000" media="(prefers-color-scheme: dark)" />
      </head>
      <body className="antialiased font-sans">
        <FirebaseClientProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <FirebaseErrorListener />
            <SecurityWrapper>
              {children}
            </SecurityWrapper>
            <Toaster />
          </ThemeProvider>
        </FirebaseClientProvider>
      </body>
    </html>
  );
}
