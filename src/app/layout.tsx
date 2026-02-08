
"use client";

import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { FirebaseClientProvider, useUser, useFirestore, useDoc } from "@/firebase";
import { Toaster } from "@/components/ui/toaster";
import { ToastProvider } from "@/components/ui/toast";
import { useEffect, useState, useMemo } from "react";
import { WifiOff, ShieldAlert, Loader2 } from "lucide-react";
import { motion, AnimatePresence, MotionConfig } from "framer-motion";
import { FirebaseErrorListener } from "@/components/FirebaseErrorListener";
import { BiometricLock } from "@/components/BiometricLock";
import { SuccessfulExchangeOverlay } from "@/components/SuccessfulExchangeOverlay";
import { AdminPendingExchangeOverlay } from "@/components/AdminPendingExchangeOverlay";
import { DuelInvitationListener } from "@/components/DuelInvitationListener";
import { IncomingTransferOverlay } from "@/components/IncomingTransferOverlay";
import { RewardQuickView } from "@/components/RewardQuickView";
import { CustomKeyboard } from "@/components/CustomKeyboard";
import { TextSelectionMenu } from "@/components/TextSelectionMenu";
import { doc, getDoc, updateDoc, increment, serverTimestamp } from "firebase/firestore";
import { useTheme } from "next-themes";
import { Logo } from "@/components/Logo";
import { usePathname, useRouter } from "next/navigation";
import { PageTransition } from "@/components/PageTransition";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { cn } from "@/lib/utils";
import { hexToHsl, hexToRgb, getContrastColor } from "@/lib/colors";
import { useIsMobile } from "@/hooks/use-mobile";

function SystemBarSync() {
  const { resolvedTheme } = useTheme();
  const { user } = useUser();
  const db = useFirestore();
  const pathname = usePathname();
  
  const userDocRef = useMemo(() => (db && user?.uid) ? doc(db, "users", user.uid) : null, [db, user?.uid]);
  const { data: profile } = useDoc(userDocRef);

  useEffect(() => {
    const applySync = () => {
      const computedBg = window.getComputedStyle(document.body).backgroundColor;
      
      let metaThemeColor = document.querySelector('meta[name="theme-color"]');
      if (!metaThemeColor) {
        metaThemeColor = document.createElement('meta');
        metaThemeColor.setAttribute('name', 'theme-color');
        document.head.appendChild(metaThemeColor);
      }
      metaThemeColor.setAttribute('content', computedBg);

      let metaApple = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
      if (!metaApple) {
        metaApple = document.createElement('meta');
        metaApple.setAttribute('name', 'apple-mobile-web-app-status-bar-style');
        document.head.appendChild(metaApple);
      }
      metaApple.setAttribute('content', 'default');
    };

    applySync();
    const observer = new MutationObserver(applySync);
    observer.observe(document.body, { attributes: true, attributeFilter: ['style', 'class'] });
    const timer = setTimeout(applySync, 200);

    return () => {
      observer.disconnect();
      clearTimeout(timer);
    };
  }, [resolvedTheme, pathname, profile?.customBgColor]);

  return null;
}

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

function ColorInjector() {
  const { user } = useUser();
  const db = useFirestore();
  const userDocRef = useMemo(() => (db && user?.uid) ? doc(db, "users", user.uid) : null, [db, user?.uid]);
  const { data: profile } = useDoc(userDocRef);

  const cssVariables = useMemo(() => {
    let styles = "";
    if (profile?.customColor && profile.customColor !== 'default') {
      try {
        const hsl = hexToHsl(profile.customColor);
        const rgb = hexToRgb(profile.customColor);
        const contrast = getContrastColor(profile.customColor);
        styles += `--primary: ${hsl.hslValue}; --primary-rgb: ${rgb}; --primary-foreground: ${contrast}; --ring: ${hsl.hslValue}; --accent: ${hsl.hslValue}; --accent-foreground: ${contrast};`;
      } catch (e) {}
    }
    if (profile?.customBgColor && profile.customBgColor !== 'default') {
      try {
        const hsl = hexToHsl(profile.customBgColor);
        const contrast = getContrastColor(profile.customBgColor);
        styles += `--background: ${hsl.hslValue}; --foreground: ${contrast}; --card: ${hsl.hslValue}; --card-foreground: ${contrast}; --popover: ${hsl.hslValue}; --popover-foreground: ${contrast}; --muted: ${hsl.hslValue}; --muted-foreground: ${contrast};`;
      } catch (e) {}
    }
    if (!styles) return "";
    return `:root, .dark { ${styles} }`;
  }, [profile?.customColor, profile?.customBgColor]);

  if (!cssVariables) return null;
  return <style dangerouslySetInnerHTML={{ __html: cssVariables }} />;
}

