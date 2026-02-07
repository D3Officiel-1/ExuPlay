"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useUser, useFirestore, useDoc } from "@/firebase";
import { doc, updateDoc, increment, serverTimestamp } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChevronLeft, Zap, Loader2, Sparkles, User, Trophy, Shield } from "lucide-react";
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

/**
 * @fileOverview OracleKeeper - Un personnage de gardien ultra stylé
 * utilisant des strates d'animation Framer Motion pour une immersion totale.
 */
function OracleKeeper({ 
  gameState, 
  keeperChoice, 
  isScored 
}: { 
  gameState: string, 
  keeperChoice: Direction | null, 
  isScored: boolean | null 
}) {
  const isIdle = gameState === 'idle';
  const isResult = gameState === 'result';

  return (
    <div className="relative w-24 h-24 flex items-center justify-center">
      {/* Aura de puissance de l'Oracle */}
      <motion.div 
        animate={{ 
          scale: isIdle ? [1, 1.1, 1] : 1.2,
          opacity: isIdle ? [0.2, 0.4, 0.2] : 0.6,
          rotate: isIdle ? 0 : 180
        }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        className={cn(
          "absolute inset-0 rounded-full blur-2xl -z-10 transition-colors duration-500",
          isResult && !isScored ? "bg-red-500/30" : "bg-primary/20"
        )}
      />

      {/* Corps Principal (Plastron) */}
      <motion.div 
        className="relative z-20 flex flex-col items-center"
        animate={isIdle ? { y: [0, -5, 0] } : {}}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      >
        {/* Tête avec Visière */}
        <motion.div className="w-10 h-10 bg-card rounded-2xl border-2 border-primary/20 flex flex-col items-center justify-center shadow-xl overflow-hidden relative mb-1">
          <div className="w-full h-2 bg-primary/5 absolute top-2" />
          {/* Yeux Visière Lumineuse */}
          <motion.div 
            animate={{ 
              opacity: isIdle ? [0.4, 1, 0.4] : 1,
              backgroundColor: isResult && isScored ? "hsl(var(--destructive))" : isResult && !isScored ? "#22c55e" : "hsl(var(--primary))"
            }}
            transition={{ duration: 2, repeat: isIdle ? Infinity : 0 }}
            className="w-6 h-1 rounded-full shadow-[0_0_10px_currentColor]"
          />
        </motion.div>

        {/* Buste / Plastron */}
        <div className="w-14 h-16 bg-card rounded-[1.5rem] border-2 border-primary/10 shadow-2xl relative overflow-hidden flex items-center justify-center">
          <Shield className="h-6 w-6 opacity-10" />
          <motion.div 
            animate={{ x: ["-100%", "200%"] }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent skew-x-12"
          />
        </div>
      </motion.div>

      {/* Gants Détachés du Vide (Mains) */}
      <AnimatePresence>
        {(!isResult || (isResult && !isScored)) && (
          <>
            {/* Gant Gauche */}
            <motion.div 
              className="absolute -left-8 top-10 z-30"
              animate={isIdle ? { y: [0, 5, 0], x: [0, -2, 0] } : { scale: 1.2, x: -10, y: -5 }}
              transition={{ duration: 3, repeat: isIdle ? Infinity : 0 }}
            >
              <div className="w-8 h-8 bg-card rounded-xl border-2 border-primary/20 shadow-lg flex items-center justify-center">
                <Zap className="h-4 w-4 text-primary opacity-40" />
              </div>
            </motion.div>

            {/* Gant Droit */}
            <motion.div 
              className="absolute -right-8 top-10 z-30"
              animate={isIdle ? { y: [0, 5, 0], x: [0, 2, 0] } : { scale: 1.2, x: 10, y: -5 }}
              transition={{ duration: 3, repeat: isIdle ? Infinity : 0, delay: 0.5 }}
            >
              <div className="w-8 h-8 bg-card rounded-xl border-2 border-primary/20 shadow-lg flex items-center justify-center">
                <Zap className="h-4 w-4 text-primary opacity-40" />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

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

    // Oracle de la Dualité : 50% de chances de bloquer, 50% de chances de marquer
    const roll = Math.random();
    let keeperDir: Direction;
    let scored: boolean;

    if (roll < 0.50) {
      // L'Oracle utilise son omniscience et bloque (50%)
      keeperDir = direction;
      scored = false;
    } else {
      // L'Oracle feint l'erreur pour laisser passer la Lumière (50%)
      const otherDirections = DIRECTIONS.filter(d => d !== direction);
      keeperDir = otherDirections[Math.floor(Math.random() * otherDirections.length)];
      scored = true;
    }
    
    setKeeperChoice(keeperDir);
    setIsScored(scored);
    setGameState('shooting');

    try {
      // Déduction immédiate de la mise
      await updateDoc(userDocRef, {
        totalPoints: increment(-selectedBet),
        updatedAt: serverTimestamp()
      });

      setTimeout(async () => {
        setGameState('result');
        
        if (scored) {
          haptic.success();
          confetti({
            particleCount: 150,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#ffffff', '#000000', '#ffd700']
          });
          // Créditer les points en cas de succès (x2 la mise)
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
        "En haut à gauche": -115, "En haut": 0, "En haut à droite": 115,
        "À gauche": -115, "Centre": 0, "À droite": 115,
        "En bas à gauche": -115, "En bas": 0, "En bas à droite": 115
      };
      const yMap: Record<Direction, number> = {
        "En haut à gauche": -345, "En haut": -345, "En haut à droite": -345,
        "À gauche": -275, "Centre": -275, "À droite": -275,
        "En bas à gauche": -205, "En bas": -205, "En bas à droite": -205
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
        "En haut à gauche": -105, "En haut": 0, "En haut à droite": 105,
        "À gauche": -105, "Centre": 0, "À droite": 105,
        "En bas à gauche": -105, "En bas": 0, "En bas à droite": 105
      };
      const yMap: Record<Direction, number> = {
        "En haut à gauche": -15, "En haut": -15, "En haut à droite": -15,
        "À gauche": 50, "Centre": 40, "À droite": 50,
        "En bas à gauche": 115, "En bas": 115, "En bas à droite": 115
      };
      const finalY = yMap[direction as keyof typeof yMap] || 0;

      const rotateMap: Record<Direction, number> = {
        "En haut à gauche": -45, "En haut": 0, "En haut à droite": 45,
        "À gauche": -45, "Centre": 0, "À droite": 45,
        "En bas à gauche": -45, "En bas": 0, "En bas à droite": 45
      };
      return {
        x: `calc(-50% + ${xMap[direction]}px)`,
        y: finalY,
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
      case "Centre": return "top-1/3 left-1/3 z-[70]";
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
            <div className="absolute inset-0 z-0">
              <div className="absolute top-[25%] left-0 right-0 h-[1px] bg-primary/10" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_100%,rgba(var(--primary-rgb),0.05),transparent_70%)]" />
              <div className="absolute top-[25%] left-1/2 -translate-x-1/2 w-full h-full opacity-5 pointer-events-none" 
                   style={{ background: 'repeating-linear-gradient(90deg, transparent, transparent 40px, hsl(var(--primary)) 41px)' }} />
            </div>

            <div className={cn(
              "absolute top-[15%] left-1/2 -translate-x-1/2 w-72 h-40 border-x-4 border-t-4 border-primary/20 rounded-t-xl transition-all duration-300",
              gameState === 'idle' ? "z-[60]" : "z-10"
            )}>
              <div className="absolute inset-0 bg-primary/[0.02] backdrop-blur-[1px]" />
              <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(hsl(var(--primary)) 1px, transparent 1px)', backgroundSize: '12px 12px' }} />
              
              {gameState === 'idle' && DIRECTIONS.map((dir) => (
                <button
                  key={dir}
                  onClick={() => handleShoot(dir)}
                  disabled={loading}
                  className={cn(
                    "absolute opacity-0 bg-primary transition-opacity cursor-crosshair",
                    getTargetPosition(dir),
                    (dir.includes("Haut") || dir.includes("Bas")) && dir !== "Centre" ? "h-1/3" : "w-1/3 h-1/3"
                  )}
                />
              ))}
            </div>

            <motion.div 
              variants={keeperVariants} 
              animate={gameState === 'shooting' || gameState === 'result' ? "shooting" : "idle"} 
              custom={keeperChoice}
              className="absolute top-[22%] left-1/2 z-20 origin-bottom"
            >
              <OracleKeeper 
                gameState={gameState} 
                keeperChoice={keeperChoice} 
                isScored={isScored} 
              />
            </motion.div>

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
              <motion.div 
                initial={{ opacity: 0, y: 20 }} 
                animate={{ opacity: 1, y: 0, x: -10 }} // Ajustement : Légèrement à gauche et en bas
                exit={{ opacity: 0 }}
                className="mt-4"
              >
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
                <p className="text-[11px] font-medium opacity-40 italic">
                  "L'équilibre est parfait. 50% de chance, 100% d'intuition."
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
