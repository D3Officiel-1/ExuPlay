
"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, useMotionValue, useTransform, useSpring, AnimatePresence } from "framer-motion";
import { Loader2, Sparkles, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * @fileOverview Un composant de Pull-to-Refresh ultra-stylisé.
 * Utilise Framer Motion pour des interactions physiques réactives et cinématiques.
 */

const PULL_THRESHOLD = 120; // Distance nécessaire pour déclencher
const MAX_PULL = 180; // Distance maximale de tirage visuel

export function PullToRefresh({ children }: { children: React.ReactNode }) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [startY, setStartY] = useState(0);
  const [isPulling, setIsPulling] = useState(false);

  // Motion values pour l'animation fluide
  const y = useMotionValue(0);
  const springY = useSpring(y, { stiffness: 300, damping: 30 });
  
  // Transformations basées sur la distance
  const scale = useTransform(y, [0, PULL_THRESHOLD], [0.5, 1.2]);
  const opacity = useTransform(y, [0, 40, PULL_THRESHOLD], [0, 0.4, 1]);
  const rotate = useTransform(y, [0, PULL_THRESHOLD], [0, 360]);
  const blur = useTransform(y, [0, PULL_THRESHOLD], [10, 0]);

  const handleTouchStart = (e: TouchEvent) => {
    if (window.scrollY <= 0) {
      setStartY(e.touches[0].clientY);
      setIsPulling(true);
    }
  };

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isPulling || isRefreshing) return;

    const currentY = e.touches[0].clientY;
    const diff = currentY - startY;

    if (diff > 0 && window.scrollY <= 0) {
      // Appliquer une résistance logarithmique
      const easedDiff = Math.min(MAX_PULL, diff * 0.5);
      setPullDistance(easedDiff);
      y.set(easedDiff);
      
      // Empêcher le défilement natif si on tire vers le bas à l'origine
      if (e.cancelable) e.preventDefault();
    } else {
      setIsPulling(false);
      y.set(0);
    }
  }, [isPulling, isRefreshing, startY, y]);

  const handleTouchEnd = useCallback(() => {
    if (!isPulling) return;

    if (pullDistance >= PULL_THRESHOLD) {
      triggerRefresh();
    } else {
      resetPull();
    }
    setIsPulling(false);
  }, [isPulling, pullDistance]);

  const triggerRefresh = () => {
    setIsRefreshing(true);
    y.set(80); // Position de maintien pendant le chargement
    
    // Feedback haptique si supporté
    if ("vibrate" in navigator) {
      navigator.vibrate(20);
    }

    // Simuler une synchronisation réseau
    setTimeout(() => {
      // Optionnel : Recharger réellement ou juste simuler une mise à jour
      // window.location.reload(); 
      setIsRefreshing(false);
      resetPull();
    }, 2000);
  };

  const resetPull = () => {
    y.set(0);
    setPullDistance(0);
  };

  useEffect(() => {
    window.addEventListener("touchstart", handleTouchStart, { passive: false });
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("touchend", handleTouchEnd);

    return () => {
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [handleTouchMove, handleTouchEnd]);

  return (
    <div className="relative min-h-screen">
      {/* Indicateur de Refresh Cinématique */}
      <div className="absolute top-0 left-0 right-0 flex justify-center pointer-events-none z-[100] overflow-hidden h-[MAX_PULL]px">
        <motion.div
          style={{ 
            y: springY, 
            opacity, 
            scale,
            filter: isRefreshing ? "none" : blur
          }}
          className="mt-6 relative"
        >
          <div className="relative h-16 w-16 flex items-center justify-center">
            {/* Orbe de fond */}
            <motion.div 
              animate={isRefreshing ? {
                scale: [1, 1.5, 1],
                opacity: [0.2, 0.5, 0.2]
              } : {}}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="absolute inset-0 bg-primary/10 rounded-full blur-xl"
            />

            {/* Sceau tournant */}
            <motion.div
              style={{ rotate: isRefreshing ? undefined : rotate }}
              animate={isRefreshing ? { rotate: 360 } : {}}
              transition={isRefreshing ? { duration: 1, repeat: Infinity, ease: "linear" } : { type: "spring" }}
              className="relative z-10"
            >
              <div className="h-12 w-12 rounded-2xl bg-card/40 backdrop-blur-xl border border-primary/10 shadow-2xl flex items-center justify-center">
                {isRefreshing ? (
                  <Zap className="h-6 w-6 text-primary animate-pulse fill-current" />
                ) : (
                  <Sparkles className="h-6 w-6 text-primary opacity-40" />
                )}
              </div>
            </motion.div>

            {/* Particules d'éveil au seuil */}
            <AnimatePresence>
              {pullDistance >= PULL_THRESHOLD && !isRefreshing && (
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 2, opacity: 0 }}
                  className="absolute inset-0 border-2 border-primary/20 rounded-full"
                />
              )}
            </AnimatePresence>
          </div>

          <motion.p 
            style={{ opacity: isRefreshing ? 1 : opacity }}
            className="text-[8px] font-black uppercase tracking-[0.5em] text-center mt-4 opacity-40"
          >
            {isRefreshing ? "Synchronisation" : pullDistance >= PULL_THRESHOLD ? "Libérer l'éveil" : "Tirer pour l'éveil"}
          </motion.p>
        </motion.div>
      </div>

      {/* Contenu principal qui se décale au tirage */}
      <motion.div
        style={{ y: springY }}
        className="relative z-10 bg-background"
      >
        {children}
      </motion.div>
    </div>
  );
}
