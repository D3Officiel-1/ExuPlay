
"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useUser, useFirestore, useCollection } from "@/firebase";
import { 
  collection, 
  doc, 
  updateDoc, 
  increment, 
  serverTimestamp,
  query,
  orderBy,
  setDoc,
  Timestamp
} from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { BottomNav } from "@/components/BottomNav";
import { Header } from "@/components/Header";
import { Trophy, CheckCircle2, XCircle, ArrowRight, Loader2, Sparkles, Brain, Play, Timer } from "lucide-react";
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';

export function SpoilerOverlay() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 1.02 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.05, filter: "blur(30px)" }}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      className="absolute inset-0 z-10 overflow-hidden rounded-2xl pointer-events-none"
    >
      <div className="absolute inset-0 bg-card/95 backdrop-blur-[40px] z-0" />
      
      <motion.div
        animate={{
          opacity: [0.2, 0.4, 0.2],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute inset-0 z-10 opacity-30 pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          backgroundSize: "180px 180px",
        }}
      />

      <motion.div 
        animate={{ 
          opacity: [0.05, 0.15, 0.05],
          rotate: [0, 45, 0],
        }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        className="absolute inset-[-50%] bg-gradient-to-tr from-primary/10 via-transparent to-primary/5 z-20"
      />
    </motion.div>
  );
}

