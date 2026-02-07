
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
import { Loader2, Swords, Trophy, Zap, Clock, XCircle, CheckCircle2, User, RefreshCw, Sparkles, Users } from "lucide-react";
import { haptic } from "@/lib/haptics";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

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
  const [resetCountdown, setResetCountdown] = useState(3);

  const duelRef = useMemo(() => db ? doc(db, "duels", duelId) : null, [db, duelId]);
  const { data: duel, loading: duelLoading } = useDoc(duelRef);

  const isChallenger = duel?.challengerId === user?.uid;

  // 1. Initialisation de l'Arène
  useEffect(() => {
    if (!duel || duel.quizId || !isChallenger || !db || duel.status !== 'accepted') return;
    
    // Si tout le monde a accepté, le challenger lance le quiz
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
      } catch (e) {}
    };
    fetchQuiz();
  }, [duel?.quizId, duel?.status, isChallenger, db, duelRef]);

  // 2. Chargement du Quiz
  useEffect(() => {
    if (!duel?.quizId || !db) return;
    const loadQuiz = async () => {
      const snap = await getDocs(query(collection(db, "quizzes")));
      const q = snap.docs.find(d => d.id === duel.quizId)?.data();
      if (q) {
        setQuiz(q); setAnswered(false); setTimeLeft(15); setStartTime(Date.now()); setIsResetting(false);
      }
    };
    loadQuiz();
  }, [duel?.quizId, db]);

  // 3. Chronomètre
  useEffect(() => {
    if (duel?.status === 'active' && !answered && timeLeft > 0 && quiz && !isResetting) {
      const timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
      return () => clearInterval(timer);
    } else if (timeLeft === 0 && !answered && duel?.status === 'active' && quiz && !isResetting) { 
      handleAnswer(-1); 
    }
  }, [duel?.status, answered, timeLeft, quiz, isResetting]);

  // 4. Détection du match nul collectif (si tout le monde a tort)
  useEffect(() => {
    if (duel?.status === 'active' && !isResetting) {
      const participantResults = Object.values(duel.participants);
      const everyoneAnswered = participantResults.every((p: any) => p.result?.answered);
      const everyoneFailed = participantResults.every((p: any) => p.result?.answered && !p.result?.correct);

      if (everyoneAnswered && everyoneFailed) {
        setIsResetting(true); setResetCountdown(3); haptic.medium();
        const countdown = setInterval(() => {
          setResetCountdown(prev => {
            if (prev <= 1) {
              clearInterval(countdown);
              if (isChallenger) {
                // Nettoyage des résultats pour le nouveau round
                const resetParticipants: any = {};
                Object.keys(duel.participants).forEach(uid => {
                  resetParticipants[`participants.${uid}.result`] = null;
                });
                updateDoc(duelRef!, { ...resetParticipants, quizId: null, round: increment(1), updatedAt: serverTimestamp() });
              }
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
        return () => clearInterval(countdown);
      }
    }
  }, [duel, isResetting, isChallenger, duelRef]);

  const handleAnswer = async (idx: number) => {
    if (!duel || !user || !db || answered || isResetting) return;
    setAnswered(true); haptic.medium();
    const isCorrect = idx === quiz?.correctIndex;
    const responseTime = Date.now() - (startTime || Date.now());
    
    await updateDoc(duelRef!, {
      [`participants.${user.uid}.result`]: { answered: true, correct: isCorrect, time: responseTime }
    });

    // Si tout le monde a répondu et au moins un a juste, on finit
    const updatedDuel = (await getDocs(query(collection(db, "duels")))).docs.find(d => d.id === duelId)?.data();
    if (updatedDuel) {
      const results = Object.values(updatedDuel.participants);
      const allFinished = results.every((p: any) => p.result?.answered);
      const someoneCorrect = results.some((p: any) => p.result?.correct);
      if (allFinished && someoneCorrect) {
        await updateDoc(duelRef!, { status: 'finished' });
      }
    }
  };

  // 5. Arbitrage Final
  useEffect(() => {
    if (duel?.status === 'finished' && !duel.winnerId && db && duelRef) {
      const determineWinner = async () => {
        let bestTime = Infinity;
        let winnerId = 'draw';
        Object.entries(duel.participants).forEach(([uid, p]: [string, any]) => {
          if (p.result?.correct && p.result.time < bestTime) {
            bestTime = p.result.time;
            winnerId = uid;
          }
        });

        await updateDoc(duelRef, { winnerId, finishedAt: serverTimestamp() });
        if (winnerId !== 'draw') {
          // Pot total = wager * nombre de participants
          const totalPot = duel.wager * duel.participantIds.length;
          await updateDoc(doc(db, "users", winnerId), { totalPoints: increment(totalPot), updatedAt: serverTimestamp() });
        }
      };
      determineWinner();
    }
  }, [duel, db, duelRef]);

  const duelOptions = useMemo(() => {
    if (!quiz || !quiz.options) return [];
    const correctOption = { text: quiz.options[quiz.correctIndex], originalIndex: quiz.correctIndex };
    const wrongOptions = quiz.options.map((text: string, i: number) => ({ text, originalIndex: i })).filter((o: any) => o.originalIndex !== quiz.correctIndex);
    const randomWrong = wrongOptions[Math.floor(Math.random() * wrongOptions.length)];
    return [correctOption, randomWrong].sort(() => Math.random() - 0.5);
  }, [quiz]);

  if (duelLoading || !duel) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin opacity-20" /></div>;

  return (
    <div className="min-h-screen bg-background flex flex-col p-6 pt-24 space-y-8">
      {/* Grille des Esprits */}
      <div className="flex flex-wrap justify-center gap-4 px-2">
        {Object.entries(duel.participants).map(([uid, p]: [string, any]) => {
          const res = p.result;
          return (
            <div key={uid} className="flex flex-col items-center gap-2">
              <div className={cn(
                "h-16 w-16 rounded-2xl border-2 transition-all duration-500 overflow-hidden relative",
                res?.answered ? (res.correct ? "border-green-500 shadow-[0_0_15px_rgba(34,197,94,0.3)]" : "border-red-500 opacity-40") : "border-primary/10"
              )}>
                {p.photo ? <img src={p.photo} alt="" className="object-cover w-full h-full" /> : <User className="m-auto h-8 w-8 opacity-10" />}
                {res?.answered && (
                  <div className="absolute inset-0 bg-background/40 flex items-center justify-center">
                    {res.correct ? <CheckCircle2 className="h-6 w-6 text-green-500" /> : <XCircle className="h-6 w-6 text-red-500" />}
                  </div>
                )}
              </div>
              <span className="text-[8px] font-black uppercase opacity-40 truncate w-16 text-center">@{p.name}</span>
            </div>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        {(duel.status === 'pending' || duel.status === 'accepted' || (duel.status === 'active' && !quiz) || isResetting) ? (
          <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 flex flex-col items-center justify-center text-center space-y-8">
            <div className="relative">
              {isResetting ? <div className="h-24 w-24 rounded-full border-4 border-primary/10 flex items-center justify-center"><span className="text-5xl font-black">{resetCountdown}</span></div> : <RefreshCw className="h-16 w-16 animate-spin opacity-10" />}
            </div>
            <p className="text-[10px] font-black uppercase tracking-[0.5em] opacity-40">{isResetting ? "Équilibre Rompu" : "Invocation de l'Arène"}</p>
          </motion.div>
        ) : duel.status === 'active' ? (
          <motion.div key="active" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex-1 flex flex-col space-y-12">
            <div className="flex flex-col items-center gap-8">
              <div className={cn("h-20 w-20 rounded-full border-4 flex items-center justify-center font-black text-3xl tabular-nums transition-colors", timeLeft <= 5 ? "border-red-500 text-red-500" : "border-primary/10")}>{timeLeft}</div>
              <h2 className="text-xl font-black text-center leading-tight italic px-4">"{quiz?.question}"</h2>
            </div>
            <div className="grid grid-cols-1 gap-4">
              {duelOptions.map((opt: any, idx: number) => (
                <Button key={idx} disabled={answered} onClick={() => handleAnswer(opt.originalIndex)} className={cn(
                  "h-24 rounded-[2.5rem] font-black text-xl border-2 transition-all", 
                  "text-black dark:text-white bg-card border-primary/5",
                  !answered ? "hover:bg-primary/5" : opt.originalIndex === quiz.correctIndex ? "bg-green-500 border-green-600 text-white" : "opacity-40 grayscale"
                )}>
                  {opt.text}
                </Button>
              ))}
            </div>
          </motion.div>
        ) : duel.status === 'finished' ? (
          <motion.div key="finished" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex-1 flex flex-col items-center justify-center space-y-8 text-center">
            <Trophy className={cn("h-32 w-32", duel.winnerId === user?.uid ? "text-yellow-500" : "opacity-10")} />
            <h2 className="text-5xl font-black uppercase italic tracking-tighter">{duel.winnerId === user?.uid ? "Triomphe !" : "Dissonance"}</h2>
            <Button onClick={() => { haptic.light(); router.push("/home"); }} className="w-full h-20 rounded-[3rem] font-black uppercase tracking-[0.4em]">Retour au Sanctuaire</Button>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
