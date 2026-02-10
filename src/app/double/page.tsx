
"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence, useAnimation } from "framer-motion";
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
  Target,
  ShieldCheck,
  Timer,
  Plus,
  Coins,
  ArrowRight
} from "lucide-react";
import { haptic } from "@/lib/haptics";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { EmojiOracle } from "@/components/EmojiOracle";
import confetti from "canvas-confetti";

/**
 * @fileOverview Double de l'Éveil v1.0.
 * Une arène de roulette horizontale inspirée de Blaze/1win Double.
 * Rouge (x2), Vert (x2), Bleu (x14).
 */

type ColorType = 'red' | 'green' | 'blue';
type GamePhase = 'betting' | 'spinning' | 'result';

const TILE_WIDTH = 100;
const TILES_COUNT = 15; // 0 à 14
const TOTAL_TILES_STRIP = 100; // Pour simuler l'infini

// Distribution : 0 = Bleu, 1-7 = Rouge, 8-14 = Vert
const getTileColor = (n: number): ColorType => {
  if (n === 0) return 'blue';
  return n <= 7 ? 'red' : 'green';
};

const CHIPS = [10, 50, 100, 500, 1000, 5000];

export default function DoublePage() {
  const { user } = useUser();
  const db = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  // États du Jeu
  const [phase, setPhase] = useState<GamePhase>('betting');
  const [timeLeft, setTimeLeft] = useState(15);
  const [betAmount, setBetAmount] = useState<number>(100);
  const [selectedColor, setSelectedColor] = useState<ColorType | null>(null);
  const [history, setHistory] = useState<ColorType[]>(['red', 'green', 'red', 'blue', 'green']);
  const [isProcessing, setIsProcessing] = useState(false);
  const [winAmount, setWinAmount] = useState<number | null>(null);
  
  // Animation de la roue
  const controls = useAnimation();
  const containerRef = useRef<HTMLDivElement>(null);

  const userDocRef = useMemo(() => (db && user?.uid ? doc(db, "users", user.uid) : null), [db, user?.uid]);
  const { data: profile } = useDoc(userDocRef);

  // --- LOGIQUE DU CYCLE DE JEU ---
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (phase === 'betting') {
      if (timeLeft > 0) {
        timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
      } else {
        startSpin();
      }
    }
    return () => clearInterval(timer);
  }, [phase, timeLeft]);

  const startSpin = async () => {
    setPhase('spinning');
    haptic.medium();

    // Déterminer le résultat (0-14)
    // Probabilités : 1/15 Bleu, 7/15 Rouge, 7/15 Vert
    const resultNumber = Math.floor(Math.random() * 15);
    const resultColor = getTileColor(resultNumber);

    // Calcul de la position finale
    // On veut que le resultNumber s'arrête au milieu du conteneur
    // On spin de plusieurs tours (ex: 5 tours)
    const containerWidth = containerRef.current?.offsetWidth || 0;
    const centerOffset = containerWidth / 2 - TILE_WIDTH / 2;
    
    // On décale de 80 tuiles pour être sûr d'avoir de l'élan
    const targetTileIndex = 80 + resultNumber;
    const finalX = -(targetTileIndex * TILE_WIDTH) + centerOffset;

    await controls.start({
      x: finalX,
      transition: { duration: 5, ease: [0.15, 0, 0.15, 1] }
    });

    setPhase('result');
    setHistory(prev => [resultColor, ...prev].slice(0, 15));
    
    // Vérifier les gains
    if (selectedColor === resultColor) {
      const multiplier = resultColor === 'blue' ? 14 : 2;
      const win = betAmount * multiplier;
      setWinAmount(win);
      haptic.success();
      confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
      
      if (userDocRef) {
        await updateDoc(userDocRef, {
          totalPoints: increment(win),
          updatedAt: serverTimestamp()
        });
      }
    } else if (selectedColor) {
      haptic.error();
    }

    // Attendre 3s puis réinitialiser
    setTimeout(() => {
      resetBoard();
    }, 4000);
  };

  const resetBoard = () => {
    setPhase('betting');
    setTimeLeft(15);
    setWinAmount(null);
    setSelectedColor(null);
    controls.set({ x: 0 }); // Reset visuel immédiat
  };

  const handlePlaceBet = async (color: ColorType) => {
    if (phase !== 'betting' || isProcessing || !profile || !userDocRef) return;
    
    if (betAmount < 5) {
      toast({ variant: "destructive", title: "Mise minimale : 5 PTS" });
      return;
    }

    if (profile.totalPoints < betAmount) {
      toast({ variant: "destructive", title: "Lumière insuffisante" });
      return;
    }

    setIsProcessing(true);
    haptic.light();

    try {
      await updateDoc(userDocRef, {
        totalPoints: increment(-betAmount),
        updatedAt: serverTimestamp()
      });
      setSelectedColor(color);
      toast({ title: "Pacte Scellé", description: `Vous avez misé sur le ${color === 'blue' ? 'Bleu' : color === 'red' ? 'Rouge' : 'Vert'}.` });
    } catch (e) {
      toast({ variant: "destructive", title: "Dissonance Système" });
    } finally {
      setIsProcessing(false);
    }
  };

  // Génération de la bande de tuiles
  const tilesStrip = useMemo(() => {
    const tiles = [];
    for (let i = 0; i < TOTAL_TILES_STRIP; i++) {
      const num = i % 15;
      tiles.push({ num, color: getTileColor(num) });
    }
    return tiles;
  }, []);

  return (
    <div className="min-h-screen bg-[#020617] text-white flex flex-col pb-32">
      <header className="fixed top-0 left-0 right-0 z-50 p-6 flex items-center justify-between bg-background/5 backdrop-blur-xl border-b border-white/5">
        <Button variant="ghost" size="icon" onClick={() => router.push("/home")} className="rounded-full bg-white/5 border border-white/10">
          <ChevronLeft className="h-6 w-6" />
        </Button>
        <div className="flex flex-col items-center">
          <p className="text-[8px] font-black uppercase tracking-[0.4em] opacity-40">Arène du Double</p>
          <div className="flex items-center gap-2 px-4 py-1.5 bg-primary/10 rounded-full border border-primary/20 mt-1">
            <Zap className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-black tabular-nums">{(profile?.totalPoints || 0).toLocaleString()}</span>
          </div>
        </div>
        <div className="w-10 h-10" />
      </header>

      <main className="flex-1 flex flex-col lg:grid lg:grid-cols-[380px_1fr] pt-24 px-4 sm:px-8 gap-8 max-w-7xl mx-auto w-full">
        
        {/* PANEL DE COMMANDE (GAUCHE) */}
        <aside className="space-y-6">
          <Card className="border-none bg-card/20 backdrop-blur-3xl rounded-[2.5rem] p-8 border border-white/5 shadow-2xl space-y-8">
            <div className="space-y-4">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40 text-center">Pari Total</p>
              
              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: 'red', label: 'x2', color: 'bg-red-600', hover: 'hover:bg-red-500' },
                  { id: 'blue', label: 'x14', color: 'bg-blue-600', hover: 'hover:bg-blue-500' },
                  { id: 'green', label: 'x2', color: 'bg-green-600', hover: 'hover:bg-green-500' }
                ].map((btn) => (
                  <button
                    key={btn.id}
                    disabled={phase !== 'betting' || isProcessing || !!selectedColor}
                    onClick={() => handlePlaceBet(btn.id as ColorType)}
                    className={cn(
                      "aspect-square rounded-2xl flex flex-col items-center justify-center gap-1 transition-all duration-500 border-2 shadow-lg group relative overflow-hidden",
                      btn.color,
                      selectedColor === btn.id ? "border-white scale-105 shadow-white/20" : "border-transparent opacity-80 hover:opacity-100",
                      (phase !== 'betting' || !!selectedColor) && selectedColor !== btn.id && "opacity-20 grayscale"
                    )}
                  >
                    <span className="text-2xl font-black italic">{btn.label}</span>
                    {selectedColor === btn.id && (
                      <motion.div layoutId="active-selection" className="absolute inset-0 border-4 border-white/30 rounded-2xl animate-pulse" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center px-2">
                <span className="text-[10px] font-black uppercase tracking-widest opacity-40">Mise de Lumière</span>
                <span className="text-[10px] font-black opacity-20">MIN: 5 PTS</span>
              </div>
              <div className="relative">
                <Input 
                  type="number" 
                  value={betAmount} 
                  onChange={e => setBetAmount(Math.max(0, parseInt(e.target.value) || 0))}
                  disabled={phase !== 'betting' || !!selectedColor}
                  className="h-16 bg-black/40 border-none rounded-[1.5rem] text-center font-black text-2xl shadow-inner"
                />
                <Zap className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 opacity-20" />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <button onClick={() => setBetAmount(prev => Math.floor(prev / 2))} disabled={phase !== 'betting' || !!selectedColor} className="h-10 rounded-xl bg-white/5 border border-white/5 text-[9px] font-black uppercase hover:bg-white/10">MOITIÉ</button>
                <button onClick={() => setBetAmount(prev => prev * 2)} disabled={phase !== 'betting' || !!selectedColor} className="h-10 rounded-xl bg-white/5 border border-white/5 text-[9px] font-black uppercase hover:bg-white/10">DOUBLE</button>
                <button onClick={() => setBetAmount(profile?.totalPoints || 0)} disabled={phase !== 'betting' || !!selectedColor} className="h-10 rounded-xl bg-white/5 border border-white/5 text-[9px] font-black uppercase hover:bg-white/10">MAX</button>
              </div>
            </div>

            <div className="flex flex-wrap justify-center gap-2">
              {CHIPS.map(val => (
                <button 
                  key={val} 
                  onClick={() => setBetAmount(prev => prev + val)}
                  disabled={phase !== 'betting' || !!selectedColor}
                  className="h-12 w-12 rounded-full border-2 border-dashed border-white/10 flex items-center justify-center text-[10px] font-black hover:border-primary/40 hover:bg-primary/5 transition-all"
                >
                  {val >= 1000 ? `${val/1000}K` : val}
                </button>
              ))}
            </div>

            <Button 
              variant="outline" 
              onClick={resetBoard} 
              disabled={phase !== 'result'}
              className="w-full h-14 rounded-2xl font-black text-[10px] uppercase tracking-[0.3em] opacity-40 hover:opacity-100"
            >
              Réinitialiser le Flux
            </Button>
          </Card>
        </aside>

        {/* ZONE DE JEU (DROITE) */}
        <div className="flex flex-col gap-8">
          {/* HISTORIQUE */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-2">
            <History className="h-4 w-4 opacity-20 shrink-0" />
            {history.map((color, i) => (
              <motion.div 
                key={i} 
                initial={{ scale: 0, x: 20 }}
                animate={{ scale: 1, x: 0 }}
                className={cn(
                  "h-6 px-3 rounded-full text-[9px] font-black uppercase flex items-center justify-center shrink-0 border border-white/10 shadow-lg",
                  color === 'red' ? 'bg-red-600' : color === 'green' ? 'bg-green-600' : 'bg-blue-600 text-white'
                )}
              >
                {color === 'blue' ? 'x14' : 'x2'}
              </motion.div>
            ))}
          </div>

          {/* LA ROUE */}
          <div className="relative">
            {/* Indicateurs fixes (Triangles) */}
            <div className="absolute left-1/2 -top-2 -translate-x-1/2 z-30 w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-[15px] border-t-white shadow-[0_0_10px_white]" />
            <div className="absolute left-1/2 -bottom-2 -translate-x-1/2 z-30 w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-b-[15px] border-b-white shadow-[0_0_10px_white]" />

            <div className="relative h-48 bg-card/20 backdrop-blur-3xl rounded-[3rem] border border-white/10 shadow-[inset_0_0_40px_rgba(0,0,0,0.5)] overflow-hidden">
              <motion.div 
                ref={containerRef}
                animate={controls}
                className="flex absolute left-0 top-0 bottom-0 py-4"
                style={{ width: TOTAL_TILES_STRIP * TILE_WIDTH }}
              >
                {tilesStrip.map((tile, i) => (
                  <div 
                    key={i} 
                    style={{ width: TILE_WIDTH }}
                    className={cn(
                      "h-full px-1.5 transition-opacity duration-500",
                      phase === 'spinning' && "opacity-80"
                    )}
                  >
                    <div className={cn(
                      "w-full h-full rounded-2xl flex flex-col items-center justify-center gap-2 border-2 border-white/5 relative group",
                      tile.color === 'red' ? 'bg-red-600' : tile.color === 'green' ? 'bg-green-600' : 'bg-blue-600'
                    )}>
                      <div className="h-12 w-12 rounded-full bg-white/10 flex items-center justify-center border border-white/10 shadow-inner">
                        <span className="text-[10px] font-black text-white/40">1W</span>
                      </div>
                      {tile.color === 'blue' && <Zap className="h-4 w-4 text-white animate-pulse" />}
                    </div>
                  </div>
                ))}
              </motion.div>

              {/* Effet de fondu sur les côtés */}
              <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-[#020617] to-transparent z-20 pointer-events-none" />
              <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-[#020617] to-transparent z-20 pointer-events-none" />
            </div>
          </div>

          {/* ÉCRAN DE PHASE */}
          <div className="flex-1 flex flex-col items-center justify-center py-12 text-center">
            <AnimatePresence mode="wait">
              {phase === 'betting' ? (
                <motion.div 
                  key="betting"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.1 }}
                  className="space-y-6"
                >
                  <div className="relative inline-block">
                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 10, repeat: Infinity, ease: "linear" }} className="absolute inset-[-20px] border border-dashed border-primary/20 rounded-full" />
                    <div className="h-24 w-24 bg-card/40 backdrop-blur-3xl rounded-[2rem] flex items-center justify-center border border-primary/10 shadow-2xl">
                      <span className="text-4xl font-black italic text-primary">{timeLeft}</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[11px] font-black uppercase tracking-[0.6em] text-primary/60">Phase de Mise</p>
                    <p className="text-[9px] font-bold opacity-30 uppercase">L'Oracle attend votre pacte...</p>
                  </div>
                </motion.div>
              ) : phase === 'spinning' ? (
                <motion.div 
                  key="spinning"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-6"
                >
                  <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 1, repeat: Infinity }} className="h-24 w-24 mx-auto flex items-center justify-center">
                    <TrendingUp className="h-16 w-16 text-primary opacity-20" />
                  </motion.div>
                  <p className="text-[11px] font-black uppercase tracking-[0.6em] text-primary animate-pulse">Rotation du Destin</p>
                </motion.div>
              ) : (
                <motion.div 
                  key="result"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-8"
                >
                  {winAmount ? (
                    <div className="space-y-6">
                      <div className="h-24 w-24 bg-green-500/10 rounded-[2.5rem] flex items-center justify-center mx-auto border border-green-500/20 shadow-[0_0_50px_rgba(34,197,94,0.3)]">
                        <TrendingUp className="h-12 w-12 text-green-500" />
                      </div>
                      <div className="space-y-2">
                        <h2 className="text-5xl font-black italic uppercase tracking-tighter text-green-500">Triomphe !</h2>
                        <p className="text-3xl font-black">+{winAmount} <span className="text-xs opacity-40">PTS</span></p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="h-24 w-24 bg-red-500/10 rounded-[2.5rem] flex items-center justify-center mx-auto border border-red-500/20 opacity-40">
                        <Target className="h-12 w-12 text-red-500" />
                      </div>
                      <h2 className="text-5xl font-black italic uppercase tracking-tighter opacity-40">Stase</h2>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>

      <div className="p-10 bg-primary/5 rounded-[3rem] border border-primary/5 text-center space-y-3 relative overflow-hidden max-w-lg mx-auto w-full mt-8">
        <p className="text-[11px] leading-relaxed font-medium opacity-40 italic">
          "Le destin tourne sur lui-même. Chaque couleur est une porte, chaque tour est un nouvel éveil."
        </p>
      </div>
    </div>
  );
}