function CommunityFluxPulsar() {
  const { user } = useUser();
  const db = useFirestore();
  useEffect(() => {
    if (!user || !db) return;
    const pulseFlux = async () => {
      try {
        const appStatusRef = doc(db, "appConfig", "status");
        await updateDoc(appStatusRef, { communityGoalPoints: increment(1), updatedAt: serverTimestamp() });
      } catch (error) {}
    };
    const interval = setInterval(pulseFlux, 120000);
    return () => clearInterval(interval);
  }, [user, db]);
  return null;
}

function MaintenanceOverlay({ message }: { message?: string }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-[1000] bg-background flex flex-col items-center justify-center p-8 text-center">
      <div className="absolute inset-0 pointer-events-none opacity-20 overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] rounded-full bg-primary/10 blur-[120px]" />
      </div>
      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }} className="space-y-12 max-w-sm">
        <div className="flex justify-center"><Logo className="scale-125" /></div>
        <div className="space-y-6">
          <div className="mx-auto w-24 h-24 bg-primary/5 rounded-[2.5rem] flex items-center justify-center border border-primary/10 shadow-2xl relative">
            <ShieldAlert className="h-10 w-10 text-primary" />
          </div>
          <div className="space-y-2">
            <h2 className="text-3xl font-black tracking-tight uppercase">Éveil en Pause</h2>
            <p className="text-sm font-medium opacity-40 leading-relaxed px-4">{message || "Nous harmonisons l'éther numérique. Revenez bientôt."}</p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function OfflineOverlay() {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, filter: "blur(20px)" }} className="fixed inset-0 z-[1100] bg-background flex flex-col items-center justify-center p-8 text-center">
      <div className="space-y-12 max-w-sm z-10">
        <div className="flex justify-center"><Logo className="scale-110" /></div>
        <div className="space-y-8">
          <div className="relative mx-auto w-24 h-24">
            <div className="relative h-full w-full bg-card/40 backdrop-blur-2xl border border-destructive/10 rounded-[2.5rem] flex items-center justify-center shadow-2xl overflow-hidden">
              <WifiOff className="h-10 w-10 text-destructive" />
            </div>
          </div>
          <div className="space-y-2">
            <h2 className="text-3xl font-black tracking-tight uppercase text-destructive italic">Signal Perdu</h2>
            <p className="text-sm font-medium opacity-40 px-4">L'éther est silencieux. Votre esprit est déconnecté.</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function SecurityWrapper({ children }: { children: React.ReactNode }) {
  const [isOffline, setIsOffline] = useState(false);
  const { user, isLoading: isAuthLoading } = useUser();
  const db = useFirestore();
  const pathname = usePathname();
  const router = useRouter();
  const isMobile = useIsMobile();

  const appConfigRef = useMemo(() => db ? doc(db, "appConfig", "status") : null, [db]);
  const userDocRef = useMemo(() => (db && user?.uid) ? doc(db, "users", user.uid) : null, [db, user?.uid]);

  const { data: profile } = useDoc(userDocRef);
  const { data: appStatus } = useDoc(appConfigRef);

  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => e.preventDefault();
    window.addEventListener('contextmenu', handleContextMenu);
    return () => window.removeEventListener('contextmenu', handleContextMenu);
  }, []);

  /**
   * ORACLE DU SCELLEMENT DU CLAVIER SYSTÈME
   * Règle stricte : Aucun champ de saisie ne doit invoquer le clavier natif.
   */
  useEffect(() => {
    const enforceKeyboardShield = () => {
      const inputs = document.querySelectorAll('input, textarea');
      inputs.forEach(el => {
        if (el.getAttribute('inputmode') !== 'none') {
          el.setAttribute('inputmode', 'none');
        }
        if (el.getAttribute('virtualKeyboardPolicy') !== 'manual') {
          el.setAttribute('virtualKeyboardPolicy', 'manual');
        }
        if (el.getAttribute('autocomplete') !== 'off') {
          el.setAttribute('autocomplete', 'off');
        }
      });
    };

    enforceKeyboardShield();
    const observer = new MutationObserver(enforceKeyboardShield);
    observer.observe(document.body, { childList: true, subtree: true });

    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        target.setAttribute('inputmode', 'none');
        target.setAttribute('virtualKeyboardPolicy', 'manual');
      }
    };

    const handleWindowFocus = () => {
      enforceKeyboardShield();
      if (document.activeElement instanceof HTMLElement && 
         (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA')) {
        document.activeElement.blur();
        setTimeout(() => (document.activeElement as HTMLElement)?.focus(), 10);
      }
    };

    window.addEventListener('focusin', handleFocusIn);
    window.addEventListener('focus', handleWindowFocus);
    
    return () => {
      observer.disconnect();
      window.removeEventListener('focusin', handleFocusIn);
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, []);

  useEffect(() => {
    if (isAuthLoading) return;
    const publicPaths = ["/", "/login", "/offline", "/autoriser"];
    if (!user && !publicPaths.includes(pathname)) {
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
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const isMaintenanceActive = appStatus?.maintenanceMode === true;
  const isStandardUser = profile?.role === 'user';
  const showMaintenance = isMaintenanceActive && isStandardUser;
  const showOffline = isOffline && !["/", "/login", "/autoriser", "/offline"].includes(pathname);

  if (isAuthLoading && !["/", "/login", "/autoriser", "/offline"].includes(pathname)) {
    return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin opacity-20" /></div>;
  }

  const excludedNavPaths = ["/", "/login", "/autoriser", "/offline", "/transfert", "/duels", "/arcade", "/_not-found"];
  const excludedBottomNavPaths = ["/", "/login", "/autoriser", "/offline", "/transfert", "/echange", "/duels", "/arcade", "/_not-found"];

  const isPathExcluded = (path: string, exclusions: string[]) => exclusions.some(p => p === "/" ? path === "/" : path.startsWith(p));

  const showNav = user && !isPathExcluded(pathname, excludedNavPaths);
  const showBottomNav = user && !isPathExcluded(pathname, excludedBottomNavPaths);
  const isEcoMode = profile?.reducedMotion === true;

  return (
    <div className={cn(isEcoMode && "reduced-motion")}>
      <MotionConfig reducedMotion={isEcoMode ? "always" : "no-preference"}>
        <AnimatePresence mode="wait">
          {showOffline ? <OfflineOverlay key="offline" /> : showMaintenance ? <MaintenanceOverlay key="maintenance" message={appStatus?.maintenanceMessage} /> : null}
        </AnimatePresence>
        <ThemeSync />
        <ColorInjector />
        <SystemBarSync />
        <BiometricLock />
        <SuccessfulExchangeOverlay />
        <AdminPendingExchangeOverlay />
        <IncomingTransferOverlay />
        <DuelInvitationListener />
        <CommunityFluxPulsar />
        <RewardQuickView />
        {isMobile && <CustomKeyboard />}
        <TextSelectionMenu />
        {showNav && <Header />}
        <PageTransition>{children}</PageTransition>
        {showBottomNav && <BottomNav />}
      </MotionConfig>
    </div>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0, viewport-fit=cover" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className="antialiased font-sans overflow-x-hidden">
        <FirebaseClientProvider>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
            <ToastProvider>
              <FirebaseErrorListener />
              <SecurityWrapper>{children}</SecurityWrapper>
              <Toaster />
            </ToastProvider>
          </ThemeProvider>
        </FirebaseClientProvider>
      </body>
    </html>
  );
}