export default function HomePage() {
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [quizComplete, setQuizComplete] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [quizStarted, setQuizStarted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(15);
  const [sessionQuizzes, setSessionQuizzes] = useState<any[] | null>(null);
  
  const { user } = useUser();
  const db = useFirestore();

  const quizzesQuery = useMemo(() => {
    if (!db) return null;
    return query(collection(db, "quizzes"), orderBy("createdAt", "asc"));
  }, [db]);

  const attemptsQuery = useMemo(() => {
    if (!db || !user?.uid) return null;
    return collection(db, "users", user.uid, "attempts");
  }, [db, user?.uid]);

  const { data: allQuizzes, loading: quizzesLoading } = useCollection(quizzesQuery);
  const { data: attempts, loading: attemptsLoading } = useCollection(attemptsQuery);

  useEffect(() => {
    if (allQuizzes && attempts && sessionQuizzes === null) {
      const completedIds = attempts.filter(a => a.status === "completed").map(a => a.id);
      const filtered = allQuizzes.filter(q => !completedIds.includes(q.id));
      setSessionQuizzes(filtered);
    }
  }, [allQuizzes, attempts, sessionQuizzes]);

  useEffect(() => {
    if (!quizStarted && sessionQuizzes && attempts && user) {
      const currentQuiz = sessionQuizzes[currentQuestionIdx];
      if (!currentQuiz) return;

      const existingAttempt = attempts.find(a => a.id === currentQuiz.id);
      
      if (existingAttempt && existingAttempt.status === "started" && existingAttempt.startedAt) {
        const startTime = (existingAttempt.startedAt as Timestamp).toMillis();
        const now = Date.now();
        const elapsed = Math.floor((now - startTime) / 1000);
        const remaining = 15 - elapsed;

        if (remaining > 0) {
          setQuizStarted(true);
          setTimeLeft(remaining);
        } else {
          setQuizStarted(true);
          setTimeLeft(0);
          setIsAnswered(true);
          const attemptRef = doc(db, "users", user.uid, "attempts", currentQuiz.id);
          updateDoc(attemptRef, { status: "completed", updatedAt: serverTimestamp() }).catch(() => {});
        }
      }
    }
  }, [quizStarted, sessionQuizzes, currentQuestionIdx, attempts, user, db]);

  const finishQuiz = useCallback(async () => {
    setQuizComplete(true);
    if (user && score > 0 && db) {
      setUpdating(true);
      const userRef = doc(db, "users", user.uid);
      
      updateDoc(userRef, {
        totalPoints: increment(score),
        lastQuizAt: serverTimestamp()
      }).catch(async (error) => {
        const permissionError = new FirestorePermissionError({
          path: userRef.path,
          operation: 'update',
          requestResourceData: { totalPoints: score },
        } satisfies SecurityRuleContext);
        errorEmitter.emit('permission-error', permissionError);
      }).finally(() => {
        setUpdating(false);
      });
    }
  }, [user, score, db]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (quizStarted && !isAnswered && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && !isAnswered && quizStarted) {
      setIsAnswered(true);
      if (user && sessionQuizzes) {
        const currentQuiz = sessionQuizzes[currentQuestionIdx];
        const attemptRef = doc(db, "users", user.uid, "attempts", currentQuiz.id);
        updateDoc(attemptRef, {
          status: "completed",
          score: 0,
          updatedAt: serverTimestamp()
        }).catch(() => {});
      }
    }
    return () => clearInterval(timer);
  }, [quizStarted, isAnswered, timeLeft, user, sessionQuizzes, currentQuestionIdx, db]);

  const handleStartChallenge = async () => {
    if (!user || !sessionQuizzes || !db) return;
    const currentQuiz = sessionQuizzes[currentQuestionIdx];
    
    setQuizStarted(true);
    setTimeLeft(15);

    const attemptRef = doc(db, "users", user.uid, "attempts", currentQuiz.id);
    setDoc(attemptRef, {
      quizId: currentQuiz.id,
      status: "started",
      startedAt: serverTimestamp(),
      attemptedAt: serverTimestamp()
    }).catch((error) => {
      const permissionError = new FirestorePermissionError({
        path: attemptRef.path,
        operation: 'create',
        requestResourceData: { quizId: currentQuiz.id, status: "started" },
      } satisfies SecurityRuleContext);
      errorEmitter.emit('permission-error', permissionError);
    });
  };

  const handleAnswer = (index: number) => {
    if (!quizStarted || isAnswered || !sessionQuizzes || !db) return;
    const currentQuiz = sessionQuizzes[currentQuestionIdx];
    setSelectedOption(index);
    setIsAnswered(true);
    
    const isCorrect = index === currentQuiz.correctIndex;
    if (isCorrect) {
      setScore(prev => prev + (currentQuiz.points || 100));
    }

    if (user) {
      const attemptRef = doc(db, "users", user.uid, "attempts", currentQuiz.id);
      updateDoc(attemptRef, {
        status: "completed",
        score: isCorrect ? currentQuiz.points : 0,
        userAnswerIndex: index,
        updatedAt: serverTimestamp()
      }).catch(() => {});
    }
  };

  const nextQuestion = () => {
    if (!sessionQuizzes) return;
    if (currentQuestionIdx < sessionQuizzes.length - 1) {
      setCurrentQuestionIdx(prev => prev + 1);
      setSelectedOption(null);
      setIsAnswered(false);
      setQuizStarted(false);
      setTimeLeft(15);
    } else {
      finishQuiz();
    }
  };

  const resetSession = () => {
    setSessionQuizzes(null);
    setQuizComplete(false);
    setCurrentQuestionIdx(0);
    setSelectedOption(null);
    setIsAnswered(false);
    setQuizStarted(false);
    setScore(0);
    setTimeLeft(15);
  };

  if (quizzesLoading || attemptsLoading || sessionQuizzes === null) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <Loader2 className="h-8 w-8 animate-spin opacity-20 mb-4" />
        <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">Connexion à l'Éveil...</p>
      </div>
    );
  }

  if (sessionQuizzes.length === 0) {
    return (
      <div className="min-h-screen bg-background flex flex-col pb-32">
        <Header />
        <main className="flex-1 flex flex-col items-center justify-center p-6 pt-24 space-y-8">
          <div className="mx-auto w-24 h-24 bg-primary/5 rounded-[2.5rem] flex items-center justify-center border border-primary/10 shadow-2xl">
            <Brain className="h-10 w-10 text-primary opacity-20" />
          </div>
          <div className="space-y-2 text-center">
            <h2 className="text-2xl font-black uppercase tracking-tight">C'est le calme plat</h2>
            <p className="text-xs font-medium opacity-40">Vous avez relevé tous les défis disponibles. Revenez plus tard pour de nouveaux éveils.</p>
          </div>
          <Button onClick={resetSession} variant="ghost" className="text-[10px] font-black uppercase tracking-widest opacity-60">
            Actualiser les défis
          </Button>
        </main>
        <BottomNav />
      </div>
    );
  }

  const question = sessionQuizzes[currentQuestionIdx];

  return (
    <div className="min-h-screen bg-background flex flex-col pb-32">
      <Header />
      
      <main className="flex-1 flex items-center justify-center p-6 pt-24">
        <div className="w-full max-w-lg">
          <AnimatePresence mode="wait">
            {!quizComplete ? (
              <motion.div
                key={question?.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                className="space-y-8"
              >
                {quizStarted && !isAnswered && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col items-center gap-2"
                  >
                    <div className="flex items-center gap-2 px-4 py-2 bg-primary/5 rounded-full border border-primary/10">
                      <Timer className={`h-4 w-4 ${timeLeft <= 3 ? 'text-red-500 animate-pulse' : 'text-primary opacity-60'}`} />
                      <span className={`text-xs font-black tabular-nums tracking-widest ${timeLeft <= 3 ? 'text-red-500' : 'opacity-40'}`}>
                        {timeLeft} SECONDES
                      </span>
                    </div>
                    <div className="w-32 h-1 bg-primary/5 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: "100%" }}
                        animate={{ width: `${(timeLeft / 15) * 100}%` }}
                        transition={{ duration: 1, ease: "linear" }}
                        className={`h-full ${timeLeft <= 3 ? 'bg-red-500' : 'bg-primary'}`}
                      />
                    </div>
                  </motion.div>
                )}

                <Card className="border-none bg-card/40 backdrop-blur-3xl shadow-2xl rounded-[2.5rem] overflow-hidden">
                  <CardContent className="p-8 sm:p-12 space-y-10">
                    <p className="text-xl sm:text-2xl font-medium leading-tight tracking-tight text-center">
                      {question?.question}
                    </p>

                    <div className="relative">
                      <div className="grid grid-cols-2 gap-3">
                        {question?.options.map((option: string, idx: number) => {
                          const isCorrect = idx === question.correctIndex;
                          const isSelected = idx === selectedOption;
                          
                          return (
                            <div key={idx} className="relative">
                              <motion.button
                                whileHover={(!isAnswered && quizStarted) ? { scale: 1.02 } : {}}
                                whileTap={(!isAnswered && quizStarted) ? { scale: 0.98 } : {}}
                                onClick={() => handleAnswer(idx)}
                                disabled={isAnswered || !quizStarted}
                                className={`
                                  w-full p-4 md:p-6 rounded-2xl text-left font-bold transition-all duration-300 flex items-center justify-between border min-h-[80px]
                                  ${!isAnswered 
                                    ? "bg-background/50 border-primary/5 hover:border-primary/20" 
                                    : isCorrect 
                                      ? "bg-green-500/10 border-green-500/50 text-green-600 dark:text-green-400" 
                                      : isSelected 
                                        ? "bg-red-500/10 border-red-500/50 text-red-600 dark:text-red-400" 
                                        : "bg-background/20 border-transparent opacity-40"}
                                `}
                              >
                                <span className="text-sm md:text-base leading-tight">{option}</span>
                                <div className="shrink-0 ml-2">
                                  {isAnswered && isCorrect && <CheckCircle2 className="h-4 w-4 md:h-5 md:w-5" />}
                                  {isAnswered && isSelected && !isCorrect && <XCircle className="h-4 w-4 md:h-5 md:w-5" />}
                                </div>
                              </motion.button>
                              
                              <AnimatePresence>
                                {!quizStarted && (
                                  <SpoilerOverlay key="spoiler" />
                                )}
                              </AnimatePresence>
                            </div>
                          );
                        })}
                      </div>

                      <AnimatePresence>
                        {!quizStarted && (
                          <motion.div 
                            initial={{ opacity: 0, scale: 0.8, filter: "blur(10px)" }}
                            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                            exit={{ opacity: 0, scale: 1.2, filter: "blur(15px)" }}
                            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                            className="absolute inset-0 z-20 flex items-center justify-center"
                          >
                            <motion.div
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                            >
                              <Button 
                                onClick={handleStartChallenge}
                                className="h-16 px-10 rounded-2xl font-black text-xs uppercase tracking-widest gap-3 shadow-[0_20px_40px_rgba(var(--primary-rgb),0.3)] bg-primary text-primary-foreground relative overflow-hidden group"
                              >
                                <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
                                <Play className="h-5 w-5 fill-current relative z-10" />
                                <span className="relative z-10">Démarrer le défi</span>
                              </Button>
                            </motion.div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    <AnimatePresence>
                      {(isAnswered || (timeLeft === 0 && quizStarted)) && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="pt-4"
                        >
                          <Button 
                            onClick={nextQuestion} 
                            className="w-full h-16 rounded-2xl font-black text-xs uppercase tracking-widest gap-3 shadow-xl shadow-primary/20"
                          >
                            {currentQuestionIdx === sessionQuizzes.length - 1 ? "Terminer" : "Défi Suivant"}
                            <ArrowRight className="h-4 w-4" />
                          </Button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </CardContent>
                </Card>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center space-y-10"
              >
                <div className="relative inline-block">
                  <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full scale-150 animate-pulse" />
                  <div className="relative h-32 w-32 bg-card rounded-[2.5rem] flex items-center justify-center border border-primary/10 shadow-2xl">
                    <Trophy className="h-16 w-16 text-primary" />
                  </div>
                </div>

                <div className="space-y-2">
                  <h2 className="text-4xl font-black tracking-tight">Session Terminée</h2>
                  <p className="text-muted-foreground font-medium">Votre esprit s'est enrichi. Vos points ont été synchronisés.</p>
                </div>

                <div className="p-10 bg-card/40 backdrop-blur-3xl rounded-[3rem] border border-primary/5 shadow-2xl">
                  <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40 mb-2">Points Récoltés</p>
                  <p className="text-6xl font-black tabular-nums">+{score}</p>
                </div>

                <div className="flex flex-col gap-4">
                  <Button 
                    onClick={resetSession} 
                    disabled={updating}
                    className="w-full h-16 rounded-2xl font-black text-xs uppercase tracking-widest gap-3"
                  >
                    {updating ? <Loader2 className="animate-spin h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
                    Voir mes nouveaux défis
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
