
"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Download, Share, PlusSquare, X, Smartphone, Sparkles } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

// Variable globale pour capturer l'événement même avant le montage du composant
let globalDeferredPrompt: BeforeInstallPromptEvent | null = null;

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    globalDeferredPrompt = e as BeforeInstallPromptEvent;
    // Déclencher un événement personnalisé pour notifier les composants déjà montés
    window.dispatchEvent(new CustomEvent("pwa-prompt-available"));
  });
}

export function InstallPwa() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(globalDeferredPrompt);
  const [isIos, setIsIos] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Vérifier si déjà installé ou en mode autonome
    const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches 
      || (navigator as any).standalone 
      || document.referrer.includes('android-app://');
    
    setIsStandalone(isStandaloneMode);

    // Détection iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIos(isIosDevice);

    const checkVisibility = () => {
      if (isStandaloneMode) return;

      if (isIosDevice) {
        // Sur iOS, on affiche toujours les instructions si pas standalone
        setIsVisible(true);
      } else if (globalDeferredPrompt) {
        // Sur Android/Desktop, on affiche si l'événement a été capturé
        setDeferredPrompt(globalDeferredPrompt);
        setIsVisible(true);
      }
    };

    // Écouter l'événement personnalisé si l'événement natif arrive après le montage
    const handlePromptAvailable = () => {
      setDeferredPrompt(globalDeferredPrompt);
      if (!isStandaloneMode) setIsVisible(true);
    };

    window.addEventListener("pwa-prompt-available", handlePromptAvailable);
    
    // Petite tempo pour laisser le temps au navigateur de décider s'il propose l'install
    const timer = setTimeout(checkVisibility, 2000);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("pwa-prompt-available", handlePromptAvailable);
    };
  }, [isStandalone]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      return;
    }
    
    // Déclencher l'invite d'installation du navigateur
    await deferredPrompt.prompt();
    
    // Attendre la réponse de l'utilisateur
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === "accepted") {
      globalDeferredPrompt = null;
      setDeferredPrompt(null);
      setIsVisible(false);
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
  };

  if (isStandalone || !isVisible) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[300] flex items-end justify-center p-4 sm:items-center pointer-events-none">
        <motion.div
          initial={{ y: 100, opacity: 0, scale: 0.9 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 100, opacity: 0, scale: 0.9 }}
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
          className="w-full max-w-md pointer-events-auto"
        >
          <Card className="border-none shadow-[0_32px_128px_-16px_rgba(0,0,0,0.3)] bg-card/90 backdrop-blur-3xl rounded-[2.5rem] overflow-hidden border border-primary/5">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleDismiss}
              className="absolute top-4 right-4 rounded-full h-8 w-8 hover:bg-primary/5"
            >
              <X className="h-4 w-4 opacity-40" />
            </Button>
            
            <CardHeader className="pt-10 text-center space-y-2">
              <div className="mx-auto w-16 h-16 bg-primary/5 rounded-3xl flex items-center justify-center mb-2 relative">
                <Smartphone className="h-8 w-8 text-primary" />
                <motion.div 
                  animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="absolute -top-1 -right-1"
                >
                  <Sparkles className="h-4 w-4 text-primary" />
                </motion.div>
              </div>
              <CardTitle className="text-2xl font-black tracking-tight">Expérience Native</CardTitle>
              <CardDescription className="px-6 font-medium text-xs opacity-60">
                Installez le Sanctuaire sur votre écran d'accueil pour un éveil instantané.
              </CardDescription>
            </CardHeader>

            <CardContent className="p-8 space-y-6">
              {isIos ? (
                <div className="space-y-4">
                  <div className="flex flex-col gap-4 p-5 bg-primary/5 rounded-3xl border border-primary/10">
                    <p className="text-xs font-bold flex items-center gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center bg-primary text-background rounded-full text-[10px]">1</span>
                      Appuyez sur le bouton <Share className="h-4 w-4 inline text-primary" /> de Safari
                    </p>
                    <p className="text-xs font-bold flex items-center gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center bg-primary text-background rounded-full text-[10px]">2</span>
                      Choisissez <PlusSquare className="h-4 w-4 inline text-primary" /> "Sur l'écran d'accueil"
                    </p>
                  </div>
                  <Button onClick={handleDismiss} className="w-full h-14 rounded-2xl font-black text-[10px] uppercase tracking-widest bg-primary/5 border border-primary/10 text-primary hover:bg-primary/10">
                    J'ai compris
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <Button 
                    onClick={handleInstallClick} 
                    disabled={!deferredPrompt}
                    className="w-full h-16 rounded-2xl font-black text-sm uppercase tracking-widest gap-3 shadow-xl shadow-primary/20"
                  >
                    <Download className="h-5 w-5" />
                    Installer l'App
                  </Button>
                  {!deferredPrompt && (
                    <p className="text-[9px] text-center font-bold opacity-30 uppercase tracking-tighter">
                      Prêt pour l'harmonisation système...
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
