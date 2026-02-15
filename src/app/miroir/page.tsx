"use client";

import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useUser, useFirestore, useDoc } from "@/firebase";
import { doc, updateDoc, increment, serverTimestamp } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { 
  ChevronLeft, 
  Zap, 
  Loader2, 
  Sparkles, 
  Star,
  Heart,
  Diamond,
  Edit3
} from "lucide-react";
import { haptic } from "@/lib/haptics";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { EmojiOracle } from "@/components/EmojiOracle";
import { triggerMiroirRound, validateMiroirWin } from "@/app/actions/miroir";
import confetti from "canvas-confetti";

const MIN_BET = 5;
const MULTIPLIER = 5.5;

export default function MiroirPage() {
  const { user } = useUser();
  const db = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const [betInput, setBetInput] = useState("50");
  const [gameState, setGameState] = useState<'idle' | 'revealing' | 'result'>('idle');
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [winningIndex, setWinningIndex] = useState<number | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [winAmount, setWinAmount] = useState<number | null>(null);

  const userDocRef = useMemo(() => (db && user?.uid ? doc(db, "users", user.uid) : null), [db, user?.uid]);
  const { data: profile } = useDoc(userDocRef);

  const currentBet = Math.max(MIN_BET, parseInt(betInput) || 0);

  const handleSelectMirror = async (idx: number) => {
    if (!profile || !userDocRef || isProcessing || gameState !== 'idle') return;
    
    if (currentBet < MIN_BET) {
      haptic.error();
      toast({ variant: "destructive", title: "Mise invalide", description: `Minimum ${MIN_BET} PTS.` });
      return;
    }

    if ((profile.totalPoints || 0) < currentBet) {
      haptic.error();
      toast({ variant: "destructive", title: "Lumière insuffisante" });
      return;
    }

    setIsProcessing(true);
    setSelectedIndex(idx);
    haptic.medium();

    const bonusReduction = Math.min(currentBet, profile.bonusBalance || 0);

    try {
      // Déduction immédiate de la mise
      await updateDoc(userDocRef, {
        totalPoints: increment(-currentBet),
        bonusBalance: increment(-bonusReduction),
        updatedAt: serverTimestamp()
      });

      // Appel de l'Oracle
      const round = await triggerMiroirRound();
      setWinningIndex(round.winningIndex);
      setGameState('revealing');

      // Animation de révélation
      setTimeout(async () => {
        const validation = await validateMiroirWin(currentBet, idx, round.winningIndex);
        setGameState('result');
        
        if (validation.success) {
          setWinAmount(validation.winAmount);
          haptic.success();
          confetti({
            particleCount: 150,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#ff69b4', '#ffd700', '#ffffff']
          });

          await updateDoc(userDocRef, {
            totalPoints: increment(validation.winAmount),
            updatedAt: serverTimestamp()
          });
          toast({ title: "Éclat Royal !", description: `Le miroir a révélé le Diamant. +${validation.winAmount} PTS.` });
        } else {
          haptic.error();
          setWinAmount(0);
        }
        setIsProcessing(false);
      }, 1500);

    } catch (e) {
      setIsProcessing(false);
      setGameState('idle');
      toast({ variant: "destructive", title: "Dissonance Système" });
    }
  };

  const resetGame = () => {
    haptic.light();
    setGameState('idle');
    setSelectedIndex(null);
    setWinningIndex(null);
    setWinAmount(null);
  };

  return (
    <div className="min-h-screen bg-[#0f0510] text-white flex flex-col pb-32 overflow-hidden">
      <header className="fixed top-0 left-0 right-0 z-50 p-6 flex items-center justify-between bg-background/5 backdrop-blur-xl border-b border-pink-500/10">
        <Button variant="ghost" size="icon" onClick={() => router.push("/home")} className="rounded-full bg-white/5 border border-pink-500/20">
          <ChevronLeft className="h-6 w-6 text-pink-400" />
        </Button>
        <div className="flex flex-col items-center">
          <p className="text-[8px] font-black uppercase tracking-[0.4em] text-pink-400/60">Le Miroir de l'Âme</p>
          <div className="flex items-center gap-2 px-4 py-1.5 bg-pink-500/10 rounded-full border border-pink-500/20 mt-1">
            <Zap className="h-3.5 w-3.5 text-pink-400" />
            <span className="text-xs font-black tabular-nums text-pink-100">{(profile?.totalPoints || 0).toLocaleString()}</span>
          </div>
        </div>
        <div className="w-10 h-10" />
      </header>

      <main className="flex-1 p-6 pt-28 flex flex-col gap-10 max-w-lg mx-auto w-full relative">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 -left-20 w-64 h-64 bg-pink-500/10 rounded-full blur-[100px] animate-pulse" />
          <div className="absolute bottom-1/4 -right-20 w-64 h-64 bg-purple-500/10 rounded-full blur-[100px] animate-pulse" />
        </div>

        <div className="text-center space-y-2 relative z-10">
          <h2 className="text-sm font-black uppercase tracking-[0.3em] text-pink-300/40">Boudoir Céleste</h2>
          <p className="text-[10px] font-medium italic opacity-40">"Un seul reflet détient la vérité absolue."</p>
        </div>

        <div className="grid grid-cols-3 gap-4 relative z-10">
          {[0, 1, 2, 3, 4, 5].map((i) => {
            const isSelected = selectedIndex === i;
            const isWinner = winningIndex === i;
            const showContent = gameState === 'result' || (gameState === 'revealing' && isWinner);

            return (
              <motion.button
                key={i}
                whileHover={gameState === 'idle' ? { scale: 1.05, y: -5 } : {}}
                whileTap={gameState === 'idle' ? { scale: 0.95 } : {}}
                onClick={() => handleSelectMirror(i)}
                disabled={gameState !== 'idle' || isProcessing}
                className={cn(
                  "relative aspect-[3/4] rounded-[2rem] transition-all duration-700 overflow-hidden border-2",
                  isSelected && gameState !== 'result' ? "border-pink-400 shadow-[0_0_30px_rgba(244,114,182,0.4)] scale-105 z-20" : 
                  gameState === 'result' && isWinner ? "border-yellow-400 shadow-[0_0_40px_rgba(250,204,21,0.5)] scale-110 z-30" :
                  "border-white/10 bg-white/5 hover:bg-white/10"
                )}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
                
                <AnimatePresence mode="wait">
                  {!showContent ? (
                    <motion.div 
                      key="back"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0, scale: 0.8, filter: "blur(10px)" }}
                      className="h-full w-full flex flex-col items-center justify-center p-4"
                    >
                      <div className="h-10 w-10 rounded-full border border-pink-500/20 flex items-center justify-center bg-pink-500/5 mb-2">
                        <Sparkles className="h-4 w-4 text-pink-400 opacity-40" />
                      </div>
                      <span className="text-[8px] font-black uppercase tracking-widest text-pink-300/20">Reflet {i + 1}</span>
                    </motion.div>
                  ) : (
                    <motion.div 
                      key="front"
                      initial={{ scale: 0.5, opacity: 0, rotateY: 180 }}
                      animate={{ scale: 1, opacity: 1, rotateY: 0 }}
                      className="h-full w-full flex items-center justify-center"
                    >
                      {isWinner ? (
                        <div className="flex flex-col items-center gap-2">
                          <motion.div 
                            animate={{ scale: [1, 1.2, 1], rotate: [0, 10, -10, 0] }}
                            transition={{ duration: 3, repeat: Infinity }}
                          >
                            <EmojiOracle text="💎" forceStatic className="text-4xl" />
                          </motion.div>
                          <span className="text-[8px] font-black text-yellow-400 uppercase tracking-widest">Essence</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-2 opacity-20">
                          <EmojiOracle text="🌫️" forceStatic className="text-3xl" />
                          <span className="text-[8px] font-black uppercase tracking-widest">Illusion</span>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                {gameState === 'revealing' && isSelected && !isWinner && (
                  <div className="absolute inset-0 bg-white/5 animate-pulse" />
                )}
              </motion.button>
            );
          })}
        </div>

        <Card className="border-none bg-white/5 backdrop-blur-3xl rounded-[3rem] p-8 border border-pink-500/10 shadow-2xl relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-b from-pink-500/[0.02] to-transparent pointer-events-none" />
          
          <AnimatePresence mode="wait">
            {gameState === 'idle' ? (
              <motion.div 
                key="idle-ui"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="space-y-8"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between px-2">
                    <div className="flex items-center gap-2">
                      <Zap className="h-3 w-3 text-pink-400 opacity-40" />
                      <span className="text-[10px] font-black uppercase tracking-widest opacity-40">Mise de Lumière</span>
                    </div>
                    <span className="text-[9px] font-black opacity-20 uppercase tracking-tighter">Multiplicateur: x{MULTIPLIER}</span>
                  </div>
                  <div className="relative group">
                    <Input 
                      type="number" 
                      value={betInput} 
                      onChange={(e) => setBetInput(e.target.value)} 
                      className="h-16 text-3xl font-black text-center rounded-[1.75rem] bg-pink-500/5 border-none shadow-inner focus-visible:ring-1 focus-visible:ring-pink-500/20"
                    />
                    <Edit3 className="absolute right-6 top-1/2 -translate-y-1/2 h-5 w-5 opacity-20 group-hover:opacity-40 transition-opacity" />
                  </div>
                </div>

                <div className="p-6 bg-pink-500/5 rounded-[2rem] border border-pink-500/10 text-center flex flex-col items-center gap-3">
                  <div className="flex gap-4">
                    <Heart className="h-4 w-4 text-pink-400 opacity-20" />
                    <Star className="h-4 w-4 text-pink-400 opacity-20" />
                    <Heart className="h-4 w-4 text-pink-400 opacity-20" />
                  </div>
                  <p className="text-[10px] leading-relaxed font-bold text-pink-200/40 uppercase tracking-widest">
                    Choisissez un miroir pour sceller votre sort
                  </p>
                </div>
              </motion.div>
            ) : gameState === 'result' ? (
              <motion.div 
                key="result-ui"
                initial={{ opacity: 0, scale: 0.9, filter: "blur(10px)" }}
                animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                className="text-center space-y-8 py-4"
              >
                {winAmount && winAmount > 0 ? (
                  <div className="space-y-6">
                    <div className="relative inline-block">
                      <div className="h-24 w-24 bg-yellow-500/10 rounded-[2.5rem] flex items-center justify-center mx-auto border border-yellow-500/20 shadow-[0_0_50px_rgba(250,204,21,0.3)]">
                        <Diamond className="h-12 w-12 text-yellow-500" />
                      </div>
                      <motion.div 
                        animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="absolute inset-0 bg-yellow-500/20 blur-2xl rounded-full -z-10"
                      />
                    </div>
                    <div className="space-y-2">
                      <h2 className="text-4xl font-black italic uppercase tracking-tighter text-yellow-500">Éclat Royal !</h2>
                      <p className="text-xs font-medium text-pink-200/40">L'Oracle a reconnu votre essence.</p>
                    </div>
                    <div className="p-6 bg-pink-500/10 rounded-[2rem] border border-pink-500/20">
                      <span className="text-4xl font-black text-white">+{winAmount} <span className="text-sm opacity-40 italic">PTS</span></span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6 opacity-60">
                    <div className="h-24 w-24 bg-white/5 rounded-[2.5rem] flex items-center justify-center mx-auto border border-white/10">
                      <Zap className="h-12 w-12 text-white/20" />
                    </div>
                    <div className="space-y-2">
                      <h2 className="text-4xl font-black italic uppercase tracking-tighter">Illusion</h2>
                      <p className="text-xs font-medium opacity-40">La vérité s'est dérobée sous votre regard.</p>
                    </div>
                  </div>
                )}
                <Button onClick={resetGame} className="w-full h-16 rounded-[1.75rem] font-black text-[10px] uppercase tracking-[0.4em] shadow-xl bg-pink-600 hover:bg-pink-500 transition-all">Nouveau Reflet</Button>
              </motion.div>
            ) : (
              <div className="py-12 flex flex-col items-center justify-center gap-8 text-center">
                <div className="relative">
                  <div className="h-20 w-20 bg-pink-500/5 rounded-full flex items-center justify-center border border-pink-500/10">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                    >
                      <Sparkles className="h-8 w-8 text-pink-400 opacity-40" />
                    </motion.div>
                  </div>
                  <motion.div 
                    animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="absolute inset-[-10px] border border-dashed border-pink-500/20 rounded-full"
                  />
                </div>
                <div className="space-y-2">
                  <p className="text-[11px] font-black uppercase tracking-[0.6em] text-pink-400 animate-pulse">Vision de l'Oracle</p>
                  <p className="text-[9px] font-bold opacity-30 uppercase tracking-widest">Décryptage de la destinée...</p>
                </div>
              </div>
            )}
          </AnimatePresence>
        </Card>

        <div className="p-8 bg-pink-500/5 rounded-[3rem] border border-pink-500/10 text-center space-y-3 relative overflow-hidden w-full">
          <p className="text-[11px] leading-relaxed font-medium text-pink-200/40 italic px-4">
            "Le Miroir ne ment jamais, il ne fait que refléter la profondeur de votre intuition."
          </p>
          <div className="absolute -bottom-10 -left-10 h-32 w-32 bg-pink-500/5 blur-[80px] rounded-full" />
        </div>
      </main>
    </div>
  );
}
