
"use client";

import { useState, useEffect, useMemo } from "react";
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
  Timer,
  Edit3,
  AlertCircle,
  Flag,
  Flame,
  Rocket,
  Activity,
  Sparkles
} from "lucide-react";
import { haptic } from "@/lib/haptics";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { EmojiOracle } from "@/components/EmojiOracle";
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';
import confetti from "canvas-confetti";

const MIN_BET = 5;
const WIN_MULTIPLIER = 4.8; 

interface Car {
  id: number;
  name: string;
  color: string;
  aura: string;
  glow: string;
  emoji: string;
}

const CARS: Car[] = [
  { id: 0, name: "Vitesse Azur", color: "bg-blue-500", aura: "bg-blue-500/20", glow: "shadow-blue-500/50", emoji: "🏎️" },
  { id: 1, name: "Flux Émeraude", color: "bg-green-500", aura: "bg-green-500/20", glow: "shadow-green-500/50", emoji: "🏎️" },
  { id: 2, name: "Éclat Ambre", color: "bg-yellow-500", aura: "bg-yellow-500/20", glow: "shadow-yellow-500/50", emoji: "🚗" },
  { id: 3, name: "Feu Rubis", color: "bg-red-500", aura: "bg-red-500/20", glow: "shadow-red-500/50", emoji: "🏎️" },
  { id: 4, name: "Ombre Améthyste", color: "bg-purple-500", aura: "bg-purple-500/20", glow: "shadow-purple-500/50", emoji: "🏎️" },
];

type GameState = 'betting' | 'starting' | 'racing' | 'finished';

