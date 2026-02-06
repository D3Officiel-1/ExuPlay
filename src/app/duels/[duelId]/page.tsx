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
import { Loader2, Swords, Trophy, Zap, Clock, XCircle, CheckCircle2, User, RefreshCw } from "lucide-react";
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

  const duelRef = useMemo(() => db ? doc(db, "duels", duelId) : null, [db, duelId]);
  const { data: duel, loading: duelLoading } = useDoc(duelRef);

  const isChallenger = duel?.challengerId === user?.uid;

  useEffect(() => {
    if (!duel || duel.quizId || !isChallenger || !db || duel.status !== 'active') return;
    const fetchQuiz = async () => {
      try {
        const q = query(collection(db, "quizzes"), limit(50));
        const snap = await getDocs(q);
        const randomQuiz = snap.docs[Math.floor(Math.random() * snap.docs.length)];
        if (randomQuiz) { await updateDoc(duelRef!, { quizId: randomQuiz.id, status: 'active' }); }
      } catch (e) {}
    };
    fetchQuiz();
  }, [duel?.quizId, duel?.status, isChallenger, db, duelRef]);

  useEffect(() => {
    if (!duel?.quizId || !db) return;
    const loadQuizDetails = async () => {
      try {
        const quizSnap = await getDocs(query(collection(db, "quizzes")));
        const q = quizSnap.docs.find(d => d.id === duel.quizId)?.data();
        if (q) { setQuiz(q); setAnswered(false); setTimeLeft(15); setStartTime(Date.now()); setIsResetting(false); }
      } catch (e) {}
    };
    loadQuizDetails();
  }, [duel?.quizId, db]);

  useEffect(() => {
    if (duel?.status === 'active' && !answered && timeLeft > 0 && quiz) {
      const timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
      return () => clearInterval(timer);
    } else if (timeLeft === 0 && !answered && duel?.status === 'active' && quiz) { handleAnswer(-1); }
  }, [duel?.status, answered, timeLeft, quiz]);

  const handleAnswer = async (idx: number) => {
    if (!duel || !user || !db || answered || isResetting) return;
    setAnswered(true); haptic.medium();
    const isCorrect = idx === quiz?.correctIndex;
    const result = { answered: true, correct: isCorrect, time: Date.now() - (startTime || Date.now()) };
    const otherResult = isChallenger ? duel.opponentResult : duel.challengerResult;
    let updatePayload: any = isChallenger ? { challengerResult: result } : { opponentResult: result };

    if (otherResult?.answered) {
      if (isCorrect || otherResult.correct) { updatePayload.status = 'finished'; }
      else {
        setIsResetting(true); toast({ title: "Double Échec", description: "Nouvelle manche..." });
        setTimeout(async () => {
          await updateDoc(duelRef!, { challengerResult: null, opponentResult: null, quizId: null, status: 'active', round: increment(1) });
        }, 2000); return;
      }
    } else { updatePayload.status = 'active'; }
    await updateDoc(duelRef!, updatePayload);
  };

  useEffect(() => {
    if (duel?.status === 'finished' && duel.challengerResult && duel.opponentResult && !duel.winnerId && db && duelRef) {
      const determineWinner = async () => {
        let winnerId = null; const c = duel.challengerResult; const o = duel.opponentResult;
        if (c.correct && !o.correct) winnerId = duel.challengerId;
        else if (!c.correct && o.correct) winnerId = duel.opponentId;
        else if (c.correct && o.correct) { winnerId = c.time < o.time ? duel.challengerId : duel.opponentId; }
        else { winnerId = 'draw'; }
        await updateDoc(duelRef, { winnerId: winnerId, finishedAt: serverTimestamp() });
        if (winnerId && winnerId !== 'draw') {
          await updateDoc(doc(db, "users", winnerId), { totalPoints: increment(duel.wager * 2), updatedAt: serverTimestamp() });
        }
      };
      determineWinner();
    }
  }, [duel, db, duelRef]);

  if (duelLoading || !duel) return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="animate-spin opacity-20" /></div>;

  return (
    <div className="min-h-screen bg-background flex flex-col p-6 pt-24 space-y-8">
      <div className="flex items-center justify-between px-2">
        <div className="flex flex-col items-center gap-2">
          <div className={cn("h-16 w-16 rounded-2xl border-2 overflow-hidden relative", duel.challengerResult?.answered ? (duel.challengerResult.correct ? "border-green-500 shadow-lg" : "border-red-500") : "border-primary/20")}>
            {duel.challengerPhoto ? <img src={duel.challengerPhoto} alt="" className="object-cover w-full h-full" /> : <User className="m-auto opacity-20" />}
          </div>
          <span className="text-[9px] font-black uppercase">@{duel.challengerName}</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <div className="bg-primary text-primary-foreground px-4 py-1 rounded-full text-[10px] font-black uppercase">vs</div>
          <p className="text-[8px] font-bold opacity-30 uppercase">Manche {duel.round || 1}</p>
        </div>
        <div className="flex flex-col items-center gap-2">
          <div className={cn("h-16 w-16 rounded-2xl border-2 overflow-hidden relative", duel.opponentResult?.answered ? (duel.opponentResult.correct ? "border-green-500 shadow-lg" : "border-red-500") : "border-primary/20")}>
            {duel.opponentPhoto ? <img src={duel.opponentPhoto} alt="" className="object-cover w-full h-full" /> : <User className="m-auto opacity-20" />}
          </div>
          <span className="text-[9px] font-black uppercase">@{duel.opponentName}</span>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {duel.status === 'pending' || (duel.status === 'active' && !quiz) || isResetting ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 flex flex-col items-center justify-center text-center space-y-6">
            <RefreshCw className="h-12 w-12 animate-spin opacity-20" /><p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40">L'Oracle prépare l'épreuve...</p>
          </motion.div>
        ) : duel.status === 'active' ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex-1 flex flex-col space-y-10">
            <div className="flex flex-col items-center gap-6">
              <div className="h-20 w-20 rounded-full border-4 flex items-center justify-center font-black text-3xl tabular-nums shadow-2xl">{timeLeft}</div>
              <h2 className="text-2xl font-black text-center leading-tight">"{quiz?.question}"</h2>
            </div>
            <div className="grid grid-cols-1 gap-4">
              {quiz?.options.map((opt: string, idx: number) => (
                <Button key={idx} disabled={answered} onClick={() => handleAnswer(idx)} className={cn("h-20 rounded-[2rem] font-bold text-lg", answered && idx === quiz.correctIndex ? "bg-green-500" : "")}>{opt}</Button>
              ))}
            </div>
          </motion.div>
        ) : duel.status === 'finished' ? (
          <div className="flex-1 flex flex-col items-center justify-center space-y-10 text-center">
            <Trophy className={cn("h-20 w-20", duel.winnerId === user?.uid ? "text-yellow-500" : "opacity-10")} />
            <h2 className="text-5xl font-black uppercase italic">{duel.winnerId === user?.uid ? "Triomphe !" : "Dissonance"}</h2>
            <Button onClick={() => router.push("/home")} className="w-full h-20 rounded-[2.5rem] font-black uppercase tracking-[0.3em]">Retour au Sanctuaire</Button>
          </div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
