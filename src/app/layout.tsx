
"use client";

import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { FirebaseClientProvider, useUser, useFirestore, useDoc } from "@/firebase";
import { Toaster } from "@/components/ui/toaster";
import { useEffect, useState, useMemo } from "react";
import { WifiOff, ShieldAlert, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { InstallPwa } from "@/components/InstallPwa";
import { FirebaseErrorListener } from "@/components/FirebaseErrorListener";
import { BiometricLock } from "@/components/BiometricLock";
import { doc, getDoc } from "firebase/firestore";
import { useTheme } from "next-themes";
import { Logo } from "@/components/Logo";
import { usePathname, useRouter } from "next/navigation";
import { PageTransition } from "@/components/PageTransition";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";

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

function MaintenanceOverlay({ message }: { message?: string }) {
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
              {message || "Nous harmonisons l'éther numérique pour une expérience encore plus profonde. Revenez bientôt."}
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
      exit={{ opacity: 0, filter: "blur(20px)" }}
      className="fixed inset-0 z-[1100] bg-background flex flex-col items-center justify-center p-8 text-center"
    >
      <motion.div
        animate={{ opacity: [0.03, 0.06, 0.03] }}
        transition={{ duration: 4, repeat: Infinity }}
        className="absolute inset-0 z-0 opacity-10 pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          backgroundSize: "150px 150px",
        }}
      />

      <div className="absolute inset-0 pointer-events-none opacity-30 overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] rounded-full bg-destructive/10 blur-[120px]" />
      </div>

      <motion.div 
        initial={{ y: 30, opacity: 0, scale: 0.9, filter: "blur(10px)" }}
        animate={{ y: 0, opacity: 1, scale: 1, filter: "blur(0px)" }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="space-y-12 max-w-sm z-10"
      >
        <div className="flex justify-center">
          <Logo className="scale-110" />
        </div>
        
        <div className="space-y-8">
          <div className="relative mx-auto w-24 h-24">
            <motion.div 
              animate={{ 
                scale: [1, 1.4, 1],
                opacity: [0.1, 0.3, 0.1]
              }}
              transition={{ duration: 4, repeat: Infinity }}
              className="absolute inset-0 bg-destructive/20 rounded-[2.5rem] blur-2xl"
            />
            <div className="relative h-full w-full bg-card/40 backdrop-blur-2xl border border-destructive/10 rounded-[2.5rem] flex items-center justify-center shadow-2xl">
              <WifiOff className="h-10 w-10 text-destructive" />
            </div>
          </div>
          
          <div className="space-y-2">
            <h2 className="text-3xl font-black tracking-tight uppercase text-destructive italic">Signal Perdu</h2>
            <p className="text-sm font-medium opacity-40 leading-relaxed px-4">
              L'éther est silencieux. Votre esprit est temporairement déconnecté du flux universel.
            </p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function SecurityWrapper({ children }: { children: React.ReactNode }) {
  const [isOffline, setIsOffline] = useState(false);
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

    const publicPaths = ["/", "/login", "/offline", "/autoriser"];
    const isPublicPath = publicPaths.includes(pathname);

    if (!user && !isPublicPath) {
      router.push("/login");
    } else if (user && pathname === "/login") {
      router.push("/home");
    }
  }, [user, isAuthLoading, pathname, router]);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    setIsOffline(!navigator.onLine);

    if (user && !["/", "/login", "/offline", "/autoriser"].includes(pathname)) {
      const timer = setTimeout(() => {
        setShowPwaPrompt(true);
      }, 3000);
      return () => clearTimeout(timer);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [user, pathname]);

  const isMaintenanceActive = appStatus?.maintenanceMode === true;
  const isStandardUser = profile?.role === 'user';
  const showMaintenance = isMaintenanceActive && isStandardUser;
  
  const canShowPwa = showPwaPrompt && !["/", "/login", "/offline", "/autoriser"].includes(pathname);

  const isOfflineAllowedPath = ["/", "/login", "/autoriser", "/offline"].includes(pathname);
  const showOffline = isOffline && !isOfflineAllowedPath;

  const isProtectedPath = !["/", "/login", "/offline", "/autoriser"].includes(pathname);
  
  if (isAuthLoading && isProtectedPath) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin opacity-20" />
      </div>
    );
  }

  const showNav = user && !["/", "/login", "/autoriser", "/offline", "/transfert"].includes(pathname);
  const showBottomNav = user && !["/", "/login", "/autoriser", "/offline", "/transfert", "/echange"].includes(pathname);

  return (
    <>
      <AnimatePresence mode="wait">
        {showOffline ? (
          <OfflineOverlay key="offline" />
        ) : showMaintenance ? (
          <MaintenanceOverlay key="maintenance" message={appStatus?.maintenanceMessage} />
        ) : canShowPwa ? (
          <InstallPwa key="pwa-prompt" />
        ) : null}
      </AnimatePresence>
      <ThemeSync />
      <BiometricLock />
      
      {showNav && <Header />}
      
      <PageTransition>
        {children}
      </PageTransition>

      {showBottomNav && <BottomNav />}
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
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Exu Play" />
        <meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)" />
        <meta name="theme-color" content="#000000" media="(prefers-color-scheme: dark)" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className="antialiased font-sans overflow-x-hidden">
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
