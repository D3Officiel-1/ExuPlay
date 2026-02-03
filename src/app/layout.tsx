"use client";

import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { FirebaseClientProvider, useUser, useFirestore, useDoc } from "@/firebase";
import { Toaster } from "@/components/ui/toaster";
import { useEffect, useState, useCallback, useMemo } from "react";
import { WifiOff, ShieldAlert, Sparkles, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { PrivacyShield } from "@/components/PrivacyShield";
import { BiometricLock } from "@/components/BiometricLock";
import { InstallPwa } from "@/components/InstallPwa";
import { FirebaseErrorListener } from "@/components/FirebaseErrorListener";
import { doc, getDoc } from "firebase/firestore";
import { useTheme } from "next-themes";
import { Logo } from "@/components/Logo";

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

function MaintenanceOverlay() {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[1000] bg-background flex flex-col items-center justify-center p-8 text-center"
    >
      <div className="absolute inset-0 pointer-events-none opacity-20 overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] rounded-full bg-primary/10 blur-[120px]" />
      </div>

      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="space-y-12 max-w-sm"
      >
        <div className="flex justify-center">
          <Logo className="scale-125" />
        </div>
        
        <div className="space-y-6">
          <div className="mx-auto w-24 h-24 bg-primary/5 rounded-[2.5rem] flex items-center justify-center border border-primary/10 shadow-2xl relative">
            <ShieldAlert className="h-10 w-10 text-primary" />
            <motion.div 
              animate={{ opacity: [0, 1, 0], scale: [1, 1.2, 1] }}
              transition={{ duration: 3, repeat: Infinity }}
              className="absolute inset-0 bg-primary/10 rounded-[2.5rem] blur-xl"
            />
          </div>
          
          <div className="space-y-2">
            <h2 className="text-3xl font-black tracking-tight uppercase">Éveil en Pause</h2>
            <p className="text-sm font-medium opacity-40 leading-relaxed px-4">
              Nous harmonisons l'éther numérique pour une expérience encore plus profonde. Revenez bientôt.
            </p>
          </div>
        </div>

        <div className="flex flex-col items-center gap-2">
          <div className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                animate={{ opacity: [0.2, 1, 0.2] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }}
                className="h-1 w-1 bg-primary rounded-full"
              />
            ))}
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-20">Mode Maintenance Actif</p>
        </div>
      </motion.div>
    </motion.div>
  );
}

function SecurityWrapper({ children }: { children: React.ReactNode }) {
  const [isOffline, setIsOffline] = useState(false);
  const [isAppLocked, setIsAppLocked] = useState(false);
  const [showPwaPrompt, setShowPwaPrompt] = useState(false);
  const { user } = useUser();
  const db = useFirestore();

  const appConfigRef = useMemo(() => {
    if (!db) return null;
    return doc(db, "appConfig", "status");
  }, [db]);

  const userDocRef = useMemo(() => {
    if (!db || !user?.uid) return null;
    return doc(db, "users", user.uid);
  }, [db, user?.uid]);

  const { data: profile, loading: profileLoading } = useDoc(userDocRef);
  const { data: appStatus, loading: appStatusLoading } = useDoc(appConfigRef);

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

  const isMaintenanceActive = appStatus?.maintenanceMode === true;
  const isStandardUser = profile?.role === 'user';
  const showMaintenance = isMaintenanceActive && isStandardUser;

  return (
    <>
      <PrivacyShield />
      <AnimatePresence mode="wait">
        {showMaintenance ? (
          <MaintenanceOverlay key="maintenance" />
        ) : isAppLocked ? (
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