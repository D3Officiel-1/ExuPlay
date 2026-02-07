
"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useUser, useFirestore, useDoc } from "@/firebase";
import { 
  doc, 
  updateDoc, 
  serverTimestamp, 
  increment,
  collection,
  query,
  limit,
  getDocs
} from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Loader2, Swords, Trophy, Zap, Clock, XCircle, CheckCircle2, User, RefreshCw, Sparkles } from "lucide-react";
import { haptic } from "@/lib/haptics";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

/**
 * @fileOverview L'Arène du Duel.
 * Gère la logique de combat en temps réel entre deux esprits.
 */

export default function DuelArenaPage() {
  const { duelId } = useParams() as { duelId: string };
  const { user } = useUser();
  const db = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const [quiz, setQuiz] = useState<any>(null);
  const [answered, setAnswered] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(15);
  const [isResetting, setIsResetting] = useState(false);

  const duelRef = useMemo(() => db ? doc(db, "duels", duelId) : null, [db, duelId]);
  const { data: duel, loading: duelLoading } = useDoc(duelRef);

  const isChallenger = duel?.challengerId === user?.uid;

  // 1. Initialisation : Le Challenger choisit le quiz si le duel est accepté
  useEffect(() => {
    if (!duel || duel.quizId || !isChallenger || !db || (duel.status !== 'accepted' && duel.status !== 'active')) return;
    
    // Si on est en phase accepted ou si on doit reset, on pioche un quiz
    if (duel.status === 'accepted' || (duel.status === 'active' && !duel.quizId)) {
      const fetchQuiz = async () => {
        try {
          const q = query(collection(db, "quizzes"), limit(50));
          const snap = await getDocs(q);
          const allQuizzes = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          const randomQuiz = allQuizzes[Math.floor(Math.random() * allQuizzes.length)];
          
          if (randomQuiz) {
            await updateDoc(duelRef!, { 
              quizId: randomQuiz.id, 
              status: 'active',
              updatedAt: serverTimestamp()
            });
          }
        } catch (e) {
          console.error("Erreur d'invocation de l'Oracle:", e);
        }
      };
      fetchQuiz();
    }
  }, [duel?.quizId, duel?.status, isChallenger, db, duelRef]);

  // 2. Chargement des détails du quiz pour l'affichage
  useEffect(() => {
    if (!duel?.quizId || !db) return;
    const loadQuizDetails = async () => {
      try {
        const quizSnap = await getDocs(query(collection(db, "quizzes")));
        const q = quizSnap.docs.find(d => d.id === duel.quizId)?.data();
        if (q) { 
          setQuiz(q); 
          setAnswered(false); 
          setTimeLeft(15); 
          setStartTime(Date.now()); 
          setIsResetting(false); 
        }
      } catch (e) {}
    };
    loadQuizDetails();
  }, [duel?.quizId, db]);

  // 3. Chronomètre sacré
  useEffect(() => {
    if (duel?.status === 'active' && !answered && timeLeft > 0 && quiz) {
      const timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
      return () => clearInterval(timer);
    } else if (timeLeft === 0 && !answered && duel?.status === 'active' && quiz) { 
      handleAnswer(-1); 
    }
  }, [duel?.status, answered, timeLeft, quiz]);

  const handleAnswer = async (idx: number) => {
    if (!duel || !user || !db || answered || isResetting) return;
    
    setAnswered(true); 
    haptic.medium();
    
    const isCorrect = idx === quiz?.correctIndex;
    const responseTime = Date.now() - (startTime || Date.now());
    
    const result = { 
      answered: true, 
      correct: isCorrect, 
      time: responseTime 
    };

    const otherResult = isChallenger ? duel.opponentResult : duel.challengerResult;
    let updatePayload: any = isChallenger ? { challengerResult: result } : { opponentResult: result };

    // Si l'autre a déjà répondu, on vérifie la fin du round
    if (otherResult?.answered) {
      if (isCorrect || otherResult.correct) { 
        // Au moins un a juste, le duel se finit
        updatePayload.status = 'finished'; 
      } else {
        // Double échec : on recommence une manche
        setIsResetting(true); 
        toast({ title: "Double Échec", description: "Les deux esprits ont failli. Nouvelle manche..." });
        setTimeout(async () => {
          await updateDoc(duelRef!, { 
            challengerResult: null, 
            opponentResult: null, 
            quizId: null, 
            status: 'active', 
            round: increment(1),
            updatedAt: serverTimestamp()
          });
        }, 3000); 
        return;
      }
    }
    
    await updateDoc(duelRef!, updatePayload);
  };

  // 4. Arbitrage final
  useEffect(() => {
    if (duel?.status === 'finished' && duel.challengerResult && duel.opponentResult && !duel.winnerId && db && duelRef) {
      const determineWinner = async () => {
        let winnerId: string | 'draw' = 'draw'; 
        const c = duel.challengerResult; 
        const o = duel.opponentResult;

        if (c.correct && !o.correct) winnerId = duel.challengerId;
        else if (!c.correct && o.correct) winnerId = duel.opponentId;
        else if (c.correct && o.correct) { 
          winnerId = c.time < o.time ? duel.challengerId : duel.opponentId; 
        }

        await updateDoc(duelRef, { 
          winnerId: winnerId, 
          finishedAt: serverTimestamp() 
        });

        if (winnerId && winnerId !== 'draw') {
          await updateDoc(doc(db, "users", winnerId), { 
            totalPoints: increment(duel.wager * 2), 
            updatedAt: serverTimestamp() 
          });
        }
      };
      determineWinner();
    }
  }, [duel, db, duelRef]);

  if (duelLoading || !duel) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin opacity-20" />
      </div>
    );
  }

  const challengerAnswered = duel.challengerResult?.answered;
  const opponentAnswered = duel.opponentResult?.answered;

  return (
    <div className="min-h-screen bg-background flex flex-col p-6 pt-24 space-y-8">
      {/* Barre de Status des Esprits */}
      <div className="flex items-center justify-between px-2">
        <div className="flex flex-col items-center gap-3">
          <div className={cn(
            "h-20 w-20 rounded-[2rem] border-2 transition-all duration-500 overflow-hidden relative", 
            challengerAnswered 
              ? (duel.challengerResult.correct ? "border-green-500 shadow-[0_0_20px_rgba(34,197,94,0.3)] scale-110" : "border-red-500 opacity-60") 
              : "border-primary/10"
          )}>
            {duel.challengerPhoto ? <img src={duel.challengerPhoto} alt="" className="object-cover w-full h-full" /> : <User className="m-auto h-10 w-10 opacity-10" />}
            {challengerAnswered && (
              <div className="absolute inset-0 bg-background/40 backdrop-blur-sm flex items-center justify-center">
                {duel.challengerResult.correct ? <CheckCircle2 className="h-8 w-8 text-green-500" /> : <XCircle className="h-8 w-8 text-red-500" />}
              </div>
            )}
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest">@{duel.challengerName}</span>
        </div>

        <div className="flex flex-col items-center gap-2">
          <div className="bg-primary text-primary-foreground px-5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] shadow-xl">vs</div>
          <p className="text-[9px] font-black opacity-30 uppercase tracking-[0.3em]">Manche {duel.round || 1}</p>
          <div className="flex items-center gap-1 mt-1">
            <Zap className="h-3 w-3 text-primary" />
            <span className="text-xs font-black">{duel.wager * 2}</span>
          </div>
        </div>

        <div className="flex flex-col items-center gap-3">
          <div className={cn(
            "h-20 w-20 rounded-[2rem] border-2 transition-all duration-500 overflow-hidden relative", 
            opponentAnswered 
              ? (duel.opponentResult.correct ? "border-green-500 shadow-[0_0_20px_rgba(34,197,94,0.3)] scale-110" : "border-red-500 opacity-60") 
              : "border-primary/10"
          )}>
            {duel.opponentPhoto ? <img src={duel.opponentPhoto} alt="" className="object-cover w-full h-full" /> : <User className="m-auto h-10 w-10 opacity-10" />}
            {opponentAnswered && (
              <div className="absolute inset-0 bg-background/40 backdrop-blur-sm flex items-center justify-center">
                {duel.opponentResult.correct ? <CheckCircle2 className="h-8 w-8 text-green-500" /> : <XCircle className="h-8 w-8 text-red-500" />}
              </div>
            )}
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest">@{duel.opponentName}</span>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {(duel.status === 'pending' || duel.status === 'accepted' || (duel.status === 'active' && !quiz) || isResetting) ? (
          <motion.div 
            key="loading"
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="flex-1 flex flex-col items-center justify-center text-center space-y-8"
          >
            <div className="relative">
              <RefreshCw className="h-16 w-16 animate-spin opacity-10" />
              <Swords className="absolute inset-0 m-auto h-8 w-8 opacity-40" />
            </div>
            <div className="space-y-2">
              <p className="text-[10px] font-black uppercase tracking-[0.5em] opacity-40">
                {isResetting ? "Équilibre Rompu" : "Oracle en Consultation"}
              </p>
              <p className="text-sm font-medium opacity-60 max-w-[200px]">
                {isResetting ? "Préparation d'un nouveau défi pour vous départager..." : "L'Arène se matérialise..."}
              </p>
            </div>
          </motion.div>
        ) : duel.status === 'active' ? (
          <motion.div 
            key="active"
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            className="flex-1 flex flex-col space-y-12"
          >
            <div className="flex flex-col items-center gap-8">
              <div className={cn(
                "h-24 w-24 rounded-full border-4 flex items-center justify-center font-black text-4xl tabular-nums shadow-2xl transition-colors",
                timeLeft <= 5 ? "border-red-500 text-red-500 animate-pulse" : "border-primary/10"
              )}>
                {timeLeft}
              </div>
              <h2 className="text-2xl font-black text-center leading-tight tracking-tight px-4 italic">
                "{quiz?.question}"
              </h2>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {quiz?.options.map((opt: string, idx: number) => (
                <Button 
                  key={idx} 
                  disabled={answered} 
                  onClick={() => handleAnswer(idx)} 
                  className={cn(
                    "h-20 rounded-[2.5rem] font-bold text-lg border-2 shadow-xl transition-all duration-300", 
                    !answered ? "bg-card border-primary/5 hover:bg-primary/5" : 
                    idx === quiz.correctIndex ? "bg-green-500 border-green-600 text-white" : 
                    "opacity-40 grayscale"
                  )}
                >
                  {opt}
                </Button>
              ))}
            </div>
          </motion.div>
        ) : duel.status === 'finished' ? (
          <motion.div 
            key="finished"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex-1 flex flex-col items-center justify-center space-y-12 text-center"
          >
            <div className="relative">
              <div className="absolute inset-0 bg-primary/10 blur-[80px] rounded-full" />
              <Trophy className={cn(
                "h-32 w-32 relative z-10", 
                duel.winnerId === user?.uid ? "text-yellow-500 drop-shadow-[0_0_30px_rgba(234,179,8,0.5)]" : "opacity-10"
              )} />
            </div>
            
            <div className="space-y-4">
              <h2 className="text-6xl font-black uppercase italic tracking-tighter">
                {duel.winnerId === user?.uid ? "Triomphe !" : duel.winnerId === 'draw' ? "Équilibre" : "Dissonance"}
              </h2>
              <p className="text-sm font-medium opacity-40 uppercase tracking-widest">
                {duel.winnerId === user?.uid ? `+${duel.wager * 2} PTS de Lumière Récoltés` : "Retour au Sanctuaire"}
              </p>
            </div>

            <Button 
              onClick={() => { haptic.light(); router.push("/home"); }} 
              className="w-full h-20 rounded-[3rem] font-black uppercase tracking-[0.4em] shadow-2xl"
            >
              Quitter l'Arène
            </Button>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