export default function ArcadePage() {
  const { user } = useUser();
  const db = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const [gameState, setGameState] = useState<GameState>('betting');
  const [selectedCar, setSelectedCar] = useState<number | null>(null);
  const [betInput, setBetInput] = useState("50");
  const [isProcessing, setIsProcessing] = useState(false);
  const [carProgress, setCarProgress] = useState<number[]>([0, 0, 0, 0, 0]);
  const [winner, setWinner] = useState<number | null>(null);
  const [countdown, setCountdown] = useState(3);

  const userDocRef = useMemo(() => (db && user?.uid ? doc(db, "users", user.uid) : null), [db, user?.uid]);
  const { data: profile } = useDoc(userDocRef);

  const currentBet = Math.max(MIN_BET, parseInt(betInput) || 0);

  const handleStartRace = () => {
    if (!profile || !userDocRef || !db || isProcessing || selectedCar === null) return;
    
    if (currentBet < MIN_BET) {
      haptic.error();
      toast({ variant: "destructive", title: "Mise invalide", description: `Le minimum est de ${MIN_BET} PTS.` });
      return;
    }

    if ((profile.totalPoints || 0) < currentBet) {
      haptic.error();
      toast({
        variant: "destructive",
        title: "Lumière insuffisante",
        description: `Il vous manque ${currentBet - (profile.totalPoints || 0)} PTS.`
      });
      return;
    }

    setIsProcessing(true);
    haptic.medium();

    const bonusReduction = Math.min(currentBet, profile.bonusBalance || 0);

    updateDoc(userDocRef, {
      totalPoints: increment(-currentBet),
      bonusBalance: increment(-bonusReduction),
      updatedAt: serverTimestamp()
    })
    .then(() => {
      setGameState('starting');
      setWinner(null);
      setCarProgress([0, 0, 0, 0, 0]);
      
      let count = 3;
      setCountdown(count);
      const timer = setInterval(() => {
        count--;
        setCountdown(count);
        haptic.light();
        if (count === 0) {
          clearInterval(timer);
          setGameState('racing');
          haptic.impact();
        }
      }, 1000);
    })
    .catch(async (error) => {
      const permissionError = new FirestorePermissionError({
        path: userDocRef.path,
        operation: 'update',
        requestResourceData: { totalPoints: `decrement ${currentBet}` },
      } satisfies SecurityRuleContext);
      errorEmitter.emit('permission-error', permissionError);
      setIsProcessing(false);
    });
  };

  useEffect(() => {
    if (gameState !== 'racing') return;

    const interval = setInterval(() => {
      setCarProgress(prev => {
        const newProgress = prev.map(p => {
          const boost = Math.random() > 0.9 ? 2.5 : 1;
          const step = (Math.random() * 2.2 + 0.3) * boost;
          return p + step;
        });

        const winnerIdx = newProgress.findIndex(p => p >= 100);
        
        if (winnerIdx !== -1) {
          clearInterval(interval);
          setWinner(winnerIdx);
          setGameState('finished');
          handleFinishRace(winnerIdx);
        }
        return newProgress;
      });
    }, 50);

    return () => clearInterval(interval);
  }, [gameState]);

  const handleFinishRace = (winningIdx: number) => {
    if (!userDocRef || !db || selectedCar === null) return;

    const isWon = winningIdx === selectedCar;
    
    if (isWon) {
      haptic.success();
      const winAmount = Math.floor(currentBet * WIN_MULTIPLIER);
      
      confetti({
        particleCount: 200,
        spread: 90,
        origin: { y: 0.5 },
        colors: ['#3b82f6', '#10b981', '#fbbf24', '#ffffff']
      });

      updateDoc(userDocRef, {
        totalPoints: increment(winAmount),
        updatedAt: serverTimestamp()
      })
      .then(() => {
        toast({ title: "Triomphe au Circuit !", description: `Votre champion @${CARS[winningIdx].name} a gagné. +${winAmount} PTS.` });
      })
      .catch(async (error) => {
        const permissionError = new FirestorePermissionError({
          path: userDocRef.path,
          operation: 'update',
          requestResourceData: { totalPoints: `increment ${winAmount}` },
        } satisfies SecurityRuleContext);
        errorEmitter.emit('permission-error', permissionError);
      });
    } else {
      haptic.error();
      toast({ variant: "destructive", title: "Dissonance", description: "Votre bolide a fini derrière. Le hasard a tranché." });
    }
    
    setIsProcessing(false);
  };

  const handleReset = () => {
    haptic.light();
    setGameState('betting');
    setCarProgress([0, 0, 0, 0, 0]);
    setWinner(null);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col pb-32 overflow-hidden">
      <header className="fixed top-0 left-0 right-0 z-50 p-6 flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={() => router.push("/home")} className="rounded-full bg-card/40 backdrop-blur-xl border border-primary/5">
          <ChevronLeft className="h-6 w-6" />
        </Button>
        <div className="flex flex-col items-center">
          <p className="text-[8px] font-black uppercase tracking-[0.4em] opacity-40">Odyssée Chromatique</p>
          <div className="flex items-center gap-2 px-4 py-1 bg-primary/5 rounded-full border border-primary/5">
            <Zap className="h-3 w-3 text-primary" />
            <span className="text-xs font-black tabular-nums">{profile?.totalPoints?.toLocaleString()} PTS</span>
          </div>
        </div>
        <div className="w-10 h-10" />
      </header>

      <main className="flex-1 p-6 pt-24 space-y-8 max-w-lg mx-auto w-full relative">
        <div className="absolute inset-0 pointer-events-none opacity-20">
          <div className="absolute top-1/4 -left-20 w-64 h-64 bg-primary/10 rounded-full blur-[100px]" />
          <div className="absolute bottom-1/4 -right-20 w-64 h-64 bg-primary/10 rounded-full blur-[100px]" />
        </div>

        <Card className="border-none bg-card/20 backdrop-blur-3xl rounded-[3rem] p-8 shadow-[0_32px_128px_-16px_rgba(0,0,0,0.5)] border border-primary/5 overflow-hidden relative min-h-[440px]">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.02] to-transparent pointer-events-none" />
          
          <div className="space-y-6 relative z-10">
            {CARS.map((car, idx) => (
              <div key={car.id} className="relative">
                <div className="flex justify-between items-center px-4 mb-1.5">
                  <div className="flex items-center gap-2">
                    <div className={cn("h-1.5 w-1.5 rounded-full animate-pulse", car.color)} />
                    <span className="text-[9px] font-black uppercase tracking-widest opacity-40">{car.name}</span>
                  </div>
                  {winner === idx && (
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex items-center gap-1.5">
                      <Trophy className="h-3 w-3 text-yellow-500" />
                      <span className="text-[8px] font-black text-yellow-500 uppercase">Vainqueur</span>
                    </motion.div>
                  )}
                </div>

                <div className="h-12 bg-background/40 rounded-2xl flex items-center relative overflow-hidden px-4 border border-primary/5 shadow-inner group">
                  <div className="absolute inset-0 opacity-10 flex items-center">
                    {[...Array(10)].map((_, i) => (
                      <motion.div 
                        key={i}
                        animate={gameState === 'racing' ? { x: [-100, 800] } : {}}
                        transition={{ duration: Math.random() * 0.5 + 0.5, repeat: Infinity, ease: "linear" }}
                        className="h-[1px] w-8 bg-white absolute"
                        style={{ left: `${i * 15}%`, top: `${Math.random() * 100}%` }}
                      />
                    ))}
                  </div>

                  <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-primary/10 to-transparent flex items-center justify-center opacity-40">
                    <div className="flex flex-col gap-1">
                      <div className="w-1 h-1 bg-white rounded-full" />
                      <div className="w-1 h-1 bg-white rounded-full" />
                      <div className="w-1 h-1 bg-white rounded-full" />
                    </div>
                  </div>

                  <motion.div 
                    initial={{ x: 0 }}
                    animate={{ x: `-${Math.min(carProgress[idx], 100)}%` }}
                    transition={gameState === 'racing' ? { type: "spring", stiffness: 40, damping: 15 } : { duration: 0.8, ease: "easeOut" }}
                    className="absolute right-0 h-full flex items-center px-6"
                    style={{ marginRight: '-60px' }}
                  >
                    <div className="relative">
                      <AnimatePresence>
                        {gameState === 'racing' && (
                          <motion.div 
                            initial={{ opacity: 0, scale: 0 }}
                            animate={{ opacity: 0.6, scale: 1 }}
                            exit={{ opacity: 0, scale: 0 }}
                            className="absolute -right-8 top-1/2 -translate-y-1/2"
                          >
                            <Flame className={cn("h-6 w-6 rotate-90", car.color.replace('bg-', 'text-'))} />
                          </motion.div>
                        )}
                      </AnimatePresence>

                      <motion.div 
                        animate={gameState === 'racing' ? { 
                          scale: [1, 1.1, 1], 
                          rotate: [-1, 1, -1],
                          y: [0, -2, 0] 
                        } : {}}
                        transition={{ duration: 0.15, repeat: Infinity }}
                        className={cn(
                          "h-10 w-14 rounded-xl flex items-center justify-center text-2xl shadow-2xl relative z-10 transition-all duration-500", 
                          car.color, 
                          car.glow,
                          gameState === 'racing' && "brightness-125"
                        )}
                      >
                        <div className="scale-x-[-1] flex items-center justify-center">
                          <EmojiOracle text={car.emoji} forceStatic />
                        </div>
                      </motion.div>
                      
                      <motion.div 
                        animate={gameState === 'racing' ? { scale: [1, 1.5, 1], opacity: [0.3, 0.6, 0.3] } : {}}
                        transition={{ duration: 1, repeat: Infinity }}
                        className={cn("absolute inset-[-100%] blur-3xl rounded-full", car.aura)} 
                      />
                    </div>
                  </motion.div>
                </div>
              </div>
            ))}
          </div>

          <AnimatePresence>
            {gameState === 'starting' && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, filter: "blur(20px)" }}
                className="absolute inset-0 bg-background/80 backdrop-blur-md z-20 flex flex-col items-center justify-center text-center"
              >
                <motion.div
                  key={countdown}
                  initial={{ scale: 0.2, opacity: 0, rotate: -45 }}
                  animate={{ scale: 1.5, opacity: 1, rotate: 0 }}
                  className="relative"
                >
                  <span className="text-9xl font-black italic tracking-tighter text-primary">{countdown}</span>
                  <motion.div 
                    animate={{ scale: [1, 2], opacity: [0.5, 0] }}
                    transition={{ duration: 1 }}
                    className="absolute inset-0 border-4 border-primary rounded-full"
                  />
                </motion.div>
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-12 space-y-2"
                >
                  <p className="text-[10px] font-black uppercase tracking-[0.6em] opacity-40">Synchronisation</p>
                  <p className="text-xs font-bold italic opacity-60">L'éveil s'apprête à jaillir...</p>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>

        <Card className="border-none bg-card/40 backdrop-blur-3xl rounded-[2.5rem] p-8 shadow-2xl border border-primary/5">
          <AnimatePresence mode="wait">
            {gameState === 'betting' ? (
              <motion.div 
                key="betting-ui"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="space-y-10"
              >
                <div className="space-y-6">
                  <div className="flex items-center justify-between px-2">
                    <p className="text-[10px] font-black uppercase tracking-[0.5em] opacity-40">Commandant de Course</p>
                    <Activity className="h-4 w-4 opacity-20 animate-pulse" />
                  </div>
                  <div className="grid grid-cols-5 gap-3">
                    {CARS.map((car) => (
                      <motion.button
                        key={car.id}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => { haptic.light(); setSelectedCar(car.id); }}
                        className={cn(
                          "aspect-square rounded-2xl flex items-center justify-center text-2xl transition-all duration-500 border-2 relative overflow-hidden",
                          selectedCar === car.id 
                            ? "border-primary bg-primary/10 shadow-[0_0_30px_rgba(var(--primary-rgb),0.3)]" 
                            : "border-primary/5 bg-primary/5 opacity-40 grayscale"
                        )}
                      >
                        <EmojiOracle text={car.emoji} forceStatic />
                        {selectedCar === car.id && (
                          <motion.div 
                            layoutId="selection-glow"
                            className="absolute inset-0 bg-primary/5 animate-pulse"
                          />
                        )}
                      </motion.button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between px-2">
                    <div className="flex items-center gap-2">
                      <Zap className="h-3 w-3 text-primary" />
                      <span className="text-[10px] font-black uppercase tracking-widest opacity-40">Mise de Lumière</span>
                    </div>
                    <span className="text-[9px] font-black opacity-20 uppercase">Min: 5 PTS</span>
                  </div>
                  <div className="relative group">
                    <Input 
                      type="number" 
                      value={betInput} 
                      onChange={(e) => setBetInput(e.target.value)} 
                      className="h-16 text-3xl font-black text-center rounded-[1.75rem] bg-primary/5 border-none shadow-inner focus-visible:ring-1 focus-visible:ring-primary/20"
                    />
                    <Edit3 className="absolute right-6 top-1/2 -translate-y-1/2 h-5 w-5 opacity-20 group-hover:opacity-40 transition-opacity" />
                  </div>
                </div>

                <Button 
                  onClick={handleStartRace} 
                  disabled={isProcessing || selectedCar === null}
                  className="w-full h-20 rounded-[2rem] font-black text-[11px] uppercase tracking-[0.4em] shadow-2xl shadow-primary/20 bg-primary text-primary-foreground transition-all duration-500 hover:scale-[1.02] active:scale-95 group overflow-hidden"
                >
                  <div className="relative z-10 flex items-center gap-3">
                    {isProcessing ? <Loader2 className="h-5 w-5 animate-spin" /> : <Rocket className="h-5 w-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />}
                    Lancer la Séquence
                  </div>
                  <motion.div 
                    animate={{ x: ["-100%", "200%"] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
                  />
                </Button>
              </motion.div>
            ) : gameState === 'finished' ? (
              <motion.div 
                key="result-ui"
                initial={{ opacity: 0, scale: 0.9, filter: "blur(10px)" }}
                animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                className="text-center space-y-10 py-4"
              >
                <div className="space-y-6">
                  {winner === selectedCar ? (
                    <div className="space-y-6">
                      <div className="relative inline-block">
                        <div className="h-24 w-24 bg-green-500/10 rounded-[2.5rem] flex items-center justify-center mx-auto border border-green-500/20 shadow-[0_0_50px_rgba(34,197,94,0.3)]">
                          <Trophy className="h-12 w-12 text-green-500" />
                        </div>
                        <motion.div 
                          animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
                          transition={{ duration: 2, repeat: Infinity }}
                          className="absolute inset-0 bg-green-500/20 blur-2xl rounded-full -z-10"
                        />
                      </div>
                      <div className="space-y-2">
                        <h2 className="text-5xl font-black italic uppercase tracking-tighter text-green-500">Triomphe !</h2>
                        <p className="text-sm font-medium opacity-40">Votre champion @{CARS[winner!].name} a régné sur la piste.</p>
                      </div>
                      <div className="p-6 bg-primary/5 rounded-[2rem] border border-primary/5 shadow-inner">
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-30 mb-2">Lumière Acquise</p>
                        <span className="text-4xl font-black text-primary">+{Math.floor(currentBet * WIN_MULTIPLIER)} PTS</span>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="h-24 w-24 bg-destructive/10 rounded-[2.5rem] flex items-center justify-center mx-auto border border-destructive/20 opacity-40">
                        <AlertCircle className="h-12 w-12 text-destructive" />
                      </div>
                      <div className="space-y-2">
                        <h2 className="text-5xl font-black italic uppercase tracking-tighter opacity-40">Dissonance</h2>
                        <p className="text-sm font-medium opacity-40">Le hasard a favorisé l'essence de @{CARS[winner!].name}.</p>
                      </div>
                    </div>
                  )}
                </div>
                <Button onClick={handleReset} className="w-full h-16 rounded-[1.75rem] font-black text-[10px] uppercase tracking-[0.4em] shadow-xl">Réinitialiser le Flux</Button>
              </motion.div>
            ) : (
              <div className="py-16 flex flex-col items-center justify-center gap-8">
                <div className="relative">
                  <div className="h-24 w-24 bg-primary/5 rounded-full flex items-center justify-center border border-primary/10">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    >
                      <Sparkles className="h-10 w-10 text-primary opacity-40" />
                    </motion.div>
                  </div>
                  <motion.div 
                    animate={{ rotate: -360, scale: [1, 1.1, 1] }}
                    transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-[-12px] border-2 border-dashed border-primary/20 rounded-full"
                  />
                </div>
                <div className="text-center space-y-2">
                  <p className="text-[11px] font-black uppercase tracking-[0.6em] text-primary animate-pulse">Course en Cours</p>
                  <p className="text-[9px] font-bold opacity-30 uppercase tracking-widest">Le destin est en mutation...</p>
                </div>
              </div>
            )}
          </AnimatePresence>
        </Card>

        <div className="p-8 bg-primary/5 rounded-[3rem] border border-primary/5 text-center space-y-3 relative overflow-hidden w-full">
          <div className="flex justify-center gap-4 mb-2">
            <Rocket className="h-4 w-4 opacity-10" />
            <Flag className="h-4 w-4 opacity-10" />
            <Sparkles className="h-4 w-4 opacity-10" />
          </div>
          <p className="text-[11px] leading-relaxed font-medium opacity-40 italic px-4">
            "Le hasard est la seule loi que l'Oracle ne dicte pas. Prédisez l'imprévisible, maîtrisez le flux."
          </p>
          <div className="absolute -bottom-10 -right-10 h-32 w-32 bg-primary/5 blur-[80px] rounded-full" />
        </div>
      </main>
    </div>
  );
}
