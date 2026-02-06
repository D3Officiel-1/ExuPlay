"use client";

import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useUser, useFirestore, useDoc } from "@/firebase";
import { doc, updateDoc, increment, serverTimestamp } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronLeft, Zap, Loader2, Trophy, Target, Sparkles, User } from "lucide-react";
import { haptic } from "@/lib/haptics";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import confetti from "canvas-confetti";

const BET_AMOUNTS = [50, 100, 200];
const DIRECTIONS = ["Gauche", "Centre", "Droite"] as const;

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
      // Déduction immédiate
      await updateDoc(userDocRef, {
        totalPoints: increment(-selectedBet),
        updatedAt: serverTimestamp()
      });

      // Simulation du temps de vol du ballon
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

  // Variantes d'animation pour le ballon
  const ballVariants = {
    idle: { y: 0, x: 0, scale: 1, filter: "blur(0px)", rotate: 0 },
    shooting: (direction: Direction) => {
      const xMap = { "Gauche": -120, "Centre": 0, "Droite": 120 };
      return {
        y: -320,
        x: xMap[direction],
        scale: 0.3,
        rotate: 720,
        filter: "blur(2px)",
        transition: { duration: 0.6, ease: [0.4, 0, 0.2, 1] }
      };
    }
  };

  // Variantes d'animation pour le gardien
  const keeperVariants = {
    idle: { x: 0, y: 0, rotate: 0, scale: 1 },
    dive: (direction: Direction | null) => {
      if (!direction) return {};
      const xMap = { "Gauche": -80, "Centre": 0, "Droite": 80 };
      const rotateMap = { "Gauche": -45, "Centre": 0, "Droite": 45 };
      return {
        x: xMap[direction],
        rotate: rotateMap[direction],
        y: direction === "Centre" ? -10 : 15,
        transition: { duration: 0.4, type: "spring", stiffness: 100 }
      };
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col pb-32">
      <main className="flex-1 p-6 pt-24 space-y-10 max-w-lg mx-auto w-full">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => router.back()}
            className="rounded-full h-10 w-10 hover:bg-primary/5"
          >
            <ChevronLeft className="h-6 w-6" />
          </Button>
          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40">Intuition</p>
            <h1 className="text-3xl font-black tracking-tight">L'Arène Sacrée</h1>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {gameState === 'idle' ? (
            <motion.div
              key="setup"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-10"
            >
              <Card className="border-none bg-card/40 backdrop-blur-3xl shadow-2xl rounded-[2.5rem] p-8 space-y-8">
                <div className="text-center space-y-4">
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-30">Mise en Lumière</p>
                  <div className="flex justify-center gap-3">
                    {BET_AMOUNTS.map((amt) => (
                      <button
                        key={amt}
                        onClick={() => { haptic.light(); setSelectedBet(amt); }}
                        className={cn(
                          "px-6 py-3 rounded-2xl font-black text-sm transition-all border",
                          selectedBet === amt 
                            ? "bg-primary text-primary-foreground border-primary shadow-lg scale-105" 
                            : "bg-primary/5 border-primary/5 opacity-40"
                        )}
                      >
                        {amt}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-center opacity-30">Ciblez l'angle mort</p>
                  <div className="grid grid-cols-3 gap-3">
                    {DIRECTIONS.map((dir) => (
                      <Button
                        key={dir}
                        onClick={() => handleShoot(dir)}
                        disabled={loading}
                        variant="outline"
                        className="h-24 rounded-2xl flex flex-col gap-2 font-black text-[10px] uppercase border-primary/10 hover:bg-primary/5 transition-all active:scale-95"
                      >
                        <Target className="h-6 w-6 opacity-40" />
                        {dir}
                      </Button>
                    ))}
                  </div>
                </div>
              </Card>

              <div className="p-6 bg-primary/5 rounded-[2rem] border border-primary/5 flex items-center gap-4">
                <Sparkles className="h-5 w-5 text-primary opacity-40" />
                <p className="text-[10px] leading-relaxed font-medium opacity-40 italic">
                  "Un tir précis double votre essence. Une erreur, et la Lumière retourne au vide."
                </p>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="arena"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex-1 flex flex-col items-center justify-center space-y-12"
            >
              {/* STADE 3D PERSPECTIVE */}
              <div className="relative w-full aspect-[4/5] rounded-[3rem] bg-gradient-to-b from-green-900/20 to-background border border-primary/10 shadow-2xl overflow-hidden perspective-[1000px]">
                
                {/* Lignes de terrain */}
                <div className="absolute top-[20%] left-0 right-0 h-px bg-white/10" />
                <div className="absolute bottom-[10%] left-[10%] right-[10%] h-[2px] bg-white/5 rounded-full" />
                
                {/* Goal Post */}
                <div className="absolute top-[15%] left-1/2 -translate-x-1/2 w-64 h-32 border-4 border-white/20 rounded-t-lg border-b-0">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.05),transparent)]" />
                  {/* Net pattern */}
                  <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '10px 10px' }} />
                </div>

                {/* Gardien (Oracle de l'Arrêt) */}
                <motion.div
                  custom={keeperChoice}
                  variants={keeperVariants}
                  animate={gameState === 'result' ? "dive" : "idle"}
                  className="absolute top-[21%] left-1/2 -translate-x-1/2 z-20"
                >
                  <div className={cn(
                    "h-16 w-16 bg-card rounded-2xl flex items-center justify-center border-2 shadow-xl transition-colors",
                    isScored === false ? "border-red-500 bg-red-500/10" : "border-primary/20"
                  )}>
                    <User className={cn("h-10 w-10", isScored === false ? "text-red-500" : "opacity-40")} />
                  </div>
                </motion.div>

                {/* Point de Penalty */}
                <div className="absolute bottom-[20%] left-1/2 -translate-x-1/2 w-4 h-4 bg-white/20 rounded-full blur-[2px]" />

                {/* Le Ballon (Artefact de Cuir) */}
                <motion.div
                  custom={playerChoice}
                  variants={ballVariants}
                  animate={gameState === 'shooting' || gameState === 'result' ? "shooting" : "idle"}
                  className="absolute bottom-[20%] left-1/2 -translate-x-1/2 z-30"
                >
                  <div className="relative group">
                    <div className="text-5xl drop-shadow-2xl filter brightness-110">⚽</div>
                    {/* Ombre portée */}
                    <motion.div 
                      animate={gameState !== 'idle' ? { opacity: 0, scale: 0 } : { opacity: 0.3 }}
                      className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-8 h-2 bg-black rounded-full blur-sm" 
                    />
                  </div>
                </motion.div>

                {/* Result Message Overlay */}
                <AnimatePresence>
                  {gameState === 'result' && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="absolute inset-0 flex flex-col items-center justify-center z-50 pointer-events-none"
                    >
                      <motion.h2 
                        initial={{ scale: 0.5, rotate: -10 }}
                        animate={{ scale: 1, rotate: 0 }}
                        className={cn(
                          "text-7xl font-black uppercase italic tracking-tighter drop-shadow-2xl",
                          isScored ? "text-green-500" : "text-destructive"
                        )}
                      >
                        {isScored ? "BUT !" : "ARRÊT !"}
                      </motion.h2>
                      <p className="text-xl font-black mt-4 bg-background/80 backdrop-blur-md px-6 py-2 rounded-full border border-primary/10">
                        {isScored ? `+${selectedBet * 2} PTS` : `-${selectedBet} PTS`}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {gameState === 'result' && (
                <Button 
                  onClick={resetGame}
                  className="w-full h-20 rounded-[2.5rem] font-black text-sm uppercase shadow-2xl shadow-primary/20 transition-all active:scale-95"
                >
                  Nouvelle Frappe
                </Button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}