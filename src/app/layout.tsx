
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
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

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

  useEffect(() => {
    if (isAuthLoading) return;
    const publicPaths = ["/", "/login", "/autoriser"];
    if (!user && !publicPaths.includes(pathname)) {
      router.push("/login");
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

  const isEcoMode = profile?.reducedMotion === true;

  if (isAuthLoading && !["/", "/login", "/autoriser"].includes(pathname)) {
    return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin opacity-20" /></div>;
  }

  const excludedNavPaths = ["/login", "/autoriser", "/arcade", "/quiz", "/penalties", "/jet-lumiere", "/mines", "/sport"];
  const excludedBottomNavPaths = ["/login", "/autoriser", "/transfert", "/echange", "/duels", "/arcade", "/quiz", "/penalties", "/jet-lumiere", "/mines", "/sport"];

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
        {isMobile && <CustomKeyboard />}
        <TextSelectionMenu />
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
