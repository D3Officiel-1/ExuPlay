
"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Activity, ChevronRight } from "lucide-react";
import { haptic } from "@/lib/haptics";

interface FloatingCouponButtonProps {
  selectionsCount: number;
  totalOdds: number;
  isCouponOpen: boolean;
  onOpen: () => void;
}

/**
 * @fileOverview Oracle du Bouton Flottant.
 * Un artefact cinématique qui lévite au-dessus du contenu pour offrir un accès constant au coupon.
 */
export function FloatingCouponButton({ 
  selectionsCount, 
  totalOdds, 
  isCouponOpen, 
  onOpen 
}: FloatingCouponButtonProps) {
  const isVisible = selectionsCount > 0 && !isCouponOpen;

  return (
    <AnimatePresence>
      {isVisible && (
        <div className="fixed top-24 left-0 right-0 z-[500] px-6 pointer-events-none flex justify-center">
          <motion.div 
            initial={{ y: -100, opacity: 0, scale: 0.8 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -100, opacity: 0, scale: 0.8 }}
            className="w-full max-w-sm pointer-events-auto"
          >
            <button 
              onClick={() => { haptic.medium(); onOpen(); }}
              className="w-full flex items-center justify-between px-8 h-16 bg-primary text-primary-foreground rounded-full shadow-2xl border border-white/10 active:scale-95 transition-all overflow-hidden"
            >
              <div className="flex flex-col items-start leading-none">
                <div className="flex items-center gap-2">
                  <Activity className="h-2.5 w-2.5 text-green-500 animate-pulse" />
                  <span className="text-[9px] font-black uppercase tracking-[0.2em] opacity-40">Pacte Cumulé</span>
                </div>
                <span className="text-sm font-black">{selectionsCount} Sélection{selectionsCount > 1 ? 's' : ''}</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm font-black italic tabular-nums">Σ {totalOdds.toFixed(2)}</span>
                <ChevronRight className="h-5 w-5 opacity-60" />
              </div>
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
