
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
  History,
  TrendingUp,
  Coins,
  HandCoins,
  Sparkles,
  ArrowRight,
  Flame,
  ShieldCheck
} from "lucide-react";
import { haptic } from "@/lib/haptics";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { EmojiOracle } from "@/components/EmojiOracle";
import confetti from "canvas-confetti";

const MIN_BET = 5;
const MULTIPLIER_PER_WIN = 1.88;

type Side = 'pile' | 'face';
type GameStatus = 'idle' | 'flipping' | 'result';

export default function CoinFlipPage() {
  const { user } = useUser();
  const db = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const [betInput, setBetInput] = useState("50");
  const [status, setStatus] = useState<GameStatus>('idle');
  const [streak, setStreak] = useState(0);
  const [lastResult, setLastResult] = useState<Side | null>(null);
  const [selectedSide, setSelectedSide] = useState<Side | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentWin, setCurrentWin] = useState(0);

  const userDocRef = useMemo(() => (db && user?.uid ? doc(db, "users", user.uid) : null), [db, user?.uid]);
  const { data: profile } = useDoc(userDocRef);

  const currentBet = Math.max(MIN_BET, parseInt(betInput) || 0);

  const seriesPreview = useMemo(() => {
    return [1, 2, 3, 4, 5].map(step => ({
      multiplier: (Math.pow(MULTIPLIER_PER_WIN, step)).toFixed(2),
      step
    }));
  }, []);

  const handleFlip = async (side: Side) => {
    if (!profile || !userDocRef || isProcessing || status !== 'idle') return;

    if (streak === 0) {
      if (currentBet < MIN_BET) {
        haptic.error();
        toast({ variant: "destructive", title: "Mise invalide", description: `Le minimum est de ${MIN_BET} PTS.` });
        return;
      }

      if ((profile.totalPoints || 0) < currentBet) {
        haptic.error();
        toast({ variant: "destructive", title: "Lumière insuffisante", description: "Votre essence est trop faible." });
        return;
      }

      setIsProcessing(true);
      
      const bonusReduction = Math.min(currentBet, profile.bonusBalance || 0);

      try {
        await updateDoc(userDocRef, { 
          totalPoints: increment(-currentBet), 
          bonusBalance: increment(-bonusReduction),
          updatedAt: serverTimestamp() 
        });
        setIsProcessing(false);
      } catch (e) {
        setIsProcessing(false);
        return;
      }
    }

    haptic.medium();
    setSelectedSide(side);
    setStatus('flipping');

    setTimeout(() => {
      const result: Side = Math.random() > 0.5 ? 'face' : 'pile';
      const isWon = result === side;
      
      setLastResult(result);
      setStatus('result');
      
      if (isWon) {
        haptic.success();
        const newStreak = streak + 1;
        setStreak(newStreak);
        const winAmount = Math.floor(currentBet * Math.pow(MULTIPLIER_PER_WIN, newStreak));
        setCurrentWin(winAmount);
        
        setTimeout(() => {
          setStatus('idle');
        }, 800);
      } else {
        haptic.error();
        setStreak(0);
        setCurrentWin(0);
        setTimeout(() => {
          setStatus('idle');
          setSelectedSide(null);
        }, 2000);
      }
    }, 1800); 
  };

  const handleCashout = async () => {
    if (!userDocRef || currentWin <= 0 || isProcessing || status !== 'idle') return;

    setIsProcessing(true);
    haptic.impact();

    try {
      await updateDoc(userDocRef, {
        totalPoints: increment(currentWin),
        updatedAt: serverTimestamp()
      });

      confetti({
        particleCount: 200,
        spread: 90,
        origin: { y: 0.6 },
        colors: ['#fbbf24', '#ffffff', '#3b82f6', '#10b981']
      });

      toast({ 
        title: "Lumière Matérialisée !", 
        description: `+${currentWin.toLocaleString()} PTS ont rejoint votre essence.` 
      });
      
      setStreak(0);
      setCurrentWin(0);
      setSelectedSide(null);
      setStatus('idle');
    } catch (e) {
      toast({ variant: "destructive", title: "Dissonance lors de l'extraction" });
    } finally {
      setIsProcessing(false);
    }
  };

  const adjustBet = (action: 'half' | 'double' | 'plus' | 'minus') => {
    if (streak > 0) return; 
    haptic.light();
    let val = parseInt(betInput) || 0;
    if (action === 'half') val = Math.floor(val / 2);
    else if (action === 'double') val = val * 2;
    else if (action === 'plus') val += 10;
    else if (action === 'minus') val = Math.max(MIN_BET, val - 10);
    setBetInput(Math.max(MIN_BET, val).toString());
  };

  return (
    <div className="min-h-screen bg-[#020617] text-white flex flex-col pb-32 overflow-hidden selection:bg-primary/30">
      <header className="fixed top-0 left-0 right-0 z-50 p-6 flex items-center justify-between bg-background/5 backdrop-blur-xl border-b border-white/5">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => router.push("/home")} 
          className="rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
        >
          <ChevronLeft className="h-6 w-6" />
        </Button>
        <div className="flex flex-col items-center">
          <p className="text-[8px] font-black uppercase tracking-[0.5em] text-primary/60">L'Arène de la Dualité</p>
          <div className="flex items-center gap-2 px-4 py-1.5 bg-primary/10 rounded-full border border-primary/20 mt-1">
            <Zap className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-black tabular-nums">{(profile?.totalPoints || 0).toLocaleString()}</span>
          </div>
        </div>
        <div className="w-10 h-10" />
      </header>

      <main className="flex-1 p-6 pt-28 flex flex-col items-center gap-12 max-w-lg mx-auto w-full relative">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 -left-20 w-64 h-64 bg-primary/5 rounded-full blur-[100px] animate-pulse" />
          <div className="absolute bottom-1/4 -right-20 w-64 h-64 bg-blue-500/5 rounded-full blur-[100px] animate-pulse" />
        </div>

        <div className="relative h-72 w-72 flex items-center justify-center perspective-1000">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.15),transparent_70%)] animate-pulse" />
          
          <motion.div
            animate={status === 'flipping' ? {
              rotateY: [0, 1800, 3600],
              y: [0, -180, 0],
              scale: [1, 1.2, 1],
              transition: { duration: 1.8, ease: [0.45, 0.05, 0.55, 0.95] }
            } : {
              rotateY: lastResult === 'face' ? 180 : 0,
              y: [0, -8, 0],
              transition: { 
                rotateY: { duration: 0.6, type: "spring", stiffness: 100, damping: 15 },
                y: { duration: 4, repeat: Infinity, ease: "easeInOut" }
              }
            }}
            className="relative w-56 h-56 preserve-3d"
            style={{ transformStyle: 'preserve-3d' }}
          >
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-yellow-200 via-yellow-500 to-yellow-700 border-4 border-yellow-300/30 flex flex-col items-center justify-center shadow-[0_0_60px_rgba(234,179,8,0.4),inset_0_0_20px_rgba(0,0,0,0.3)] backface-hidden">
              <span className="text-6xl font-black text-yellow-950 italic select-none">PILE</span>
              <Coins className="h-14 w-14 text-yellow-950/20 mt-2" />
              <div className="absolute inset-2 border border-yellow-300/20 rounded-full" />
            </div>
            
            <div 
              className="absolute inset-0 rounded-full bg-gradient-to-br from-slate-100 via-slate-400 to-slate-600 border-4 border-slate-300/30 flex flex-col items-center justify-center shadow-[0_0_60px_rgba(255,255,255,0.2),inset_0_0_20px_rgba(0,0,0,0.3)] backface-hidden" 
              style={{ transform: 'rotateY(180deg)' }}
            >
              <span className="text-6xl font-black text-slate-950 italic select-none">FACE</span>
              <Coins className="h-14 w-14 text-slate-950/20 mt-2" />
              <div className="absolute inset-2 border border-slate-300/20 rounded-full" />
            </div>
          </motion.div>

          <AnimatePresence>
            {status === 'result' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1.2 }}
                exit={{ opacity: 0, scale: 1.5 }}
                className={cn(
                  "absolute inset-0 blur-3xl rounded-full -z-10",
                  lastResult === 'pile' ? "bg-yellow-500/30" : "bg-white/20"
                )}
              />
            )}
          </AnimatePresence>
        </div>

        <div className="w-full space-y-8 relative z-10">
          <Card className="border-none bg-card/20 backdrop-blur-3xl rounded-[3rem] p-8 border border-white/5 shadow-2xl space-y-8 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] to-transparent pointer-events-none" />
            
            <div className="space-y-4">
              <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-2">
                  <Zap className="h-3 w-3 text-primary opacity-40" />
                  <span className="text-[10px] font-black uppercase tracking-widest opacity-40">Mise de Lumière</span>
                </div>
                <span className="text-[9px] font-black opacity-20 uppercase">Min: 5 PTS</span>
              </div>
              
              <div className="flex bg-black/40 rounded-3xl p-2 border border-white/5 shadow-inner">
                <div className="flex-1 flex flex-col justify-center pl-4">
                  <input 
                    type="number" 
                    value={betInput} 
                    onChange={e => setBetInput(e.target.value)}
                    disabled={streak > 0 || status !== 'idle'}
                    className="bg-transparent border-none text-2xl font-black focus:ring-0 focus:outline-none w-full tabular-nums"
                  />
                </div>
                <div className="flex gap-1">
                  <button 
                    onClick={() => adjustBet('minus')} 
                    disabled={streak > 0 || status !== 'idle'}
                    className="h-12 w-12 rounded-2xl bg-white/5 hover:bg-white/10 transition-colors font-bold text-xl flex items-center justify-center disabled:opacity-20"
                  >
                    -
                  </button>
                  <button 
                    onClick={() => adjustBet('plus')} 
                    disabled={streak > 0 || status !== 'idle'}
                    className="h-12 w-12 rounded-2xl bg-white/5 hover:bg-white/10 transition-colors font-bold text-xl flex items-center justify-center disabled:opacity-20"
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => adjustBet('half')} 
                  disabled={streak > 0 || status !== 'idle'} 
                  className="h-12 rounded-2xl bg-white/5 border-white/5 font-black text-xs hover:bg-white/10 disabled:opacity-20"
                >
                  MOITIÉ
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => adjustBet('double')} 
                  disabled={streak > 0 || status !== 'idle'} 
                  className="h-12 rounded-2xl bg-white/5 border-white/5 font-black text-xs hover:bg-white/10 disabled:opacity-20"
                >
                  DOUBLE
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => handleFlip('pile')}
                disabled={status !== 'idle' || isProcessing}
                className={cn(
                  "h-24 rounded-[2rem] flex flex-col items-center justify-center gap-1 transition-all duration-500 active:scale-95 border-2 relative overflow-hidden",
                  selectedSide === 'pile' && status !== 'idle' 
                    ? "bg-yellow-500 border-yellow-400 text-yellow-950 shadow-[0_0_40px_rgba(234,179,8,0.4)] scale-105 z-20" 
                    : "bg-yellow-500/5 border-yellow-500/10 text-yellow-500 hover:bg-yellow-500/10"
                )}
              >
                <span className="text-xl font-black uppercase italic tracking-tighter relative z-10">Pile</span>
                <span className="text-[10px] font-bold opacity-60 relative z-10">x{MULTIPLIER_PER_WIN}</span>
                {selectedSide === 'pile' && status === 'flipping' && (
                  <motion.div 
                    animate={{ x: ["-100%", "200%"] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12"
                  />
                )}
              </button>

              <button
                onClick={() => handleFlip('face')}
                disabled={status !== 'idle' || isProcessing}
                className={cn(
                  "h-24 rounded-[2rem] flex flex-col items-center justify-center gap-1 transition-all duration-500 active:scale-95 border-2 relative overflow-hidden",
                  selectedSide === 'face' && status !== 'idle' 
                    ? "bg-slate-200 border-white text-slate-900 shadow-[0_0_40px_rgba(255,255,255,0.2)] scale-105 z-20" 
                    : "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10"
                )}
              >
                <span className="text-xl font-black uppercase italic tracking-tighter relative z-10">Face</span>
                <span className="text-[10px] font-bold opacity-60 relative z-10">x{MULTIPLIER_PER_WIN}</span>
                {selectedSide === 'face' && status === 'flipping' && (
                  <motion.div 
                    animate={{ x: ["-100%", "200%"] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12"
                  />
                )}
              </button>
            </div>
          </Card>

          <div className="space-y-4">
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-3.5 w-3.5 text-primary opacity-40" />
                <span className="text-[10px] font-black uppercase tracking-widest opacity-40">Flux de Série</span>
              </div>
              {streak > 0 && (
                <div className="flex items-center gap-1.5">
                  <Flame className="h-3 w-3 text-orange-500 animate-bounce" />
                  <span className="text-[10px] font-black text-orange-500 uppercase">{streak} VICTOIRES</span>
                </div>
              )}
            </div>
            
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
              {seriesPreview.map((item) => (
                <div 
                  key={item.step} 
                  className={cn(
                    "flex-1 min-w-[80px] p-3 rounded-2xl flex flex-col items-center justify-center gap-1 border transition-all duration-700",
                    streak >= item.step 
                      ? "bg-primary/20 border-primary shadow-[0_0_20px_rgba(var(--primary-rgb),0.2)] scale-105" 
                      : "bg-white/5 border-white/5 opacity-30"
                  )}
                >
                  <span className="text-[8px] font-bold opacity-40">ÉTAPE {item.step}</span>
                  <span className="text-sm font-black tabular-nums">x{item.multiplier}</span>
                </div>
              ))}
            </div>
          </div>

          <AnimatePresence>
            {streak > 0 && status === 'idle' && (
              <motion.div
                initial={{ opacity: 0, y: 40, scale: 0.9, filter: "blur(10px)" }}
                animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
                exit={{ opacity: 0, scale: 0.9, filter: "blur(20px)" }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className="w-full relative"
              >
                <motion.div 
                  animate={{ 
                    scale: [1, 1.05, 1],
                    opacity: [0.3, 0.6, 0.3],
                  }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute inset-0 bg-green-500/20 blur-3xl rounded-[2.5rem] -z-10"
                />

                <Button
                  onClick={handleCashout}
                  disabled={isProcessing}
                  className="w-full h-24 rounded-[2.5rem] bg-green-600 hover:bg-green-500 text-white font-black text-xl uppercase tracking-[0.2em] shadow-[0_20px_60px_-10px_rgba(22,163,74,0.5)] flex flex-col items-center justify-center leading-none gap-2 relative overflow-hidden group"
                >
                  <div className="flex items-center gap-3 relative z-10">
                    {isProcessing ? <Loader2 className="h-6 w-6 animate-spin" /> : <HandCoins className="h-6 w-6 group-hover:scale-110 transition-transform" />}
                    Matérialiser
                  </div>
                  <div className="flex items-baseline gap-2 relative z-10">
                    <span className="text-3xl tabular-nums">{currentWin.toLocaleString()}</span>
                    <span className="text-xs opacity-60 font-black">PTS</span>
                  </div>
                  
                  <motion.div 
                    animate={{ x: ["-100%", "200%"] }}
                    transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12"
                  />
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="p-8 bg-primary/5 rounded-[3rem] border border-primary/10 text-center space-y-3 relative overflow-hidden w-full">
          <ShieldCheck className="h-6 w-6 mx-auto text-primary opacity-10" />
          <p className="text-[11px] leading-relaxed font-medium opacity-40 italic px-4">
            "Le hasard est le seul langage que l'Oracle n'a pas encore traduit. Ressentez le poids du destin entre vos mains."
          </p>
          <div className="absolute -bottom-10 -left-10 h-32 w-32 bg-primary/5 blur-[80px] rounded-full" />
        </div>
      </main>

      <style jsx global>{`
        .perspective-1000 { perspective: 1000px; }
        .preserve-3d { transform-style: preserve-3d; }
        .backface-hidden { backface-visibility: hidden; -webkit-backface-visibility: hidden; }
      `}</style>
    </div>
  );
}
