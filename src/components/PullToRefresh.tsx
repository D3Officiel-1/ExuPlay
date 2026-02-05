"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, useMotionValue, useTransform, useSpring, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { RefreshCw, Sparkles, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * @fileOverview Un système de Pull-to-Refresh cinématique personnalisé.
 * Utilise Framer Motion pour une physique de ressort et des animations éthérées.
 */

const PULL_THRESHOLD = 100;

export function PullToRefresh({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullProgress, setPullThresholdReached] = useState(false);
  
  const y = useMotionValue(0);
  
  // Physique de ressort pour un mouvement fluide et organique
  const springY = useSpring(y, { stiffness: 300, damping: 30 });
  
  // Transformations visuelles basées sur la distance de tirage
  const rotate = useTransform(y, [0, PULL_THRESHOLD], [0, 360]);
  const scale = useTransform(y, [0, PULL_THRESHOLD], [0.5, 1.2]);
  const opacity = useTransform(y, [0, PULL_THRESHOLD], [0, 1]);
  const blur = useTransform(y, [0, PULL_THRESHOLD], [10, 0]);

  const handleDrag = (_: any, info: any) => {
    if (isRefreshing) return;
    
    // On limite le tirage pour éviter qu'il descende trop bas
    const newY = Math.max(0, info.offset.y);
    y.set(newY > PULL_THRESHOLD * 1.5 ? PULL_THRESHOLD * 1.5 : newY);
    
    setPullThresholdReached(newY >= PULL_THRESHOLD);
  };

  const handleDragEnd = async (_: any, info: any) => {
    if (isRefreshing) return;

    if (info.offset.y >= PULL_THRESHOLD) {
      await triggerRefresh();
    } else {
      y.set(0);
    }
  };

  const triggerRefresh = useCallback(async () => {
    setIsRefreshing(true);
    y.set(PULL_THRESHOLD / 1.5); // On garde le Sceau visible pendant le refresh
    
    // Déclencher l'actualisation réelle des données Next.js
    router.refresh();
    
    // Simulation d'un temps de réponse pour l'animation cinématique
    await new Promise((resolve) => setTimeout(resolve, 1500));
    
    setIsRefreshing(false);
    y.set(0);
  }, [router, y]);

  return (
    <div className="relative min-h-screen w-full touch-none overflow-hidden">
      {/* L'Indicateur d'Éveil (Sceau) */}
      <div 
        className="pointer-events-none absolute left-0 right-0 top-0 z-[100] flex flex-col items-center justify-center pt-4"
        style={{ height: PULL_THRESHOLD }}
      >
        <AnimatePresence>
          {(pullProgress || isRefreshing || y.get() > 10) && (
            <motion.div
              style={{ 
                y: springY, 
                opacity, 
                scale,
                filter: `blur(${blur.get()}px)`
              }}
              className="relative"
            >
              {/* Orbe lumineux derrière l'icône */}
              <motion.div 
                animate={isRefreshing ? { 
                  scale: [1, 1.5, 1],
                  opacity: [0.3, 0.6, 0.3],
                } : { scale: 1, opacity: 0.2 }}
                transition={{ duration: 1, repeat: Infinity }}
                className={cn(
                  "absolute inset-0 m-auto h-16 w-16 rounded-full blur-2xl transition-colors duration-500",
                  pullProgress ? "bg-primary" : "bg-primary/40"
                )}
              />

              {/* Le Sceau */}
              <div className={cn(
                "relative flex h-14 w-14 items-center justify-center rounded-[1.5rem] bg-card/40 backdrop-blur-xl border transition-all duration-500 shadow-2xl",
                pullProgress ? "border-primary/40 shadow-primary/20 scale-110" : "border-primary/5 shadow-black/20"
              )}>
                <motion.div style={{ rotate: isRefreshing ? undefined : rotate }}>
                  <motion.div
                    animate={isRefreshing ? { rotate: 360 } : {}}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  >
                    <RefreshCw className={cn(
                      "h-6 w-6 transition-colors duration-500",
                      pullProgress ? "text-primary" : "text-primary/40"
                    )} />
                  </motion.div>
                </motion.div>

                {/* Étincelles lors du refresh */}
                {isRefreshing && (
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="absolute -top-1 -right-1"
                  >
                    <Zap className="h-4 w-4 text-primary fill-current" />
                  </motion.div>
                )}
              </div>

              {/* Texte d'état discret */}
              <motion.p 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-3 text-[8px] font-black uppercase tracking-[0.5em] text-primary/30 text-center"
              >
                {isRefreshing ? "Transmutation..." : pullProgress ? "Relâcher l'Esprit" : "Appel du Flux"}
              </motion.p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Conteneur de l'application avec drag */}
      <motion.div
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={0.6}
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
        style={{ y: springY }}
        className="relative z-10 min-h-screen bg-background"
      >
        {children}
      </motion.div>
    </div>
  );
}
