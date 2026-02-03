
"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Download, Share, PlusSquare, X, Smartphone } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export function InstallPwa() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIos, setIsIos] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Vérifier si déjà installé
    const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches 
      || (navigator as any).standalone 
      || document.referrer.includes('android-app://');
    
    setIsStandalone(isStandaloneMode);

    // Détection iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIos(isIosDevice);

    // Capturer l'événement d'installation (Android/Chrome/Edge)
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      
      // On affiche si on n'est pas en mode autonome (toujours afficher si pas installé)
      if (!isStandaloneMode && !isIosDevice) {
        setIsVisible(true);
      }
    };

    window.addEventListener("beforeinstallprompt", handler);

    // Pour iOS, on affiche les instructions manuellement si pas en mode autonome
    if (isIosDevice && !isStandaloneMode) {
      setIsVisible(true);
    }

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, [isStandalone]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      handleDismiss();
      return;
    }
    
    // Déclencher l'invite d'installation du navigateur
    await deferredPrompt.prompt();
    
    // Attendre la réponse de l'utilisateur
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === "accepted") {
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
          <Card className="border-none shadow-[0_32px_128px_-16px_rgba(0,0,0,0.3)] bg-card/90 backdrop-blur-3xl rounded-[2.5rem] overflow-hidden">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleDismiss}
              className="absolute top-4 right-4 rounded-full h-8 w-8 hover:bg-primary/5"
            >
              <X className="h-4 w-4 opacity-40" />
            </Button>
            
            <CardHeader className="pt-10 text-center space-y-2">
              <div className="mx-auto w-16 h-16 bg-primary/5 rounded-3xl flex items-center justify-center mb-2">
                <Smartphone className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-2xl font-black tracking-tight">Expérience Native</CardTitle>
              <CardDescription className="px-6 font-medium">
                Installez l'application sur votre écran d'accueil pour un accès instantané et sécurisé.
              </CardDescription>
            </CardHeader>

            <CardContent className="p-8 space-y-6">
              {isIos ? (
                <div className="space-y-4">
                  <div className="flex flex-col gap-4 p-5 bg-primary/5 rounded-3xl border border-primary/10">
                    <p className="text-sm font-bold flex items-center gap-3">
                      <span className="flex h-6 w-6 items-center justify-center bg-primary text-background rounded-full text-[10px]">1</span>
                      Appuyez sur le bouton <Share className="h-4 w-4 inline text-primary" /> de votre navigateur
                    </p>
                    <p className="text-sm font-bold flex items-center gap-3">
                      <span className="flex h-6 w-6 items-center justify-center bg-primary text-background rounded-full text-[10px]">2</span>
                      Choisissez <PlusSquare className="h-4 w-4 inline text-primary" /> "Sur l'écran d'accueil"
                    </p>
                  </div>
                  <Button onClick={handleDismiss} className="w-full h-14 rounded-2xl font-black text-xs uppercase tracking-widest">
                    J'ai compris
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <Button 
                    onClick={handleInstallClick} 
                    className="w-full h-16 rounded-2xl font-black text-lg gap-3 shadow-xl shadow-primary/20"
                  >
                    <Download className="h-6 w-6" />
                    Installer Exu Play
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
