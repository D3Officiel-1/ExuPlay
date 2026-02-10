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
  Trophy, 
  History, 
  Sparkles, 
  Dices,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Hash
} from "lucide-react";
import { haptic } from "@/lib/haptics";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { triggerLotoDraw, validateLotoWin, getLotoHistory } from "@/app/actions/loto";
import confetti from "canvas-confetti";

/**
 * @fileOverview Arène Exu Loto v1.0.
 * Interface inspirée du Loto Bonheur (LONACI).
 * Cycle de jeu : Sélection (2-5 numéros) -> Tirage cinématique -> Rétribution.
 */

const NUMBERS = Array.from({ length: 90 }, (_, i) => i + 1);
const MIN_BET = 5;

export default function LotoPage() {
  const { user } = useUser();
  const db = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const [selectedNumbers, setSelectedNumbers] = useState<number[]>([]);
  const [betInput, setBetInput] = useState("50");
  const [gameState, setGameState] = useState<'betting' | 'drawing' | 'result'>('betting');
  const [currentDraw, setCurrentDraw] = useState<number[]>([]);
  const [history, setHistory] = useState<number[][]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [winData, setWinData] = useState<{ count: number; amount: number } | null>(null);
  const [revealedCount, setRevealedCount] = useState(0);

  const userDocRef = useMemo(() => (db && user?.uid ? doc(db, "users", user.uid) : null), [db, user?.uid]);
  const { data: profile } = useDoc(userDocRef);

  useEffect(() => {
    const initHistory = async () => {
      const hist = await getLotoHistory(5);
      setHistory(hist);
    };
    initHistory();
  }, []);

  const handleToggleNumber = (num: number) => {
    if (gameState !== 'betting') return;
    haptic.light();
    setSelectedNumbers(prev => {
      if (prev.includes(num)) return prev.filter(n => n !== num);
      if (prev.length >= 5) {
        toast({ title: "Limite atteinte", description: "Vous pouvez choisir maximum 5 numéros." });
        return prev;
      }
      return [...prev, num].sort((a, b) => a - b);
    });
  };

  const handleStartDraw = async () => {
    if (!profile || !userDocRef || isProcessing) return;
    
    if (selectedNumbers.length < 2) {
      haptic.error();
      toast({ variant: "destructive", title: "Sélection insuffisante", description: "Choisissez au moins 2 numéros." });
      return;
    }

    const stake = Math.max(MIN_BET, parseInt(betInput) || 0);
    if ((profile.totalPoints || 0) < stake) {
      haptic.error();
      toast({ variant: "destructive", title: "Lumière insuffisante" });
      return;
    }

    setIsProcessing(true);
    haptic.medium();

    try {
      // 1. Déduction de la mise
      await updateDoc(userDocRef, {
        totalPoints: increment(-stake),
        updatedAt: serverTimestamp()
      });

      // 2. Invoquer le tirage serveur
      const drawResult = await triggerLotoDraw();
      setCurrentDraw(drawResult.numbers);
      setGameState('drawing');
      setRevealedCount(0);

      // 3. Animation cinématique du tirage
      const interval = setInterval(() => {
        setRevealedCount(prev => {
          if (prev >= 5) {
            clearInterval(interval);
            finalizeGame(stake, drawResult.numbers);
            return prev;
          }
          haptic.impact();
          return prev + 1;
        });
      }, 1000);

    } catch (e) {
      setIsProcessing(false);
      toast({ variant: "destructive", title: "Dissonance Système" });
    }
  };

  const finalizeGame = async (stake: number, draw: number[]) => {
    const validation = await validateLotoWin(stake, selectedNumbers, draw);
    setWinData({ count: validation.matchedCount, amount: validation.winAmount });
    setGameState('result');
    setHistory(prev => [draw, ...prev].slice(0, 5));

    if (validation.success) {
      haptic.success();
      confetti({
        particleCount: 200,
        spread: 90,
        origin: { y: 0.6 },
        colors: ['#fbbf24', '#ffffff', '#3b82f6']
      });

      await updateDoc(userDocRef!, {
        totalPoints: increment(validation.winAmount),
        updatedAt: serverTimestamp()
      });
      toast({ 
        title: "Triomphe au Loto !", 
        description: `Vous avez trouvé ${validation.matchedCount} numéros. +${validation.winAmount} PTS.` 
      });
    } else {
      haptic.error();
    }
    setIsProcessing(false);
  };

  const resetGame = () => {
    haptic.light();
    setGameState('betting');
    setSelectedNumbers([]);
    setCurrentDraw([]);
    setWinData(null);
  };

  return (
    <div className="min-h-screen bg-[#020617] text-white flex flex-col pb-32">
      <header className="fixed top-0 left-0 right-0 z-50 p-6 flex items-center justify-between bg-background/5 backdrop-blur-xl border-b border-white/5">
        <Button variant="ghost" size="icon" onClick={() => router.push("/home")} className="rounded-full bg-white/5 border border-white/10">
          <ChevronLeft className="h-6 w-6" />
        </Button>
        <div className="flex flex-col items-center">
          <p className="text-[8px] font-black uppercase tracking-[0.4em] opacity-40">Exu Loto Sacré</p>
          <div className="flex items-center gap-2 px-4 py-1 bg-primary/10 rounded-full border border-primary/20 mt-1">
            <Zap className="h-3 w-3 text-primary" />
            <span className="text-xs font-black tabular-nums">{(profile?.totalPoints || 0).toLocaleString()}</span>
          </div>
        </div>
        <div className="w-10 h-10" />
      </header>

      <main className="flex-1 p-4 pt-28 space-y-8 max-w-lg mx-auto w-full">
        {/* L'ARÈNE DU TIRAGE */}
        <Card className="border-none bg-card/20 backdrop-blur-3xl rounded-[3rem] p-8 border border-white/5 shadow-2xl relative overflow-hidden flex flex-col items-center justify-center min-h-[240px]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.05),transparent_70%)] pointer-events-none" />
          
          <AnimatePresence mode="wait">
            {gameState === 'betting' ? (
              <motion.div key="betting-info" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center space-y-4">
                <div className="flex justify-center -space-x-3">
                  {selectedNumbers.length > 0 ? selectedNumbers.map(n => (
                    <motion.div key={n} layoutId={`ball-${n}`} className="h-12 w-12 rounded-full bg-primary flex items-center justify-center font-black text-lg border-2 border-white/20 shadow-xl">
                      {n}
                    </motion.div>
                  )) : (
                    <div className="h-12 w-12 rounded-full border-2 border-dashed border-white/10 flex items-center justify-center opacity-20">
                      <Hash className="h-5 w-5" />
                    </div>
                  )}
                </div>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">
                  {selectedNumbers.length < 2 ? "Choisissez au moins 2 numéros" : `${selectedNumbers.length} numéros sélectionnés`}
                </p>
              </motion.div>
            ) : (
              <motion.div key="drawing-balls" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-wrap justify-center gap-3">
                {[0, 1, 2, 3, 4].map(idx => {
                  const isRevealed = revealedCount > idx;
                  const num = currentDraw[idx];
                  const isMatched = num && selectedNumbers.includes(num);

                  return (
                    <motion.div
                      key={idx}
                      initial={{ scale: 0, y: 50 }}
                      animate={isRevealed ? { scale: 1, y: 0 } : { scale: 0.8, opacity: 0.1 }}
                      className={cn(
                        "h-14 w-14 rounded-full flex items-center justify-center text-xl font-black border-2 transition-all duration-500 shadow-2xl",
                        isRevealed ? (isMatched ? "bg-green-500 border-green-400 scale-110 shadow-green-500/40" : "bg-white text-black border-gray-300") : "bg-white/5 border-white/10"
                      )}
                    >
                      {isRevealed ? num : "?"}
                    </motion.div>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>

          {gameState === 'result' && (
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="mt-8 text-center space-y-2">
              {winData && winData.amount > 0 ? (
                <div className="space-y-1">
                  <h3 className="text-2xl font-black text-green-500 italic uppercase">Triomphe !</h3>
                  <p className="text-sm font-bold opacity-60">+{winData.amount} PTS de Lumière</p>
                </div>
              ) : (
                <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Le sort a été contraire</p>
              )}
            </motion.div>
          )}
        </Card>

        {/* PANNEAU DE CONTRÔLE */}
        <div className="space-y-6">
          <AnimatePresence mode="wait">
            {gameState === 'betting' ? (
              <motion.div key="controls" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-8">
                <div className="space-y-4">
                  <div className="flex items-center justify-between px-2">
                    <span className="text-[10px] font-black uppercase tracking-widest opacity-40">La Grille des 90</span>
                    <Button variant="ghost" size="sm" onClick={() => setSelectedNumbers([])} className="h-6 text-[8px] font-black uppercase opacity-20 hover:opacity-100">Effacer</Button>
                  </div>
                  <div className="grid grid-cols-9 gap-1.5 p-4 bg-white/5 rounded-[2rem] border border-white/5">
                    {NUMBERS.map(n => {
                      const isSelected = selectedNumbers.includes(n);
                      return (
                        <button
                          key={n}
                          onClick={() => handleToggleNumber(n)}
                          className={cn(
                            "aspect-square rounded-lg flex items-center justify-center text-[10px] font-bold transition-all",
                            isSelected ? "bg-primary text-primary-foreground scale-110 shadow-lg" : "bg-white/5 hover:bg-white/10 opacity-40"
                          )}
                        >
                          {n}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center px-2">
                    <span className="text-[10px] font-black uppercase tracking-widest opacity-40">Mise de Lumière</span>
                    <span className="text-[9px] font-black opacity-20 uppercase">Min: 5 PTS</span>
                  </div>
                  <div className="relative">
                    <Input 
                      type="number" 
                      value={betInput} 
                      onChange={e => setBetInput(e.target.value)}
                      className="h-16 bg-white/5 border-none rounded-2xl text-center font-black text-2xl shadow-inner"
                    />
                    <Zap className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 opacity-20" />
                  </div>
                </div>

                <Button 
                  onClick={handleStartDraw}
                  disabled={isProcessing || selectedNumbers.length < 2}
                  className="w-full h-20 rounded-[2rem] bg-primary text-primary-foreground font-black text-sm uppercase tracking-[0.4em] shadow-2xl shadow-primary/20 relative overflow-hidden group active:scale-95 transition-all"
                >
                  <div className="relative z-10 flex items-center gap-3">
                    {isProcessing ? <Loader2 className="h-5 w-5 animate-spin" /> : <RefreshCw className="h-5 w-5" />}
                    Lancer le Tirage
                  </div>
                  <motion.div 
                    animate={{ x: ["-100%", "200%"] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
                  />
                </Button>
              </motion.div>
            ) : (
              <motion.div key="result-actions" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4">
                <Button onClick={resetGame} className="w-full h-16 rounded-2xl font-black text-[10px] uppercase tracking-[0.4em] shadow-xl">Nouveau Cycle</Button>
                <Button variant="ghost" onClick={() => router.push("/home")} className="w-full h-12 rounded-2xl font-black text-[9px] uppercase tracking-[0.2em] opacity-40">Retour au Hub</Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* HISTORIQUE */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 px-2">
            <History className="h-4 w-4 text-primary opacity-40" />
            <span className="text-[10px] font-black uppercase tracking-widest opacity-40">Derniers Tirages</span>
          </div>
          <div className="space-y-2">
            {history.map((draw, i) => (
              <div key={i} className="p-4 bg-white/5 rounded-2xl border border-white/5 flex justify-center gap-2">
                {draw.map((n, j) => (
                  <span key={j} className="h-8 w-8 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-black opacity-60">{n}</span>
                ))}
              </div>
            ))}
          </div>
        </div>

        <div className="p-8 bg-primary/5 rounded-[3rem] border border-white/5 text-center space-y-3 relative overflow-hidden">
          <Sparkles className="h-6 w-6 mx-auto text-primary opacity-10" />
          <p className="text-[11px] leading-relaxed font-medium opacity-40 italic px-4">
            "L'Oracle a parlé. Votre fortune est écrite dans les sphères de l'éveil."
          </p>
          <div className="absolute -bottom-10 -left-10 h-32 w-32 bg-primary/5 blur-[80px] rounded-full" />
        </div>
      </main>
    </div>
  );
}
