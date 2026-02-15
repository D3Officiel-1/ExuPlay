
"use client";

import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { FirebaseClientProvider, useUser, useFirestore, useDoc } from "@/firebase";
import { Toaster } from "@/components/ui/toaster";
import { ToastProvider } from "@/components/ui/toast";
import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence, MotionConfig } from "framer-motion";
import { FirebaseErrorListener } from "@/components/FirebaseErrorListener";
import { BiometricLock } from "@/components/BiometricLock";
import { SuccessfulExchangeOverlay } from "@/components/SuccessfulExchangeOverlay";
import { AdminPendingExchangeOverlay } from "@/components/AdminPendingExchangeOverlay";
import { DuelInvitationListener } from "@/components/DuelInvitationListener";
import { IncomingTransferOverlay } from "@/components/IncomingTransferOverlay";
import { TextSelectionMenu } from "@/components/TextSelectionMenu";
import { doc, getDoc } from "firebase/firestore";
import { useTheme } from "next-themes";
import { Logo } from "@/components/Logo";
import { usePathname, useRouter } from "next/navigation";
import { PageTransition } from "@/components/PageTransition";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { cn } from "@/lib/utils";
import { hexToHsl, hexToRgb, getContrastColor } from "@/lib/colors";
import { useIsMobile } from "@/hooks/use-mobile";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Loader2, Wrench, Sparkles } from "lucide-react";

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

function MaintenanceOverlay({ message }: { message?: string }) {
  return (
    <div className="fixed inset-0 z-[10005] bg-background flex flex-col items-center justify-center p-8 text-center overflow-hidden">
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-20">
        <motion.div 
          animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.2, 0.1] }}
          transition={{ duration: 8, repeat: Infinity }}
          className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] rounded-full bg-primary/10 blur-[120px]" 
        />
      </div>
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-12 max-w-sm z-10"
      >
        <Logo className="scale-110 mb-8" />
        <div className="relative mx-auto w-24 h-24">
          <motion.div 
            animate={{ scale: [1, 1.3, 1], opacity: [0.2, 0.4, 0.2] }}
            transition={{ duration: 3, repeat: Infinity }}
            className="absolute inset-0 bg-primary/20 rounded-[2.5rem] blur-2xl" 
          />
          <div className="relative h-full w-full bg-card/40 backdrop-blur-2xl border border-primary/10 rounded-[2.5rem] flex items-center justify-center shadow-2xl">
            <Wrench className="h-10 w-10 text-primary opacity-40 animate-pulse" />
          </div>
        </div>
        <div className="space-y-4">
          <h2 className="text-3xl font-black tracking-tight uppercase italic leading-none">Sanctuaire en Stase</h2>
          <p className="text-sm font-medium opacity-60 leading-relaxed px-4">
            {message || "L'Oracle procède à une harmonisation des flux. Le portail rouvrira bientôt ses portes."}
          </p>
        </div>
        <div className="pt-8 flex flex-col items-center gap-4 opacity-20">
          <div className="flex gap-1.5">
            {[0, 1, 2].map(i => (
              <motion.div key={i} animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 2, repeat: Infinity, delay: i * 0.4 }} className="h-1 w-1 rounded-full bg-primary" />
            ))}
          </div>
          <p className="text-[8px] font-black uppercase tracking-[0.5em] italic">Harmonisation en cours</p>
        </div>
      </motion.div>
    </div>
  );
}

function SecurityWrapper({ children }: { children: React.ReactNode }) {
  const { user, isLoading: isAuthLoading } = useUser();
  const db = useFirestore();
  const pathname = usePathname();
  const router = useRouter();
  const isMobile = useIsMobile();

  const userDocRef = useMemo(() => (db && user?.uid) ? doc(db, "users", user.uid) : null, [db, user?.uid]);
  const appConfigRef = useMemo(() => (db ? doc(db, "appConfig", "status") : null), [db]);

  const { data: profile } = useDoc(userDocRef);
  const { data: appStatus } = useDoc(appConfigRef);

  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => e.preventDefault();
    window.addEventListener('contextmenu', handleContextMenu);
    return () => window.removeEventListener('contextmenu', handleContextMenu);
  }, []);

  useEffect(() => {
    if (isAuthLoading) return;
    const publicPaths = ["/", "/login", "/autoriser"];
    if (!user && !publicPaths.includes(pathname)) {
      router.push("/login");
    }
  }, [user, isAuthLoading, pathname, router]);

  const isEcoMode = profile?.reducedMotion === true;
  const isAdmin = profile?.role === 'admin';
  const isMaintenance = appStatus?.maintenanceMode === true && !isAdmin;

  if (isAuthLoading && !["/", "/login", "/autoriser"].includes(pathname)) {
    return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin opacity-20" /></div>;
  }

  const excludedNavPaths = ["/login", "/autoriser", "/arcade", "/quiz", "/penalties", "/jet-lumiere", "/mines", "/sport", "/dice", "/coinflip", "/double"];
  const excludedBottomNavPaths = ["/login", "/autoriser", "/transfert", "/echange", "/duels", "/arcade", "/quiz", "/penalties", "/jet-lumiere", "/mines", "/sport", "/dice", "/coinflip", "/double"];

  const showNav = user && pathname !== "/" && !excludedNavPaths.some(p => pathname.startsWith(p));
  const showBottomNav = user && pathname !== "/" && !excludedBottomNavPaths.some(p => pathname.startsWith(p));

  return (
    <div className={cn(isEcoMode && "reduced-motion")}>
      <MotionConfig reducedMotion={isEcoMode ? "always" : "no-preference"}>
        <ThemeSync />
        <ColorInjector />
        <SystemBarSync />
        <BiometricLock />
        <SuccessfulExchangeOverlay />
        <AdminPendingExchangeOverlay />
        <IncomingTransferOverlay />
        <DuelInvitationListener />
        <TextSelectionMenu />
        
        <AnimatePresence>
          {isMaintenance && (
            <MaintenanceOverlay message={appStatus?.maintenanceMessage} />
          )}
        </AnimatePresence>

        {showNav && <Header />}
        <PageTransition>{children}</PageTransition>
        {showBottomNav && <BottomNav />}
        <Analytics />
        <SpeedInsights />
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
