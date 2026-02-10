
"use client";

import { useState, useMemo } from "react";
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
  Edit3, 
  Crosshair, 
  Hand,
  Sparkles,
  AlertTriangle
} from "lucide-react";
import { haptic } from "@/lib/haptics";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import confetti from "canvas-confetti";
import Image from "next/image";
import placeholderImages from "@/app/lib/placeholder-images.json";

const MIN_BET = 5;
const BET_PRESETS = [5, 50, 100, 200];
const DIRECTIONS = [
  "En haut à gauche", "En haut", "En haut à droite",
  "À gauche", "Centre", "À droite",
  "En bas à gauche", "En bas", "En bas à droite"
] as const;

type Direction = typeof DIRECTIONS[number];

function GlovesKeeper({ 
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
    <div className="relative w-24 h-16 sm:w-32 sm:h-24 flex items-center justify-center gap-2 sm:gap-4">
      <motion.div 
        animate={{ 
          scale: isIdle ? [1, 1.05, 1] : 1.1, 
          opacity: isIdle ? [0.4, 0.6, 0.4] : 0.8 
        }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        className={cn(
          "absolute inset-0 rounded-full blur-3xl -z-10 transition-colors duration-500", 
          isResult && isScored ? "bg-red-500/20" : isResult && !isScored ? "bg-green-500/20" : "bg-white/10"
        )}
      />
      
      {/* Gant Gauche */}
      <motion.div 
        animate={isIdle ? { y: [0, -3, 0], x: [0, -2, 0], rotate: [-5, -8, -5] } : {}}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        className="relative"
      >
        <div className="w-10 h-12 sm:w-12 sm:h-14 bg-white rounded-lg sm:rounded-xl shadow-2xl flex items-center justify-center border-b-2 sm:border-b-4 border-gray-300">
          <Hand className="h-6 w-6 sm:h-8 sm:w-8 text-primary/40 -scale-x-100" />
        </div>
      </motion.div>

      {/* Gant Droit */}
      <motion.div 
        animate={isIdle ? { y: [0, -3, 0], x: [0, 2, 0], rotate: [5, 8, 5] } : {}}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}
        className="relative"
      >
        <div className="w-10 h-12 sm:w-12 sm:h-14 bg-white rounded-lg sm:rounded-xl shadow-2xl flex items-center justify-center border-b-2 sm:border-b-4 border-gray-300">
          <Hand className="h-6 w-6 sm:h-8 sm:w-8 text-primary/40" />
        </div>
      </motion.div>
    </div>
  );
}

