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
  Settings2,
  Edit3,
  RotateCcw,
  Coins,
  ArrowRight,
  HandCoins,
  ShieldCheck,
  Sparkles
} from "lucide-react";
import { haptic } from "@/lib/haptics";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { EmojiOracle } from "@/components/EmojiOracle";
import confetti from "canvas-confetti";

/**
 * @fileOverview Coinflip de l'Éveil v1.0.
 * Jeu de pile ou face avec mécanique de série et multiplicateurs cumulés.
 */

const MIN_BET = 5;
const MULTIPLIER_PER_WIN = 1.88;

type Side = 'pile' | 'face';
type GameStatus = 'idle' | 'flipping' | 'result';

export default function CoinFlipPage() {
  const { user } = useUser();
  const db = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const [betInput, setBetInput] = useState("100");
  const [status, setStatus] = useState<GameStatus>('idle');
  const [streak, setStreak] = useState(0);
  const [isSeriesMode, setIsSeriesMode] = useState(true);
  const [lastResult, setLastResult] = useState<Side | null>(null);
  const [selectedSide, setSelectedSide] = useState<Side | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentWin, setCurrentWin] = useState(0);

  const userDocRef = useMemo(() => (db && user?.uid ? doc(db, "users", user.uid) : null), [db, user?.uid]);
  const { data: profile } = useDoc(userDocRef);

  const currentBet = Math.max(MIN_BET, parseInt(betInput) || 0);

  // Calcul des multiplicateurs de série
  const multipliers = useMemo(() => {
    return [1, 2, 3, 4].map(step => (Math.pow(MULTIPLIER_PER_WIN, step)).toFixed(2));
  }, []);

  const handleFlip = async (side: Side) => {
    if (!profile || !userDocRef || isProcessing || status === 'flipping') return;

    // Si on n'est pas en série ou si c'est le premier flip de la série
    if (streak === 0) {
      if (currentBet < MIN_BET) {
        haptic.error();
        toast({ variant: "destructive", title: "Mise invalide", description: `Le minimum est de ${MIN_BET} PTS.` });
        return;
      }

      if ((profile.totalPoints || 0) < currentBet) {
        haptic.error();
        toast({ variant: "destructive", title: "Lumière insuffisante", description: "Accumulez plus d'énergie." });
        return;
      }

      setIsProcessing(true);
      try {
        await updateDoc(userDocRef, { totalPoints: increment(-currentBet), updatedAt: serverTimestamp() });
      } catch (e) {
        setIsProcessing(false);
        return;
      }
    }

    haptic.medium();
    setSelectedSide(side);
    setStatus('flipping');

    // Simulation de la pièce
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

        if (!isSeriesMode) {
          // Si pas de mode série, on cashout auto
          handleCashout(winAmount);
        }
      } else {
        haptic.error();
        setStreak(0);
        setCurrentWin(0);
        setIsProcessing(false);
        setTimeout(() => setStatus('idle'), 2000);
      }
    }, 1500);
  };

  const handleCashout = async (amountOverride?: number) => {
    const finalAmount = amountOverride || currentWin;
    if (!userDocRef || finalAmount <= 0 || isProcessing) return;

    setIsProcessing(true);
    haptic.impact();

    try {
      await updateDoc(userDocRef, {
        totalPoints: increment(finalAmount),
        updatedAt: serverTimestamp()
      });

      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#fbbf24', '#ffffff', '#3b82f6']
      });

      toast({ title: "Lumière Matérialisée", description: `+${finalAmount} PTS ajoutés à votre essence.` });
      setStreak(0);
      setCurrentWin(0);
      setStatus('idle');
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
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col pb-32">
      <header className="fixed top-0 left-0 right-0 z-50 p-6 flex items-center justify-between bg-background/5 backdrop-blur-xl border-b border-white/5">
        <Button variant="ghost" size="icon" onClick={() => router.push("/home")} className="rounded-full bg-white/5 border border-white/10">
          <ChevronLeft className="h-6 w-6" />
        </Button>
        <div className="flex flex-col items-center">
          <p className="text-[8px] font-black uppercase tracking-[0.4em] opacity-40">CoinFlip de l'Éveil</p>
          <div className="flex items-center gap-2 px-4 py-1 bg-primary/10 rounded-full border border-primary/20">
            <Zap className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-black tabular-nums">{(profile?.totalPoints || 0).toLocaleString()}</span>
          </div>
        </div>
        <div className="w-10 h-10" />
      </header>

      <main className="flex-1 p-6 pt-28 flex flex-col items-center gap-12 max-w-lg mx-auto w-full">
        
        {/* LA PIÈCE (COIN) */}
        <div className="relative h-64 w-64 flex items-center justify-center">
          <div className="absolute inset-0 bg-primary/5 blur-[100px] rounded-full animate-pulse" />
          
          <motion.div
            animate={status === 'flipping' ? {
              rotateY: [0, 1800],
              y: [0, -150, 0],
              scale: [1, 1.2, 1]
            } : {
              rotateY: lastResult === 'face' ? 180 : 0,
              y: [0, -5, 0]
            }}
            transition={status === 'flipping' ? {
              duration: 1.5,
              ease: "easeInOut"
            } : {
              y: { duration: 4, repeat: Infinity, ease: "easeInOut" },
              rotateY: { duration: 0.5 }
            }}
            className="relative w-48 h-48 preserve-3d cursor-default"
            style={{ transformStyle: 'preserve-3d' }}
          >
            {/* Face Pile (Yellow/Gold) */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-yellow-300 via-yellow-500 to-yellow-700 border-4 border-yellow-200/30 flex flex-col items-center justify-center shadow-[0_0_50px_rgba(234,179,8,0.4)] backface-hidden">
              <span className="text-5xl font-black text-yellow-900/40 italic">PILE</span>
              <Coins className="h-12 w-12 text-yellow-900/20 mt-2" />
            </div>
            
            {/* Face Face (Blue/Silver) */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-slate-200 via-slate-400 to-slate-600 border-4 border-white/30 flex flex-col items-center justify-center shadow-[0_0_50px_rgba(255,255,255,0.2)] backface-hidden" style={{ transform: 'rotateY(180deg)' }}>
              <span className="text-5xl font-black text-slate-900/40 italic">FACE</span>
              <Coins className="h-12 w-12 text-slate-900/20 mt-2" />
            </div>
          </motion.div>

          {/* Grille de fond éthérée */}
          <div className="absolute inset-[-40px] opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
        </div>

        {/* PANNEAU DE CONTRÔLE */}
        <div className="w-full space-y-6">
          <Card className="border-none bg-card/40 backdrop-blur-3xl rounded-[2.5rem] p-6 border border-white/5 shadow-2xl space-y-6">
            
            {/* MISE & ACTIONS RAPIDES */}
            <div className="space-y-3">
              <div className="flex bg-black/40 rounded-2xl p-1.5 border border-white/5">
                <Input 
                  type="number" 
                  value={betInput} 
                  onChange={e => setBetInput(e.target.value)}
                  disabled={streak > 0}
                  className="flex-1 h-12 bg-transparent border-none text-xl font-black text-center focus-visible:ring-0"
                />
                <div className="flex gap-1">
                  <button onClick={() => adjustBet('minus')} className="h-12 w-12 rounded-xl hover:bg-white/5 transition-colors opacity-40">-</button>
                  <button onClick={() => adjustBet('plus')} className="h-12 w-12 rounded-xl hover:bg-white/5 transition-colors opacity-40">+</button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" onClick={() => adjustBet('half')} disabled={streak > 0} className="h-12 rounded-xl bg-white/5 border-white/10 font-bold">/2</Button>
                <Button variant="outline" onClick={() => adjustBet('double')} disabled={streak > 0} className="h-12 rounded-xl bg-white/5 border-white/10 font-bold">x2</Button>
              </div>
            </div>

            {/* BOUTONS DE CHOIX */}
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => handleFlip('pile')}
                disabled={status === 'flipping' || isProcessing}
                className={cn(
                  "h-20 rounded-[1.75rem] flex flex-col items-center justify-center gap-1 transition-all duration-500 active:scale-95 border-2",
                  selectedSide === 'pile' && status !== 'idle' ? "bg-yellow-500 border-yellow-400 text-yellow-950 shadow-[0_0_30px_rgba(234,179,8,0.3)]" : "bg-yellow-500/10 border-yellow-500/20 text-yellow-500 hover:bg-yellow-500/20"
                )}
              >
                <span className="text-lg font-black uppercase italic tracking-tighter">Pile</span>
                <span className="text-[10px] font-bold opacity-60">x{MULTIPLIER_PER_WIN}</span>
              </button>

              <button
                onClick={() => handleFlip('face')}
                disabled={status === 'flipping' || isProcessing}
                className={cn(
                  "h-20 rounded-[1.75rem] flex flex-col items-center justify-center gap-1 transition-all duration-500 active:scale-95 border-2",
                  selectedSide === 'face' && status !== 'idle' ? "bg-slate-200 border-white text-slate-900 shadow-[0_0_30px_rgba(255,255,255,0.2)]" : "bg-slate-500/10 border-slate-500/20 text-slate-300 hover:bg-slate-500/20"
                )}
              >
                <span className="text-lg font-black uppercase italic tracking-tighter">Face</span>
                <span className="text-[10px] font-bold opacity-60">x{MULTIPLIER_PER_WIN}</span>
              </button>
            </div>
          </Card>

          {/* INDICATEURS DE SÉRIE */}
          <div className="flex items-center justify-between px-2">
            <div className="flex gap-2">
              {multipliers.map((m, i) => (
                <div key={i} className={cn(
                  "px-3 py-2 rounded-xl text-[10px] font-black border transition-all duration-500",
                  streak > i ? "bg-primary/20 border-primary text-primary" : "bg-white/5 border-transparent opacity-20"
                )}>
                  x{m}
                </div>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-black uppercase tracking-widest opacity-40 italic">Série</span>
              <button 
                onClick={() => { haptic.light(); setIsSeriesMode(!isSeriesMode); }}
                className={cn("w-12 h-6 rounded-full transition-colors relative", isSeriesMode ? "bg-primary" : "bg-white/10")}
              >
                <motion.div 
                  animate={{ x: isSeriesMode ? 24 : 4 }}
                  className="absolute top-1 h-4 w-4 bg-white rounded-full shadow-sm"
                />
              </button>
            </div>
          </div>

          {/* BOUTON RETIRER (CASHOUT) */}
          <AnimatePresence>
            {streak > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
              >
                <Button
                  onClick={() => handleCashout()}
                  disabled={isProcessing}
                  className="w-full h-20 rounded-[2rem] bg-green-600 hover:bg-green-700 text-white font-black text-lg uppercase tracking-[0.2em] shadow-2xl shadow-green-600/20 flex flex-col leading-none gap-1"
                >
                  <div className="flex items-center gap-2">
                    <HandCoins className="h-5 w-5" />
                    Retirer
                  </div>
                  <span className="text-2xl tabular-nums">{currentWin.toLocaleString()} <span className="text-xs opacity-60">PTS</span></span>
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="p-8 bg-primary/5 rounded-[2.5rem] border border-primary/10 text-center space-y-3 relative overflow-hidden">
          <p className="text-[10px] leading-relaxed font-medium opacity-40 italic">
            "Chaque face est une vérité, chaque pile est un choix. L'équilibre est dans votre main."
          </p>
        </div>
      </main>

      <style jsx global>{`
        .preserve-3d { transform-style: preserve-3d; }
        .backface-hidden { backface-visibility: hidden; -webkit-backface-visibility: hidden; }
      `}</style>
    </div>
  );
}
