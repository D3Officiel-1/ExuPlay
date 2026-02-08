
"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Maximize, Loader2, Zap } from "lucide-react";
import { useRouter } from "next/navigation";
import { haptic } from "@/lib/haptics";
import { motion, AnimatePresence } from "framer-motion";

/**
 * @fileOverview Le Circuit de l'Éveil.
 * Intégration cinématique du moteur Arcade Car Racing (Unity WebGL).
 */

declare global {
  interface Window {
    createUnityInstance: any;
  }
}

export default function ArcadePage() {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isError, setIsRejected] = useState(false);

  const toggleFullScreen = () => {
    haptic.medium();
    const element = document.querySelector(".webgl-content");
    if (!element) return;

    if (!document.fullscreenElement) {
      if (element.requestFullscreen) element.requestFullscreen();
    } else {
      if (document.exitFullscreen) document.exitFullscreen();
    }
  };

  useEffect(() => {
    // Nettoyage lors de la sortie
    return () => {
      const unityInstances = document.querySelectorAll('canvas');
      unityInstances.forEach(c => {
        // En Unity WebGL, il est parfois nécessaire de rafraîchir pour libérer la mémoire WASM
      });
    };
  }, []);

  const handleUnityLoad = () => {
    const buildUrl = "/Build";
    const config = {
      dataUrl: buildUrl + "/Arcade_Car_Racing.data",
      frameworkUrl: buildUrl + "/Arcade_Car_Racing.framework.js",
      codeUrl: buildUrl + "/Arcade_Car_Racing.wasm",
      streamingAssetsUrl: "StreamingAssets",
      companyName: "Gamebol",
      productName: "Arcade Car Racing",
      productVersion: "1.0",
    };

    if (window.createUnityInstance && canvasRef.current) {
      window.createUnityInstance(canvasRef.current, config, (p: number) => {
        setProgress(p * 100);
      }).then(() => {
        setLoading(false);
        haptic.success();
      }).catch((err: any) => {
        console.error(err);
        setIsRejected(true);
      });
    }
  };

  return (
    <div className="min-h-screen bg-black flex flex-col relative overflow-hidden">
      <Script 
        src="/Build/Arcade_Car_Racing.loader.js" 
        onLoad={handleUnityLoad}
      />

      {/* Interface de Contrôle Supérieure */}
      <div className="absolute top-6 left-6 right-6 z-50 flex items-center justify-between pointer-events-none">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => { haptic.light(); router.back(); }}
          className="h-12 w-12 rounded-full bg-black/40 backdrop-blur-xl border border-white/10 pointer-events-auto text-white hover:bg-black/60"
        >
          <ChevronLeft className="h-6 w-6" />
        </Button>

        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={toggleFullScreen}
            className="h-12 w-12 rounded-full bg-black/40 backdrop-blur-xl border border-white/10 pointer-events-auto text-white"
          >
            <Maximize className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Conteneur WebGL Pur */}
      <div className="keepRatio flex-1 flex items-center justify-center bg-zinc-950">
        <div id="gameContainer" className="unity-desktop webgl-content relative w-full h-full">
          <canvas 
            ref={canvasRef} 
            id="gameCanvas" 
            className="w-full h-full block touch-none"
          />

          {/* Écran de Chargement Harmonisé */}
          <AnimatePresence>
            {loading && (
              <motion.div 
                exit={{ opacity: 0, scale: 1.1, filter: "blur(20px)" }}
                transition={{ duration: 1, ease: "easeOut" }}
                className="absolute inset-0 z-40 bg-black flex flex-col items-center justify-center text-center p-8"
              >
                <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-20">
                  <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] rounded-full bg-primary/20 blur-[120px]" />
                </div>

                <div className="space-y-12 max-w-sm w-full z-10">
                  <div className="relative mx-auto w-24 h-24">
                    <motion.div 
                      animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.5, 0.2] }}
                      transition={{ duration: 3, repeat: Infinity }}
                      className="absolute inset-0 bg-primary/20 rounded-[2.5rem] blur-2xl"
                    />
                    <div className="relative h-full w-full bg-zinc-900 border border-white/5 rounded-[2.5rem] flex items-center justify-center shadow-2xl">
                      <Zap className="h-10 w-10 text-primary animate-pulse" />
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="space-y-2">
                      <h2 className="text-2xl font-black tracking-tight uppercase italic text-white">Circuit de l'Éveil</h2>
                      <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40">Initialisation du Flux</p>
                    </div>

                    <div className="space-y-3">
                      <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${progress}%` }}
                          className="h-full bg-primary shadow-[0_0_15px_rgba(var(--primary-rgb),0.5)]"
                        />
                      </div>
                      <p className="text-[9px] font-bold opacity-30 uppercase tracking-widest tabular-nums">
                        {Math.round(progress)}% - Synchronisation WASM
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Bloc d'erreur */}
          {isError && (
            <div className="absolute inset-0 z-[100] bg-black/90 backdrop-blur-xl flex flex-col items-center justify-center p-8 text-center">
              <ShieldAlert className="h-16 w-16 text-destructive mb-6" />
              <h2 className="text-xl font-black text-white uppercase mb-2">Dissonance Système</h2>
              <p className="text-sm opacity-60 text-white/60 mb-8 max-w-xs">Le moteur de course n'a pas pu s'ancrer dans votre navigateur. Vérifiez votre support WebGL.</p>
              <Button onClick={() => window.location.reload()} className="rounded-2xl h-14 px-8 font-black uppercase tracking-widest">Réessayer</Button>
            </div>
          )}
        </div>
      </div>

      <style jsx global>{`
        .keepRatio { position: relative; }
        #gameCanvas { outline: none; }
        .webgl-content { width: 100%; height: 100%; }
      `}</style>
    </div>
  );
}