export default function PenaltiesPage() {
  const { user } = useUser();
  const db = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const [betInput, setBetInput] = useState("50");
  const [gameState, setGameState] = useState<'idle' | 'shooting' | 'result'>('idle');
  const [playerChoice, setPlayerChoice] = useState<Direction | null>(null);
  const [keeperChoice, setKeeperChoice] = useState<Direction | null>(null);
  const [isScored, setIsScored] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [hoveredTarget, setHoveredTarget] = useState<Direction | null>(null);

  const userDocRef = useMemo(() => (db && user?.uid ? doc(db, "users", user.uid) : null), [db, user?.uid]);
  const { data: profile } = useDoc(userDocRef);

  const civFlag = placeholderImages.placeholderImages.find(img => img.id === "flag-civ")?.imageUrl;

  const currentBet = Math.max(MIN_BET, parseInt(betInput) || 0);

  const handleShoot = async (direction: Direction) => {
    if (!profile || !userDocRef || gameState !== 'idle') return;
    
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

    setLoading(true);
    setPlayerChoice(direction);
    haptic.medium();

    const roll = Math.random();
    let keeperDir: Direction;
    let scored: boolean;

    if (roll < 0.50) {
      keeperDir = direction;
      scored = false;
    } else {
      const otherDirections = DIRECTIONS.filter(d => d !== direction);
      keeperDir = otherDirections[Math.floor(Math.random() * otherDirections.length)];
      scored = true;
    }
    
    setKeeperChoice(keeperDir);
    setIsScored(scored);
    setGameState('shooting');

    try {
      await updateDoc(userDocRef, {
        totalPoints: increment(-currentBet),
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
          await updateDoc(userDocRef, { 
            totalPoints: increment(currentBet * 2), 
            updatedAt: serverTimestamp() 
          });
        } else {
          haptic.error();
        }
        setLoading(false);
      }, 1000);
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
    idle: { 
      top: "88%", 
      left: "50%", 
      scale: 1, 
      filter: "blur(0px)", 
      rotate: 0,
      translateX: "-50%" 
    },
    shooting: (direction: Direction) => {
      // Coordonnées cibles précises en % du stade (container aspect 4/5)
      // La cage occupe x: 7.5% -> 92.5% et y: 18% -> 60.5% (approx)
      const xMap: Record<Direction, string> = { 
        "En haut à gauche": "22%", "En haut": "50%", "En haut à droite": "78%", 
        "À gauche": "22%", "Centre": "50%", "À droite": "78%", 
        "En bas à gauche": "22%", "En bas": "50%", "En bas à droite": "78%" 
      };
      const yMap: Record<Direction, string> = { 
        "En haut à gauche": "25%", "En haut": "25%", "En haut à droite": "25%", 
        "À gauche": "39%", "Centre": "39%", "À droite": "39%", 
        "En bas à gauche": "53%", "En bas": "53%", "En bas à droite": "53%" 
      };
      return { 
        top: yMap[direction], 
        left: xMap[direction], 
        scale: 0.4, 
        rotate: 1080, 
        filter: "blur(2px)", 
        transition: { duration: 0.8, ease: [0.4, 0, 0.2, 1] } 
      };
    }
  };

  const keeperVariants = {
    idle: { left: "50%", top: "25%", translateX: "-50%", rotate: 0, scale: 1 },
    shooting: (direction: Direction | null) => {
      if (!direction) return {};
      // Le gardien plonge pour intercepter le ballon aux mêmes coordonnées %
      const xMap: Record<Direction, string> = { 
        "En haut à gauche": "22%", "En haut": "50%", "En haut à droite": "78%", 
        "À gauche": "22%", "Centre": "50%", "À droite": "78%", 
        "En bas à gauche": "22%", "En bas": "50%", "En bas à droite": "78%" 
      };
      const yMap: Record<Direction, string> = { 
        "En haut à gauche": "22%", "En haut": "22%", "En haut à droite": "22%", 
        "À gauche": "35%", "Centre": "30%", "À droite": "35%", 
        "En bas à gauche": "48%", "En bas": "48%", "En bas à droite": "48%" 
      };
      const rotateMap: Record<Direction, number> = { 
        "En haut à gauche": -45, "En haut": 0, "En haut à droite": 45, 
        "À gauche": -45, "Centre": 0, "À droite": 45, 
        "En bas à gauche": -45, "En bas": 0, "En bas à droite": 45 
      };
      return { 
        left: xMap[direction], 
        top: yMap[direction as keyof typeof yMap] || "25%", 
        rotate: rotateMap[direction], 
        transition: { duration: 0.6, type: "spring", stiffness: 120, damping: 15 } 
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
    <div className="min-h-screen bg-black flex flex-col pb-32">
      <main className="flex-1 p-4 sm:p-6 pt-24 space-y-6 sm:space-y-8 max-w-md mx-auto w-full overflow-hidden">
        {/* Header de Match Immersif */}
        <div className="flex items-center justify-between px-2 sm:px-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full bg-white/5 border border-white/10 h-10 w-10 sm:h-12 sm:w-12">
            <ChevronLeft className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
          </Button>
          
          <div className="flex items-center gap-2 sm:gap-4 bg-white/5 backdrop-blur-xl px-4 sm:px-6 py-2 rounded-2xl border border-white/10 shadow-2xl">
            <div className="flex items-center gap-2">
              <div className="h-5 w-5 sm:h-6 sm:w-6 bg-primary rounded flex items-center justify-center border border-white/20">
                <span className="text-[7px] sm:text-[8px] font-black text-white italic">1W</span>
              </div>
              <span className="text-[8px] sm:text-[10px] font-black text-yellow-500 italic">VS</span>
              <div className="relative h-5 w-7 sm:h-6 sm:w-8 rounded overflow-hidden shadow-sm border border-white/10">
                {civFlag && <Image src={civFlag} alt="CIV" fill className="object-cover" unoptimized />}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-primary/10 rounded-xl border border-primary/20">
            <Zap className="h-3 w-3 text-primary" />
            <span className="text-[10px] sm:text-xs font-black text-white tabular-nums">{profile?.totalPoints?.toLocaleString()}</span>
          </div>
        </div>

        <div className="space-y-6 sm:space-y-8">
          {gameState === 'idle' && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 sm:space-y-6">
              <div className="space-y-3">
                <div className="relative">
                  <Input 
                    type="number" 
                    value={betInput} 
                    onChange={(e) => setBetInput(e.target.value)} 
                    className="h-12 sm:h-14 text-xl sm:text-2xl font-black text-center rounded-2xl bg-white/5 border-none shadow-inner text-white focus-visible:ring-1 focus-visible:ring-primary/20"
                  />
                  <Edit3 className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white opacity-20" />
                </div>
                <div className="flex justify-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar py-1">
                  {BET_PRESETS.map((amt) => (
                    <button 
                      key={amt} 
                      onClick={() => { haptic.light(); setBetInput(amt.toString()); }} 
                      className={cn(
                        "flex-1 min-w-[60px] py-2 sm:py-3 rounded-xl font-black text-[9px] sm:text-[10px] uppercase transition-all border shrink-0", 
                        betInput === amt.toString() ? "bg-primary text-primary-foreground border-primary shadow-xl" : "bg-white/5 border-white/5 text-white/40"
                      )}
                    >
                      {amt} PTS
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* Terrain de Jeu Adaptatif avec Coordonnées Proportionnelles */}
          <div className="relative w-full aspect-[4/5] rounded-[2.5rem] sm:rounded-[3rem] bg-[#0a0a0a] border border-white/5 shadow-[0_32px_128px_-16px_rgba(0,0,0,0.8)] overflow-hidden">
            {/* Arrière-plan Stadium */}
            <div className="absolute inset-0 z-0">
              <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_20%_0%,rgba(255,255,255,0.05),transparent_40%)]" />
              <div className="absolute top-0 right-0 w-full h-full bg-[radial-gradient(circle_at_80%_0%,rgba(255,255,255,0.05),transparent_40%)]" />
              
              <div className="absolute top-[45%] left-0 right-0 h-12 sm:h-16 bg-[#0047AB]/40 backdrop-blur-sm border-y border-white/10 flex items-center overflow-hidden">
                <div className="flex gap-8 sm:gap-12 animate-[scroll_20s_linear_infinite] whitespace-nowrap px-4">
                  {[...Array(10)].map((_, i) => (
                    <span key={i} className="text-[8px] sm:text-[10px] font-black text-white/20 uppercase tracking-widest italic">Exu Play</span>
                  ))}
                </div>
              </div>

              <div className="absolute bottom-0 left-0 right-0 h-[40%] bg-gradient-to-t from-white/[0.02] to-transparent border-t border-white/5" />
            </div>

            {/* La Cage de But Responsive */}
            <div className="absolute top-[18%] left-1/2 -translate-x-1/2 w-[85%] aspect-[1.6] z-10">
              <div className="absolute inset-0 border-[4px] sm:border-[6px] border-[#e5e7eb] rounded-t-lg shadow-2xl z-20" />
              <div className="absolute inset-0 bg-[#111] opacity-40 z-10" />
              <div className="absolute inset-0 z-15 opacity-20" style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '10px 10px' }} />

              {/* Zones de Cibles Tactiles */}
              <div className="absolute inset-0 z-[60]">
                {gameState === 'idle' && DIRECTIONS.map((dir) => (
                  <button 
                    key={dir} 
                    onPointerEnter={() => setHoveredTarget(dir)}
                    onPointerLeave={() => setHoveredTarget(null)}
                    onClick={() => handleShoot(dir)} 
                    disabled={loading} 
                    className={cn(
                      "absolute transition-all duration-300 cursor-crosshair flex items-center justify-center", 
                      getTargetPosition(dir), 
                      (dir.includes("Haut") || dir.includes("Bas")) && dir !== "Centre" ? "h-1/3 w-[33.33%]" : "w-[33.33%] h-1/3"
                    )}
                  >
                    <div className={cn(
                      "h-8 w-8 sm:h-10 sm:w-10 rounded-full border-2 border-dashed flex items-center justify-center transition-all duration-500",
                      hoveredTarget === dir ? "border-primary bg-primary/10 scale-125" : "border-white/10 bg-transparent"
                    )}>
                      <Crosshair className={cn("h-4 w-4 sm:h-5 sm:w-5 transition-colors", hoveredTarget === dir ? "text-primary" : "text-white/5")} />
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Le Gardien (Gants) Proportionnel */}
            <motion.div 
              variants={keeperVariants} 
              animate={gameState === 'shooting' || gameState === 'result' ? "shooting" : "idle"} 
              custom={keeperChoice} 
              className="absolute z-30 origin-bottom"
            >
              <GlovesKeeper gameState={gameState} keeperChoice={keeperChoice} isScored={isScored} />
            </motion.div>

            {/* Le Ballon et son Ombre Proportionnels */}
            <motion.div 
              variants={ballVariants} 
              animate={gameState === 'shooting' || gameState === 'result' ? "shooting" : "idle"} 
              custom={playerChoice} 
              className="absolute z-40"
            >
              <motion.div 
                animate={gameState === 'idle' ? { scale: [1, 1.05, 1], opacity: [0.1, 0.3, 0.1] } : { scale: 0, opacity: 0 }}
                transition={{ duration: 2, repeat: Infinity }}
                className="w-10 h-3 sm:w-12 sm:h-4 bg-black/60 rounded-full blur-[6px] mb-[-8px] mx-auto translate-y-12" 
              />
              <div className="relative">
                <div className="text-6xl sm:text-7xl drop-shadow-[0_20px_40px_rgba(0,0,0,0.8)] filter brightness-110 select-none">⚽</div>
                {gameState === 'idle' && (
                  <motion.div 
                    animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.3, 0.1] }} 
                    transition={{ duration: 2, repeat: Infinity }} 
                    className="absolute inset-0 bg-white/10 rounded-full blur-2xl -z-10" 
                  />
                )}
              </div>
            </motion.div>

            {/* Overlay de Résultat Cinématique */}
            <AnimatePresence>
              {gameState === 'result' && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.5, filter: "blur(20px)" }} 
                  animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }} 
                  className="absolute inset-0 flex flex-col items-center justify-center z-[100] pointer-events-none bg-black/40 backdrop-blur-sm"
                >
                  <motion.h2 
                    initial={{ y: 20 }} 
                    animate={{ y: 0 }} 
                    className={cn(
                      "text-6xl sm:text-8xl font-black uppercase italic tracking-tighter drop-shadow-[0_0_40px_rgba(0,0,0,0.5)]", 
                      isScored ? "text-green-500" : "text-red-500"
                    )}
                  >
                    {isScored ? "BUT !" : "ARRÊT !"}
                  </motion.h2>
                  <div className="mt-6 sm:mt-8 px-8 sm:px-10 py-3 sm:py-4 rounded-[1.5rem] sm:rounded-[2rem] bg-white/10 backdrop-blur-2xl border border-white/10 shadow-2xl flex items-center gap-3">
                    <Zap className={cn("h-5 w-5 sm:h-6 sm:w-6", isScored ? "text-yellow-500" : "text-white/20")} />
                    <span className="text-2xl sm:text-3xl font-black text-white tabular-nums">
                      {isScored ? `+${currentBet * 2}` : `-${currentBet}`}
                    </span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Contrôles de Fin de Cycle */}
          <AnimatePresence mode="wait">
            {gameState === 'result' ? (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <Button 
                  onClick={resetGame} 
                  className="w-full h-16 sm:h-20 rounded-[1.75rem] sm:rounded-[2.2rem] font-black text-[10px] sm:text-xs uppercase tracking-[0.4em] shadow-2xl shadow-primary/20 bg-primary text-primary-foreground"
                >
                  Nouvelle Frappe
                </Button>
              </motion.div>
            ) : (
              <div className="p-6 sm:p-8 bg-white/5 rounded-[2.5rem] sm:rounded-[3rem] border border-white/5 flex items-start gap-4 shadow-inner">
                <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 text-primary opacity-40 shrink-0 mt-1" />
                <p className="text-[10px] sm:text-[11px] font-medium text-white/40 italic leading-relaxed">
                  "L'arène ne pardonne pas l'hésitation. Choisissez votre cible, scellez votre destin."
                </p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </main>

      <style jsx global>{`
        @keyframes scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}
