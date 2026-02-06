"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useUser, useFirestore, useDoc } from "@/firebase";
import { doc, updateDoc, increment, serverTimestamp } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft, Zap, Loader2, Trophy, Target, ShieldAlert, Sparkles } from "lucide-react";
import { haptic } from "@/lib/haptics";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

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
    
    if (profile.totalPoints < selectedBet) {
      haptic.error();
      toast({
        variant: "destructive",
        title: "Lumière insuffisante",
        description: `Il vous manque ${selectedBet - profile.totalPoints} PTS.`
      });
      return;
    }

    setLoading(true);
    setGameState('shooting');
    setPlayerChoice(direction);
    haptic.medium();

    // Déduction immédiate de la mise
    try {
      await updateDoc(userDocRef, {
        totalPoints: increment(-selectedBet),
        updatedAt: serverTimestamp()
      });

      // Simulation du gardien (IA éthérée)
      setTimeout(async () => {
        const keeperDir = DIRECTIONS[Math.floor(Math.random() * DIRECTIONS.length)];
        const scored = direction !== keeperDir;
        
        setKeeperChoice(keeperDir);
        setIsScored(scored);
        setGameState('result');

        if (scored) {
          haptic.success();
          await updateDoc(userDocRef, {
            totalPoints: increment(selectedBet * 2),
            updatedAt: serverTimestamp()
          });
        } else {
          haptic.error();
        }
        setLoading(false);
      }, 1500);
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
            <h1 className="text-3xl font-black tracking-tight">Défi Penalty</h1>
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
                <div className="text-center space-y-2">
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
                  <p className="text-[10px] font-black uppercase tracking-widest text-center opacity-30">Choisissez votre angle</p>
                  <div className="grid grid-cols-3 gap-3">
                    {DIRECTIONS.map((dir) => (
                      <Button
                        key={dir}
                        onClick={() => handleShoot(dir)}
                        disabled={loading}
                        variant="outline"
                        className="h-24 rounded-2xl flex flex-col gap-2 font-black text-[10px] uppercase border-primary/10 hover:bg-primary/5"
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
                  "Marquez pour doubler votre mise. Échouez et votre Lumière rejoindra l'Inconnu."
                </p>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="action"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex-1 flex flex-col items-center justify-center space-y-12 py-10"
            >
              <div className="relative w-full aspect-video rounded-[3rem] bg-card/40 border border-primary/10 shadow-2xl flex flex-col items-center justify-center overflow-hidden">
                <div className="absolute top-4 left-0 right-0 flex justify-center gap-20">
                  {DIRECTIONS.map((d) => (
                    <div key={d} className="h-2 w-2 rounded-full bg-primary/10" />
                  ))}
                </div>
                
                <AnimatePresence>
                  {gameState === 'shooting' && (
                    <motion.div
                      initial={{ scale: 0.5, y: 100 }}
                      animate={{ scale: 1, y: 0 }}
                      className="text-6xl"
                    >
                      ⚽
                    </motion.div>
                  )}
                  {gameState === 'result' && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex flex-col items-center space-y-6"
                    >
                      <div className="flex gap-12 items-center">
                        <div className="text-center space-y-2">
                          <p className="text-[8px] font-black uppercase opacity-30">Vous</p>
                          <div className="h-12 w-12 rounded-xl bg-primary/5 flex items-center justify-center border border-primary/10 font-black text-[10px]">
                            {playerChoice?.charAt(0)}
                          </div>
                        </div>
                        <div className="text-2xl font-black italic opacity-20">VS</div>
                        <div className="text-center space-y-2">
                          <p className="text-[8px] font-black uppercase opacity-30">Gardien</p>
                          <div className={cn(
                            "h-12 w-12 rounded-xl flex items-center justify-center border font-black text-[10px]",
                            keeperChoice === playerChoice ? "bg-red-500/10 border-red-500/20 text-red-500" : "bg-green-500/10 border-green-500/20 text-green-500"
                          )}>
                            {keeperChoice?.charAt(0)}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2 text-center">
                        <h2 className={cn(
                          "text-5xl font-black uppercase italic tracking-tighter",
                          isScored ? "text-green-500" : "text-destructive"
                        )}>
                          {isScored ? "BUT !" : "ARRÊT !"}
                        </h2>
                        <p className="text-xs font-bold opacity-40">
                          {isScored ? `+${selectedBet * 2} PTS` : `-${selectedBet} PTS`}
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {gameState === 'result' && (
                <Button 
                  onClick={resetGame}
                  className="w-full h-20 rounded-[2.5rem] font-black text-sm uppercase shadow-xl"
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
