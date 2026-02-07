"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useUser, useFirestore, useDoc } from "@/firebase";
import { doc, updateDoc, increment, serverTimestamp } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChevronLeft, Zap, Loader2, Sparkles, User, Trophy } from "lucide-react";
import { haptic } from "@/lib/haptics";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import confetti from "canvas-confetti";

const BET_AMOUNTS = [50, 100, 200];
const DIRECTIONS = [
  "En haut à gauche", "En haut", "En haut à droite",
  "À gauche", "Centre", "À droite",
  "En bas à gauche", "En bas", "En bas à droite"
] as const;

type Direction = typeof DIRECTIONS[number];

export default function PenaltiesPage() {
  const { user } = useUser();
  const db = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const [selectedBet, setSelectedBet] = useState<number>(50);
  const [gameState, setGameState] = useState<'idle' | 'shooting' | 'result'>('idle');
  const [playerChoice, setPlayerChoice] = useState<Direction | null>(null);
  const [keeperChoice, setKeeperChoice] = useState<Direction | null>(null);
  const [isScored, setIsScored] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);

  const userDocRef = useMemo(() => (db && user?.uid ? doc(db, "users", user.uid) : null), [db, user?.uid]);
  const { data: profile } = useDoc(userDocRef);

  const handleShoot = async (direction: Direction) => {
    if (!profile || !userDocRef || gameState !== 'idle') return;
    
    if ((profile.totalPoints || 0) < selectedBet) {
      haptic.error();
      toast({
        variant: "destructive",
        title: "Lumière insuffisante",
        description: `Il vous manque ${selectedBet - (profile.totalPoints || 0)} PTS.`
      });
      return;
    }

    setLoading(true);
    setPlayerChoice(direction);
    haptic.medium();

    // L'Oracle décide de sa direction instantanément
    const keeperDir = DIRECTIONS[Math.floor(Math.random() * DIRECTIONS.length)];
    const scored = direction !== keeperDir;
    
    setKeeperChoice(keeperDir);
    setIsScored(scored);
    setGameState('shooting');

    try {
      // Déduction de la mise
      await updateDoc(userDocRef, {
        totalPoints: increment(-selectedBet),
        updatedAt: serverTimestamp()
      });

      // L'animation dure 800ms
      setTimeout(async () => {
        setGameState('result');
        if (scored) {
          haptic.success();
          confetti({
            particleCount: 150,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#000000', '#ffffff', '#FFD700']
          });
          await updateDoc(userDocRef, {
            totalPoints: increment(selectedBet * 2),
            updatedAt: serverTimestamp()
          });
        } else {
          haptic.error();
        }
        setLoading(false);
      }, 800);
    } catch (e) {
      setLoading(false);
      setGameState('idle');
    }
  };

  const resetGame = () => {
    haptic.light();
    setGameState('idle');
    setPlayerChoice(null);
    setKeeperChoice(null);
    setIsScored(null);
  };

  const ballVariants = {
    idle: { y: 0, x: 0, scale: 1, filter: "blur(0px)", rotate: 0 },
    shooting: (direction: Direction) => {
      const xMap: Record<Direction, number> = { 
        "En haut à gauche": -120, "En haut": 0, "En haut à droite": 120,
        "À gauche": -120, "Centre": 0, "À droite": 120,
        "En bas à gauche": -120, "En bas": 0, "En bas à droite": 120
      };
      const yMap: Record<Direction, number> = {
        "En haut à gauche": -380, "En haut": -380, "En haut à droite": -380,
        "À gauche": -320, "Centre": -320, "À droite": -320,
        "En bas à gauche": -260, "En bas": -260, "En bas à droite": -260
      };
      return {
        y: yMap[direction],
        x: xMap[direction],
        scale: 0.35,
        rotate: 1080,
        filter: "blur(2px)",
        transition: { duration: 0.8, ease: [0.4, 0, 0.2, 1] }
      };
    }
  };

  const keeperVariants = {
    idle: { x: "-50%", y: 0, rotate: 0, scale: 1 },
    shooting: (direction: Direction | null) => {
      if (!direction) return {};
      const xMap: Record<Direction, number> = {
        "En haut à gauche": -100, "En haut": 0, "En haut à droite": 100,
        "À gauche": -100, "Centre": 0, "À droite": 100,
        "En bas à gauche": -100, "En bas": 0, "En bas à droite": 100
      };
      const yMap: Record<Direction, number> = {
        "En haut à gauche": -40, "En haut": -40, "En haut à droite": -40,
        "À gauche": 15, "Centre": 0, "À droite": 15,
        "En bas à gauche": 40, "En bas": 40, "En bas à droite": 40
      };
      const rotateMap: Record<Direction, number> = {
        "En haut à gauche": -45, "En haut": 0, "En haut à droite": 45,
        "À gauche": -45, "Centre": 0, "À droite": 45,
        "En bas à gauche": -45, "En bas": 0, "En bas à droite": 45
      };
      return {
        x: `calc(-50% + ${xMap[direction]}px)`,
        y: yMap[direction],
        rotate: rotateMap[direction],
        transition: { duration: 0.6, type: "spring", stiffness: 120, damping: 12 }
      };
    }
  };

  const getTargetPosition = (dir: Direction) => {
    switch (dir) {
      case "En haut à gauche": return "top-0 left-0";
      case "En haut": return "top-0 left-1/3 w-[33.33%]";
      case "En haut à droite": return "top-0 right-0";
      case "À gauche": return "top-1/3 left-0 h-[33.33%]";
      case "Centre": return "top-1/3 left-1/3 w-[33.33%] h-[33.33%]";
      case "À droite": return "top-1/3 right-0 h-[33.33%]";
      case "En bas à gauche": return "bottom-0 left-0";
      case "En bas": return "bottom-0 left-1/3 w-[33.33%]";
      case "En bas à droite": return "bottom-0 right-0";
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col pb-32">
      <main className="flex-1 p-6 pt-24 space-y-8 max-w-lg mx-auto w-full overflow-hidden">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full h-10 w-10 hover:bg-primary/5">
            <ChevronLeft className="h-6 w-6" />
          </Button>
          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40">Intuition</p>
            <h1 className="text-3xl font-black tracking-tight italic">L'Arène Sacrée</h1>
          </div>
        </div>

        <div className="space-y-8">
          {gameState === 'idle' && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex justify-center gap-3">
              {BET_AMOUNTS.map((amt) => (
                <button 
                  key={amt} 
                  onClick={() => { haptic.light(); setSelectedBet(amt); }} 
                  className={cn(
                    "px-6 py-3 rounded-2xl font-black text-sm transition-all border", 
                    selectedBet === amt 
                      ? "bg-primary text-primary-foreground border-primary shadow-xl scale-105" 
                      : "bg-primary/5 border-transparent opacity-40"
                  )}
                >
                  {amt}
                </button>
              ))}
            </motion.div>
          )}

          <div className="relative w-full aspect-[4/5] rounded-[3.5rem] bg-gradient-to-b from-primary/5 to-background border border-primary/5 shadow-2xl overflow-hidden perspective-[1200px]">
            {/* Terrain & Perspective */}
            <div className="absolute inset-0 z-0">
              <div className="absolute top-[25%] left-0 right-0 h-[1px] bg-primary/10" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_100%,rgba(var(--primary-rgb),0.05),transparent_70%)]" />
              {/* Lignes de fuite */}
              <div className="absolute top-[25%] left-1/2 -translate-x-1/2 w-full h-full opacity-5 pointer-events-none" 
                   style={{ background: 'repeating-linear-gradient(90deg, transparent, transparent 40px, hsl(var(--primary)) 41px)' }} />
            </div>

            {/* La Cage de But - Devient prioritaire (z-[60]) pendant la visée */}
            <div className={cn(
              "absolute top-[15%] left-1/2 -translate-x-1/2 w-72 h-40 border-x-4 border-t-4 border-primary/20 rounded-t-xl transition-all duration-300",
              gameState === 'idle' ? "z-[60]" : "z-10"
            )}>
              <div className="absolute inset-0 bg-primary/[0.02] backdrop-blur-[1px]" />
              <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(hsl(var(--primary)) 1px, transparent 1px)', backgroundSize: '12px 12px' }} />
              
              {/* Zones de tir invisibles */}
              {gameState === 'idle' && DIRECTIONS.map((dir) => (
                <button
                  key={dir}
                  onClick={() => handleShoot(dir)}
                  disabled={loading}
                  className={cn(
                    "absolute z-50 opacity-0 hover:opacity-5 transition-opacity bg-primary rounded-lg",
                    getTargetPosition(dir),
                    dir.includes("Haut") || dir.includes("Bas") ? "h-1/3" : "w-1/3 h-1/3"
                  )}
                />
              ))}
            </div>

            {/* Le Gardien - Placé derrière les zones de visée lors du tir */}
            <motion.div 
              variants={keeperVariants} 
              animate={gameState === 'shooting' || gameState === 'result' ? "shooting" : "idle"} 
              custom={keeperChoice}
              className="absolute top-[22%] left-1/2 z-20 origin-bottom"
            >
              <div className={cn(
                "h-20 w-20 bg-card rounded-[2.5rem] flex items-center justify-center border-4 shadow-2xl transition-all duration-500",
                gameState === 'result' && !isScored ? "border-red-500 bg-red-500/10 scale-110" : "border-primary/10"
              )}>
                <User className={cn("h-12 w-12", gameState === 'result' && !isScored ? "text-red-500" : "opacity-40")} />
              </div>
            </motion.div>

            {/* Le Point de Penalty & Le Ballon */}
            <div className="absolute bottom-[15%] left-1/2 -translate-x-1/2 z-30">
              <div className="w-6 h-6 bg-primary/10 rounded-full blur-[2px] mb-[-12px] mx-auto" />
              <motion.div 
                variants={ballVariants} 
                animate={gameState === 'shooting' || gameState === 'result' ? "shooting" : "idle"} 
                custom={playerChoice}
                className="relative"
              >
                <div className="text-6xl drop-shadow-[0_10px_20px_rgba(0,0,0,0.3)] filter brightness-110 select-none">⚽</div>
                {gameState === 'idle' && (
                  <motion.div 
                    animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.5, 0.2] }} 
                    transition={{ duration: 2, repeat: Infinity }}
                    className="absolute inset-0 bg-primary/20 rounded-full blur-xl -z-10" 
                  />
                )}
              </motion.div>
            </div>

            {/* Feedback Visuel de Résultat */}
            <AnimatePresence>
              {gameState === 'result' && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.5, filter: "blur(20px)" }} 
                  animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }} 
                  className="absolute inset-0 flex flex-col items-center justify-center z-[100] pointer-events-none bg-background/20 backdrop-blur-sm"
                >
                  <motion.h2 
                    initial={{ y: 20 }} 
                    animate={{ y: 0 }} 
                    className={cn(
                      "text-8xl font-black uppercase italic tracking-tighter drop-shadow-2xl", 
                      isScored ? "text-green-500" : "text-destructive"
                    )}
                  >
                    {isScored ? "BUT !" : "ARRÊT !"}
                  </motion.h2>
                  <p className="text-2xl font-black mt-6 px-8 py-3 rounded-full bg-card border border-primary/10 shadow-2xl">
                    {isScored ? `+${selectedBet * 2} PTS` : `-${selectedBet} PTS`}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <AnimatePresence mode="wait">
            {gameState === 'result' ? (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <Button 
                  onClick={resetGame} 
                  className="w-full h-20 rounded-[2.5rem] font-black text-xs uppercase tracking-[0.3em] shadow-2xl shadow-primary/20"
                >
                  Nouvelle Frappe
                </Button>
              </motion.div>
            ) : (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-6 bg-primary/5 rounded-[2.5rem] border border-primary/5 flex items-start gap-4">
                <Sparkles className="h-5 w-5 text-primary opacity-40 shrink-0 mt-1" />
                <p className="text-[11px] leading-relaxed font-medium opacity-40 italic">
                  "Visez les recoins de la cage sacrée pour tromper l'Oracle. Le tir se déclenche au toucher."
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
