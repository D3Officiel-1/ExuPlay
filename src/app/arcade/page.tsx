
"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Script from "next/script";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Maximize, Loader2, Zap, ShieldAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { haptic } from "@/lib/haptics";
import { motion, AnimatePresence } from "framer-motion";

/**
 * @fileOverview Le Circuit de l'Éveil v3.0.
 * Intégration fidèle de l'interface Arcade Car Racing (Unity WebGL)
 * basée sur la structure HTML/JS originelle.
 */

declare global {
  interface Window {
    createUnityInstance: any;
  }
}

export default function ArcadePage() {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loading, setLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [progress, setProgress] = useState(0);

  const toggleFullScreen = useCallback(() => {
    haptic.medium();
    const isInFullScreen = (document.fullscreenElement && document.fullscreenElement !== null) || 
                          ((document as any).webkitFullscreenElement && (document as any).webkitFullscreenElement !== null) || 
                          ((document as any).msFullscreenElement && (document as any).msFullscreenElement !== null);

    const element = document.querySelector(".webgl-content") as any;
    if (!element) return;

    if (!isInFullScreen) {
      if (element.webkitRequestFullscreen) {
        element.webkitRequestFullscreen();
      } else if (element.msRequestFullscreen) { 
        element.msRequestFullscreen();
      } else if (element.requestFullscreen) {
        element.requestFullscreen();
      } 
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if ((document as any).webkitExitFullscreen) {
        (document as any).webkitExitFullscreen();
      } else if ((document as any).msExitFullscreen) {
        (document as any).msExitFullscreen();
      }
    }
  }, []);

  const handleUnityLoad = useCallback(() => {
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

    const container = document.querySelector("#gameContainer");
    const canvas = canvasRef.current;

    if (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent) && container) {
      container.className = "unity-mobile";
      (config as any).devicePixelRatio = 1;
    }

    if (window.createUnityInstance && canvas) {
      window.createUnityInstance(canvas, config, (p: number) => {
        setProgress(p);
      }).then(() => {
        setLoading(false);
        haptic.success();
      }).catch((err: any) => {
        console.error(err);
        setIsError(true);
      });
    }
  }, []);

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

      {/* Conteneur WebGL Fidèle à l'index.html */}
      <div className="keepRatio flex-1 flex items-center justify-center bg-zinc-950">
        <div id="gameContainer" className="unity-desktop webgl-content relative w-full h-full">
          <canvas 
            ref={canvasRef} 
            id="gameCanvas" 
            className="w-full h-full block touch-none"
          />

          {/* Bloc de Chargement Originel */}
          <AnimatePresence>
            {loading && (
              <motion.div 
                id="loadingBlock"
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
                    <div id="progressBar" className="space-y-4">
                      <div className="text-[10px] font-black uppercase tracking-[0.4em] text-white opacity-40">Initialisation du Flux</div>
                      <div className="centered relative h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                        <div id="emptyBar" className="absolute inset-0 bg-white/5" style={{ width: `${(1 - progress) * 100}%`, right: 0, left: 'auto' }} />
                        <div id="fullBar" className="absolute inset-0 bg-primary shadow-[0_0_15px_rgba(var(--primary-rgb),0.5)]" style={{ width: `${progress * 100}%` }} />
                      </div>
                      <p className="text-[9px] font-bold opacity-30 uppercase tracking-widest tabular-nums text-white">
                        {Math.round(progress * 100)}% - Synchronisation WASM
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Bloc d'erreur et compatibilité */}
          {isError && (
            <div id="errorBrowserBlock" className="absolute inset-0 z-[100] bg-black/90 backdrop-blur-xl flex flex-col items-center justify-center p-8 text-center">
              <ShieldAlert className="h-16 w-16 text-destructive mb-6" />
              <h2 className="text-xl font-black text-white uppercase mb-2">Dissonance Système</h2>
              <p className="text-sm opacity-60 text-white/60 mb-8 max-w-xs">Le moteur de course n'a pas pu s'ancrer dans votre navigateur.</p>
              <Button onClick={() => window.location.reload()} className="rounded-2xl h-14 px-8 font-black uppercase tracking-widest">Réessayer</Button>
            </div>
          )}
        </div>
      </div>

      <style jsx global>{`
        .keepRatio { position: relative; width: 100%; height: 100%; }
        #gameCanvas { outline: none; }
        .webgl-content { width: 100%; height: 100%; }
        .unity-mobile #gameCanvas { width: 100%; height: 100%; }
      `}</style>
    </div>
  );
}
