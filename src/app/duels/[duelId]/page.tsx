"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useUser, useFirestore, useDoc, useCollection } from "@/firebase";
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
import { Loader2, Swords, Trophy, Zap, Clock, Sparkles, XCircle, CheckCircle2, User } from "lucide-react";
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

  const duelRef = useMemo(() => db ? doc(db, "duels", duelId) : null, [db, duelId]);
  const { data: duel, loading: duelLoading } = useDoc(duelRef);

  const isChallenger = duel?.challengerId === user?.uid;

  // Charger une question si elle n'existe pas encore dans le duel
  useEffect(() => {
    if (!duel || duel.quizId || !isChallenger || !db) return;

    const fetchQuiz = async () => {
      const q = query(collection(db, "quizzes"), limit(20));
      const snap = await getDocs(q);
      const randomQuiz = snap.docs[Math.floor(Math.random() * snap.docs.length)];
      if (randomQuiz) {
        await updateDoc(duelRef!, { 
          quizId: randomQuiz.id,
          status: 'active'
        });
      }
    };
    fetchQuiz();
  }, [duel, isChallenger, db, duelRef]);

  // Charger les détails de la question
  useEffect(() => {
    if (!duel?.quizId || !db) return;
    const loadQuizDetails = async () => {
      const quizSnap = await getDocs(query(collection(db, "quizzes")));
      const q = quizSnap.docs.find(d => d.id === duel.quizId)?.data();
      if (q) setQuiz(q);
    };
    loadQuizDetails();
  }, [duel?.quizId, db]);

  // Timer
  useEffect(() => {
    if (duel?.status === 'active' && !answered && timeLeft > 0) {
      if (!startTime) setStartTime(Date.now());
      const timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
      return () => clearInterval(timer);
    } else if (timeLeft === 0 && !answered && duel?.status === 'active') {
      handleAnswer(-1);
    }
  }, [duel?.status, answered, timeLeft, startTime]);

  const handleAnswer = async (idx: number) => {
    if (!duel || !user || !db || answered) return;
    
    setAnswered(true);
    const endTime = Date.now();
    const duration = endTime - (startTime || endTime);
    const isCorrect = idx === quiz?.correctIndex;

    const result = {
      answered: true,
      correct: isCorrect,
      time: duration
    };

    const updatePayload = isChallenger 
      ? { challengerResult: result, status: duel.opponentResult?.answered ? 'finished' : 'active' }
      : { opponentResult: result, status: duel.challengerResult?.answered ? 'finished' : 'active' };

    await updateDoc(duelRef!, updatePayload);
    haptic.medium();
  };

  // Calcul du gagnant une fois fini
  useEffect(() => {
    if (duel?.status === 'finished' && duel.challengerResult && duel.opponentResult && !duel.winnerId && db && duelRef) {
      const determineWinner = async () => {
        let winnerId = null;
        
        const c = duel.challengerResult;
        const o = duel.opponentResult;

        if (c.correct && !o.correct) winnerId = duel.challengerId;
        else if (!c.correct && o.correct) winnerId = duel.opponentId;
        else if (c.correct && o.correct) {
          winnerId = c.time < o.time ? duel.challengerId : duel.opponentId;
        } else {
          winnerId = 'draw';
        }

        await updateDoc(duelRef, { winnerId: winnerId });

        // Attribution du pot (Gagnant remporte les 2 mises)
        if (winnerId && winnerId !== 'draw') {
          const winnerRef = doc(db, "users", winnerId);
          await updateDoc(winnerRef, { 
            totalPoints: increment(duel.wager * 2),
            updatedAt: serverTimestamp() 
          });
        } else if (winnerId === 'draw') {
          // Remboursement mutuel en cas d'égalité ou double erreur
          const challengerRef = doc(db, "users", duel.challengerId);
          const opponentRef = doc(db, "users", duel.opponentId);
          await updateDoc(challengerRef, { totalPoints: increment(duel.wager) });
          await updateDoc(opponentRef, { totalPoints: increment(duel.wager) });
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
          <div className="h-16 w-16 rounded-2xl border-2 border-primary/20 overflow-hidden relative">
            {duel.challengerPhoto ? <img src={duel.challengerPhoto} alt="" className="object-cover w-full h-full" /> : <User className="m-auto opacity-20" />}
          </div>
          <span className="text-[10px] font-black uppercase">@{duel.challengerName}</span>
          {duel.challengerResult?.answered && (duel.challengerResult.correct ? <CheckCircle2 className="text-green-500 h-4 w-4" /> : <XCircle className="text-red-500 h-4 w-4" />)}
        </div>

        <div className="flex flex-col items-center gap-1">
          <div className="bg-primary text-primary-foreground px-4 py-1 rounded-full text-[10px] font-black uppercase shadow-lg shadow-primary/20">vs</div>
          <Zap className="h-4 w-4 text-yellow-500 fill-current animate-pulse" />
          <span className="text-xs font-black">{duel.wager} PTS</span>
        </div>

        <div className="flex flex-col items-center gap-2">
          <div className="h-16 w-16 rounded-2xl border-2 border-primary/20 overflow-hidden relative">
            {duel.opponentPhoto ? <img src={duel.opponentPhoto} alt="" className="object-cover w-full h-full" /> : <User className="m-auto opacity-20" />}
          </div>
          <span className="text-[10px] font-black uppercase">@{duel.opponentName}</span>
          {duel.opponentResult?.answered && (duel.opponentResult.correct ? <CheckCircle2 className="text-green-500 h-4 w-4" /> : <XCircle className="text-red-500 h-4 w-4" />)}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {duel.status === 'accepted' ? (
          <motion.div key="waiting" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 flex flex-col items-center justify-center text-center space-y-4">
            <Loader2 className="h-10 w-10 animate-spin opacity-20" />
            <p className="text-xs font-black uppercase tracking-widest opacity-40">L'Oracle prépare l'épreuve...</p>
          </motion.div>
        ) : duel.status === 'active' ? (
          <motion.div key="battle" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex-1 flex flex-col space-y-8">
            <div className="flex flex-col items-center gap-4">
              <div className="h-16 w-16 rounded-full border-4 border-primary/10 flex items-center justify-center font-black text-2xl tabular-nums">
                {timeLeft}
              </div>
              <h2 className="text-xl font-black text-center px-4 leading-tight">{quiz?.question}</h2>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {quiz?.options.map((opt: string, idx: number) => (
                <Button 
                  key={idx} 
                  disabled={answered} 
                  onClick={() => handleAnswer(idx)} 
                  className="h-20 rounded-2xl font-bold text-lg shadow-xl active:scale-95 transition-transform"
                >
                  {opt}
                </Button>
              ))}
            </div>
          </motion.div>
        ) : duel.status === 'finished' ? (
          <motion.div key="result" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex-1 flex flex-col items-center justify-center space-y-8">
            <div className="relative h-32 w-32 bg-primary/5 rounded-[3rem] flex items-center justify-center">
              {duel.winnerId === user?.uid ? (
                <div className="relative">
                  <Trophy className="h-16 w-16 text-yellow-500" />
                  <motion.div animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }} transition={{ duration: 2, repeat: Infinity }} className="absolute inset-0 bg-yellow-500/20 rounded-full blur-xl" />
                </div>
              ) : (
                <XCircle className="h-16 w-16 opacity-20" />
              )}
            </div>
            <div className="text-center space-y-2">
              <h2 className="text-4xl font-black uppercase tracking-tighter italic">
                {duel.winnerId === user?.uid ? "Triomphe !" : duel.winnerId === 'draw' ? "Équilibre" : "Dissonance"}
              </h2>
              <p className="text-sm opacity-40 px-8">
                {duel.winnerId === user?.uid 
                  ? `Vous avez récolté le pot de ${duel.wager * 2} PTS.` 
                  : duel.winnerId === 'draw' 
                    ? "L'équilibre est maintenu. Mises restituées." 
                    : "Votre adversaire a résonné plus promptement."}
              </p>
            </div>
            <Button onClick={() => router.push("/home")} className="w-full h-16 rounded-3xl font-black uppercase tracking-widest shadow-2xl shadow-primary/20">Retour au Sanctuaire</Button>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}