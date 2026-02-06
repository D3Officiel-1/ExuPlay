"use client";

import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useUser, useFirestore, useDoc } from "@/firebase";
import { doc, updateDoc, increment, serverTimestamp } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronLeft, Zap, Loader2, Trophy, Target, Sparkles, User, Crosshair } from "lucide-react";
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
    setGameState('shooting');
    setPlayerChoice(direction);
    haptic.medium();

    try {
      await updateDoc(userDocRef, {
        totalPoints: increment(-selectedBet),
        updatedAt: serverTimestamp()
      });

      setTimeout(async () => {
        const keeperDir = DIRECTIONS[Math.floor(Math.random() * DIRECTIONS.length)];
        const scored = direction !== keeperDir;
        
        setKeeperChoice(keeperDir);
        setIsScored(scored);
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
        scale: 0.3,
        rotate: 720,
        filter: "blur(2px)",
        transition: { duration: 0.6, ease: [0.4, 0, 0.2, 1] }
      };
    }
  };

  const keeperVariants = {
    idle: { x: 0, y: 0, rotate: 0, scale: 1 },
    dive: (direction: Direction | null) => {
      if (!direction) return {};
      const xMap: Record<Direction, number> = {
        "En haut à gauche": -80, "En haut": 0, "En haut à droite": 80,
        "À gauche": -80, "Centre": 0, "À droite": 80,
        "En bas à gauche": -80, "En bas": 0, "En bas à droite": 80
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
        x: xMap[direction],
        y: yMap[direction],
        rotate: rotateMap[direction],
        transition: { duration: 0.4, type: "spring", stiffness: 100 }
      };
    }
  };

  const getPositionStyles = (dir: Direction) => {
    switch (dir) {
      case "En haut à gauche": return "top-[5%] left-[5%]";
      case "En haut": return "top-[5%] left-[50%] -translate-x-1/2";
      case "En haut à droite": return "top-[5%] right-[5%]";
      case "À gauche": return "top-[50%] left-[5%] -translate-y-1/2";
      case "Centre": return "top-[50%] left-[50%] -translate-x-1/2 -translate-y-1/2";
      case "À droite": return "top-[50%] right-[5%] -translate-y-1/2";
      case "En bas à gauche": return "bottom-[5%] left-[5%]";
      case "En bas": return "bottom-[5%] left-[50%] -translate-x-1/2";
      case "En bas à droite": return "bottom-[5%] right-[5%]";
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col pb-32">
      <main className="flex-1 p-6 pt-24 space-y-10 max-w-lg mx-auto w-full">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full h-10 w-10 hover:bg-primary/5">
            <ChevronLeft className="h-6 w-6" />
          </Button>
          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40">Intuition</p>
            <h1 className="text-3xl font-black tracking-tight">L'Arène Sacrée</h1>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {gameState === 'idle' ? (
            <motion.div key="setup" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-10">
              <Card className="border-none bg-card/40 backdrop-blur-3xl shadow-2xl rounded-[2.5rem] p-8 space-y-8">
                <div className="text-center space-y-4">
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-30">Mise en Lumière</p>
                  <div className="flex justify-center gap-3">
                    {BET_AMOUNTS.map((amt) => (
                      <button key={amt} onClick={() => { haptic.light(); setSelectedBet(amt); }} className={cn("px-6 py-3 rounded-2xl font-black text-sm transition-all border", selectedBet === amt ? "bg-primary text-primary-foreground border-primary shadow-lg scale-105" : "bg-primary/5 border-primary/5 opacity-40")}>{amt}</button>
                    ))}
                  </div>
                </div>

                <div className="space-y-6">
                  <p className="text-[10px] font-black uppercase tracking-widest text-center opacity-30">Visez un point de résonance</p>
                  <div className="relative w-full aspect-[16/9] bg-primary/5 rounded-[2rem] border-4 border-primary/10 overflow-hidden group">
                    <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(hsl(var(--primary)) 1px, transparent 1px)', backgroundSize: '12px 12px' }} />
                    <div className="absolute inset-x-4 top-0 h-4 bg-primary/10 rounded-b-xl" />
                    <div className="absolute left-0 inset-y-4 w-4 bg-primary/10 rounded-r-xl" />
                    <div className="absolute right-0 inset-y-4 w-4 bg-primary/10 rounded-l-xl" />

                    {DIRECTIONS.map((dir) => (
                      <motion.button
                        key={dir}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => handleShoot(dir)}
                        disabled={loading}
                        className={cn(
                          "absolute z-10 h-10 w-10 sm:h-12 sm:w-12 rounded-full flex items-center justify-center transition-all",
                          "bg-background/40 backdrop-blur-xl border-2 border-primary/20 hover:border-primary hover:bg-primary/10",
                          "shadow-[0_0_20px_rgba(0,0,0,0.1)]",
                          getPositionStyles(dir)
                        )}
                      >
                        <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                      </motion.button>
                    ))}

                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-5 pointer-events-none">
                      <User className="h-20 w-20" />
                    </div>
                  </div>
                </div>
              </Card>

              <div className="p-6 bg-primary/5 rounded-[2rem] border border-primary/5 flex items-center gap-4">
                <Sparkles className="h-5 w-5 text-primary opacity-40" />
                <p className="text-[10px] leading-relaxed font-medium opacity-40 italic">"Chaque point lumineux est une faille dans la garde de l'Oracle. Le centre est le choix des audacieux."</p>
              </div>
            </motion.div>
          ) : (
            <motion.div key="arena" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex-1 flex flex-col items-center justify-center space-y-12">
              <div className="relative w-full aspect-[4/5] rounded-[3rem] bg-gradient-to-b from-green-900/20 to-background border border-primary/10 shadow-2xl overflow-hidden perspective-[1000px]">
                <div className="absolute top-[20%] left-0 right-0 h-px bg-white/10" />
                <div className="absolute bottom-[10%] left-[10%] right-[10%] h-[2px] bg-white/5 rounded-full" />
                <div className="absolute top-[15%] left-1/2 -translate-x-1/2 w-64 h-32 border-4 border-white/20 rounded-t-lg border-b-0">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.05),transparent)]" />
                  <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '10px 10px' }} />
                </div>

                <motion.div custom={keeperChoice} variants={keeperVariants} animate={gameState === 'result' ? "dive" : "idle"} className="absolute top-[21%] left-1/2 -translate-x-1/2 z-20">
                  <div className={cn("h-16 w-16 bg-card rounded-2xl flex items-center justify-center border-2 shadow-xl transition-colors", isScored === false ? "border-red-500 bg-red-500/10" : "border-primary/20")}>
                    <User className={cn("h-10 w-10", isScored === false ? "text-red-500" : "opacity-40")} />
                  </div>
                </motion.div>

                <div className="absolute bottom-[20%] left-1/2 -translate-x-1/2 w-4 h-4 bg-white/20 rounded-full blur-[2px]" />

                <motion.div custom={playerChoice} variants={ballVariants} animate={gameState === 'shooting' || gameState === 'result' ? "shooting" : "idle"} className="absolute bottom-[20%] left-1/2 -translate-x-1/2 z-30">
                  <div className="relative group">
                    <div className="text-5xl drop-shadow-2xl filter brightness-110">⚽</div>
                    <motion.div animate={gameState !== 'idle' ? { opacity: 0, scale: 0 } : { opacity: 0.3 }} className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-8 h-2 bg-black rounded-full blur-sm" />
                  </div>
                </motion.div>

                <AnimatePresence>
                  {gameState === 'result' && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="absolute inset-0 flex flex-col items-center justify-center z-50 pointer-events-none">
                      <motion.h2 initial={{ scale: 0.5, rotate: -10 }} animate={{ scale: 1, rotate: 0 }} className={cn("text-7xl font-black uppercase italic tracking-tighter drop-shadow-2xl", isScored ? "text-green-500" : "text-destructive")}>{isScored ? "BUT !" : "ARRÊT !"}</motion.h2>
                      <p className="text-xl font-black mt-4 bg-background/80 backdrop-blur-md px-6 py-2 rounded-full border border-primary/10">{isScored ? `+${selectedBet * 2} PTS` : `-${selectedBet} PTS`}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {gameState === 'result' && <Button onClick={resetGame} className="w-full h-20 rounded-[2.5rem] font-black text-sm uppercase shadow-2xl shadow-primary/20 transition-all active:scale-95">Nouvelle Frappe</Button>}
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}