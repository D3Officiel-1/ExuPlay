
"use client";

import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { FirebaseClientProvider, useUser, useFirestore, useDoc } from "@/firebase";
import { Toaster } from "@/components/ui/toaster";
import { useEffect, useState, useCallback, useMemo } from "react";
import { WifiOff, ShieldAlert, Sparkles, Loader2, RefreshCcw } from "lucide-react";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
import { PrivacyShield } from "@/components/PrivacyShield";
import { BiometricLock } from "@/components/BiometricLock";
import { InstallPwa } from "@/components/InstallPwa";
import { FirebaseErrorListener } from "@/components/FirebaseErrorListener";
import { doc, getDoc } from "firebase/firestore";
import { useTheme } from "next-themes";
import { Logo } from "@/components/Logo";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

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

function OfflineOverlay() {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[1100] bg-background/95 backdrop-blur-3xl flex flex-col items-center justify-center p-8 text-center"
    >
      <div className="absolute inset-0 pointer-events-none opacity-20 overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] rounded-full bg-destructive/10 blur-[120px]" />
      </div>

      <motion.div 
        initial={{ y: 20, opacity: 0, scale: 0.9 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        className="space-y-12 max-w-sm"
      >
        <div className="flex justify-center">
          <Logo className="scale-125" />
        </div>
        
        <div className="space-y-6">
          <div className="mx-auto w-24 h-24 bg-destructive/5 rounded-[2.5rem] flex items-center justify-center border border-destructive/10 shadow-2xl relative">
            <WifiOff className="h-10 w-10 text-destructive" />
            <motion.div 
              animate={{ opacity: [0, 1, 0], scale: [1, 1.2, 1] }}
              transition={{ duration: 3, repeat: Infinity }}
              className="absolute inset-0 bg-destructive/10 rounded-[2.5rem] blur-xl"
            />
          </div>
          
          <div className="space-y-2">
            <h2 className="text-3xl font-black tracking-tight uppercase text-destructive">Signal Perdu</h2>
            <p className="text-sm font-medium opacity-40 leading-relaxed px-4">
              L'éther est silencieux. Votre esprit est temporairement déconnecté du flux universel de l'éveil.
            </p>
          </div>
        </div>

        <Button 
          onClick={() => window.location.reload()}
          className="h-16 px-10 rounded-2xl font-black text-[10px] uppercase tracking-widest gap-3 shadow-xl bg-destructive text-destructive-foreground hover:bg-destructive/90 border-none"
        >
          <RefreshCcw className="h-4 w-4" />
          Résonner à nouveau
        </Button>
      </motion.div>
    </motion.div>
  );
}

function SecurityWrapper({ children }: { children: React.ReactNode }) {
  const [isOffline, setIsOffline] = useState(false);
  const [isAppLocked, setIsAppLocked] = useState(false);
  const [showPwaPrompt, setShowPwaPrompt] = useState(false);
  const { user, isLoading: isAuthLoading } = useUser();
  const db = useFirestore();
  const pathname = usePathname();
  const router = useRouter();

  const appConfigRef = useMemo(() => {
    if (!db) return null;
    return doc(db, "appConfig", "status");
  }, [db]);

  const userDocRef = useMemo(() => {
    if (!db || !user?.uid) return null;
    return doc(db, "users", user.uid);
  }, [db, user?.uid]);

  const { data: profile } = useDoc(userDocRef);
  const { data: appStatus } = useDoc(appConfigRef);

  useEffect(() => {
    if (isAuthLoading) return;

    const publicPaths = ["/", "/login", "/offline"];
    const isPublicPath = publicPaths.includes(pathname);

    if (!user && !isPublicPath) {
      router.push("/login");
    } else if (user && pathname === "/login") {
      router.push("/home");
    }
  }, [user, isAuthLoading, pathname, router]);

  const checkLockRequirement = useCallback(async () => {
    if (!user) return;
    const isBiometricLocal = localStorage.getItem("exu_biometric_enabled") === "true";
    if (isBiometricLocal) {
      setIsAppLocked(true);
    } else {
      const snap = await getDoc(doc(db, "users", user.uid));
      if (snap.exists() && snap.data().biometricEnabled) {
        localStorage.setItem("exu_biometric_enabled", "true");
        setIsAppLocked(true);
      } else {
        setShowPwaPrompt(true);
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
  
  const canShowPwa = showPwaPrompt && pathname !== "/" && pathname !== "/login" && pathname !== "/offline";

  const isProtectedPath = pathname !== "/" && pathname !== "/login" && pathname !== "/offline";
  if (isAuthLoading && isProtectedPath) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin opacity-20" />
      </div>
    );
  }

  return (
    <>
      <PrivacyShield />
      <AnimatePresence mode="wait">
        {isOffline && pathname !== "/offline" ? (
          <OfflineOverlay key="offline" />
        ) : showMaintenance ? (
          <MaintenanceOverlay key="maintenance" />
        ) : isAppLocked ? (
          <BiometricLock key="lock" onSuccess={handleUnlockSuccess} />
        ) : canShowPwa ? (
          <InstallPwa key="pwa-prompt" />
        ) : null}
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
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').then(
          (reg) => console.log('SW registered:', reg.scope),
          (err) => console.log('SW registration failed:', err)
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
