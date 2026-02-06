"use client";

import { useState, useEffect, useMemo, useRef } from "react";
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
  getDocs,
  orderBy
} from "firebase/firestore";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Swords, Trophy, Zap, Clock, Sparkles, XCircle, CheckCircle2, User, RefreshCw } from "lucide-react";
import { haptic } from "@/lib/haptics";
import { useToast } from "@/hooks/use-toast";

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

  // Oracle du Savoir : Charger une question si nécessaire
  useEffect(() => {
    if (!duel || duel.quizId || !isChallenger || !db || duel.status !== 'active') return;

    const fetchQuiz = async () => {
      try {
        const q = query(collection(db, "quizzes"), limit(50));
        const snap = await getDocs(q);
        const randomQuiz = snap.docs[Math.floor(Math.random() * snap.docs.length)];
        if (randomQuiz) {
          await updateDoc(duelRef!, { 
            quizId: randomQuiz.id,
            status: 'active'
          });
        }
      } catch (e) {
        console.error(e);
      }
    };
    fetchQuiz();
  }, [duel?.quizId, duel?.status, isChallenger, db, duelRef]);

  // Chargement des détails de la question actuelle
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

  // Chronomètre de l'Éther
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
    const endTime = Date.now();
    const duration = endTime - (startTime || endTime);
    const isCorrect = idx === quiz?.correctIndex;

    const result = {
      answered: true,
      correct: isCorrect,
      time: duration,
      timestamp: serverTimestamp()
    };

    haptic.medium();

    const otherResult = isChallenger ? duel.opponentResult : duel.challengerResult;
    
    let updatePayload: any = isChallenger 
      ? { challengerResult: result } 
      : { opponentResult: result };

    // Si l'autre a déjà répondu, on décide du sort du duel
    if (otherResult?.answered) {
      if (isCorrect || otherResult.correct) {
        // Au moins un vainqueur potentiel trouvé
        updatePayload.status = 'finished';
      } else {
        // Double échec -> Nouvelle manche automatique
        setIsResetting(true);
        toast({ title: "Dissonance Mutuelle", description: "Aucun esprit n'a trouvé la vérité. Nouvelle manche..." });
        
        setTimeout(async () => {
          await updateDoc(duelRef!, {
            challengerResult: null,
            opponentResult: null,
            quizId: null, // Force le challenger à en piocher une nouvelle
            status: 'active',
            round: increment(1)
          });
        }, 2000);
        return;
      }
    } else {
      // Premier à répondre, on attend l'autre
      updatePayload.status = 'active';
    }

    await updateDoc(duelRef!, updatePayload);
  };

  // Calcul du Triomphateur final
  useEffect(() => {
    if (duel?.status === 'finished' && duel.challengerResult && duel.opponentResult && !duel.winnerId && db && duelRef) {
      const determineWinner = async () => {
        let winnerId = null;
        const c = duel.challengerResult;
        const o = duel.opponentResult;

        if (c.correct && !o.correct) winnerId = duel.challengerId;
        else if (!c.correct && o.correct) winnerId = duel.opponentId;
        else if (c.correct && o.correct) {
          // Les deux sont justes : le plus rapide triomphe
          winnerId = c.time < o.time ? duel.challengerId : duel.opponentId;
        } else {
          // Cas de sécurité (normalement géré par la boucle de manches)
          winnerId = 'draw';
        }

        await updateDoc(duelRef, { 
          winnerId: winnerId,
          finishedAt: serverTimestamp()
        });

        // Attribution du Pot de Lumière
        if (winnerId && winnerId !== 'draw') {
          const winnerUserRef = doc(db, "users", winnerId);
          await updateDoc(winnerUserRef, { 
            totalPoints: increment(duel.wager * 2),
            updatedAt: serverTimestamp() 
          });
        }
      };
      determineWinner();
    }
  }, [duel, db, duelRef]);

  if (duelLoading || !duel) return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="animate-spin opacity-20" /></div>;

  return (
    <div className="min-h-screen bg-background flex flex-col p-6 pt-24 space-y-8">
      {/* Barre des Combattants */}
      <div className="flex items-center justify-between px-2">
        <div className="flex flex-col items-center gap-2">
          <div className={cn(
            "h-16 w-16 rounded-2xl border-2 overflow-hidden relative transition-all duration-500",
            duel.challengerResult?.answered ? (duel.challengerResult.correct ? "border-green-500 shadow-[0_0_15px_rgba(34,197,94,0.3)]" : "border-red-500") : "border-primary/20"
          )}>
            {duel.challengerPhoto ? <img src={duel.challengerPhoto} alt="" className="object-cover w-full h-full" /> : <User className="m-auto opacity-20" />}
            {duel.challengerResult?.answered && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                {duel.challengerResult.correct ? <CheckCircle2 className="text-green-500 h-6 w-6" /> : <XCircle className="text-red-500 h-6 w-6" />}
              </div>
            )}
          </div>
          <span className="text-[9px] font-black uppercase tracking-widest">@{duel.challengerName}</span>
        </div>

        <div className="flex flex-col items-center gap-1">
          <div className="bg-primary text-primary-foreground px-4 py-1 rounded-full text-[10px] font-black uppercase shadow-lg">vs</div>
          <div className="flex items-center gap-1 mt-1">
            <Zap className="h-3 w-3 text-yellow-500 fill-current animate-pulse" />
            <span className="text-xs font-black">{duel.wager} PTS</span>
          </div>
          <p className="text-[8px] font-bold opacity-30 uppercase mt-1">Manche {duel.round || 1}</p>
        </div>

        <div className="flex flex-col items-center gap-2">
          <div className={cn(
            "h-16 w-16 rounded-2xl border-2 overflow-hidden relative transition-all duration-500",
            duel.opponentResult?.answered ? (duel.opponentResult.correct ? "border-green-500 shadow-[0_0_15px_rgba(34,197,94,0.3)]" : "border-red-500") : "border-primary/20"
          )}>
            {duel.opponentPhoto ? <img src={duel.opponentPhoto} alt="" className="object-cover w-full h-full" /> : <User className="m-auto opacity-20" />}
            {duel.opponentResult?.answered && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                {duel.opponentResult.correct ? <CheckCircle2 className="text-green-500 h-6 w-6" /> : <XCircle className="text-red-500 h-6 w-6" />}
              </div>
            )}
          </div>
          <span className="text-[9px] font-black uppercase tracking-widest">@{duel.opponentName}</span>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {duel.status === 'pending' || (duel.status === 'active' && !quiz) || isResetting ? (
          <motion.div key="waiting" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 flex flex-col items-center justify-center text-center space-y-6">
            <div className="relative">
              <RefreshCw className="h-12 w-12 animate-spin text-primary opacity-20" />
              <Swords className="h-6 w-6 absolute inset-0 m-auto opacity-40" />
            </div>
            <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40">
              {isResetting ? "Purge de la Dissonance..." : "L'Oracle prépare l'épreuve..."}
            </p>
          </motion.div>
        ) : duel.status === 'active' ? (
          <motion.div key="battle" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex-1 flex flex-col space-y-10">
            <div className="flex flex-col items-center gap-6">
              <div className={cn(
                "h-20 w-20 rounded-full border-4 flex items-center justify-center font-black text-3xl tabular-nums shadow-2xl transition-colors",
                timeLeft <= 5 ? "border-red-500 text-red-500 animate-pulse" : "border-primary/10"
              )}>
                {timeLeft}
              </div>
              <h2 className="text-2xl font-black text-center px-4 leading-tight tracking-tight italic">"{quiz?.question}"</h2>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {quiz?.options.map((opt: string, idx: number) => (
                <Button 
                  key={idx} 
                  disabled={answered || isResetting} 
                  onClick={() => handleAnswer(idx)} 
                  className={cn(
                    "h-20 rounded-[2rem] font-bold text-lg shadow-xl active:scale-95 transition-all",
                    answered && idx === quiz.correctIndex ? "bg-green-500 text-white" : ""
                  )}
                >
                  {opt}
                </Button>
              ))}
            </div>
          </motion.div>
        ) : duel.status === 'finished' ? (
          <motion.div key="result" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex-1 flex flex-col items-center justify-center space-y-10">
            <div className="relative">
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                className="absolute inset-[-40px] border border-dashed border-primary/10 rounded-full"
              />
              <div className="relative h-40 w-40 bg-card rounded-[3.5rem] flex items-center justify-center border shadow-2xl">
                {duel.winnerId === user?.uid ? (
                  <div className="relative">
                    <Trophy className="h-20 w-20 text-yellow-500" />
                    <motion.div animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }} transition={{ duration: 2, repeat: Infinity }} className="absolute inset-0 bg-yellow-500/20 rounded-full blur-2xl" />
                  </div>
                ) : (
                  <XCircle className="h-20 w-20 opacity-10" />
                )}
              </div>
            </div>

            <div className="text-center space-y-3">
              <h2 className="text-5xl font-black uppercase tracking-tighter italic">
                {duel.winnerId === user?.uid ? "Triomphe !" : "Dissonance"}
              </h2>
              <p className="text-sm font-medium opacity-40 px-10 leading-relaxed">
                {duel.winnerId === user?.uid 
                  ? `Votre esprit a résonné plus promptement. Vous récoltez le pot de ${duel.wager * 2} PTS.` 
                  : "L'adversaire a percé le voile de l'illusion avant vous."}
              </p>
            </div>

            <Button onClick={() => router.push("/home")} className="w-full h-20 rounded-[2.5rem] font-black uppercase tracking-[0.3em] shadow-2xl shadow-primary/20">
              Retour au Sanctuaire
            </Button>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(" ");
}
