"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useUser, useFirestore, useCollection, useDoc } from "@/firebase";
import { 
  collection, 
  doc, 
  updateDoc, 
  setDoc,
  increment, 
  serverTimestamp,
  query,
  orderBy,
  where,
  limit,
  getDocs
} from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Trophy, CheckCircle2, XCircle, ArrowRight, Loader2, Sparkles, Brain, Timer, Zap, Users, Star, AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";
import { haptic } from "@/lib/haptics";
import { useToast } from "@/hooks/use-toast";

export function SpoilerOverlay() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 1.02 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ 
        opacity: 0, 
        scale: 1.1, 
        filter: "blur(40px)",
        transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] } 
      }}
      className="absolute inset-0 z-10 overflow-hidden rounded-[2rem] pointer-events-none"
    >
      <div className="absolute inset-0 bg-card/90 backdrop-blur-[45px] z-0 rounded-[2rem]" />
      <div className="absolute inset-0 bg-background/30 backdrop-blur-xl -z-10 rounded-[2rem]" />
      <motion.div
        animate={{ opacity: [0.03, 0.06, 0.03] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        className="absolute inset-0 z-10 opacity-5 pointer-events-none rounded-[2rem]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          backgroundSize: "120px 120px",
        }}
      />
      <motion.div 
        animate={{ scale: [1, 1.2, 1], x: [0, 30, 0], y: [0, -20, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-[-20%] left-[-10%] w-[80%] h-[80%] bg-primary/5 rounded-full blur-[100px] z-20"
      />
      <motion.div 
        animate={{ scale: [1, 1.3, 1], x: [0, -40, 0], y: [0, 30, 0] }}
        transition={{ duration: 15, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        className="absolute bottom-[-20%] right-[-10%] w-[80%] h-[80%] bg-primary/5 rounded-full blur-[100px] z-20"
      />
    </motion.div>
  );
}

function GlobalActivityTicker() {
  const db = useFirestore();
  const transfersQuery = useMemo(() => {
    if (!db) return null;
    return query(collection(db, "transfers"), orderBy("timestamp", "desc"), limit(1));
  }, [db]);

  const { data: recentTransfers } = useCollection(transfersQuery);
  const transfer = recentTransfers?.[0];

  return (
    <AnimatePresence mode="wait">
      {transfer && (
        <motion.div 
          key={transfer.id}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          className="flex items-center gap-2 px-4 py-1.5 bg-primary/5 border border-primary/5 rounded-full backdrop-blur-md"
        >
          <div className="flex -space-x-2">
            <div className="h-4 w-4 rounded-full bg-primary/10 flex items-center justify-center border border-background">
              <Users className="h-2 w-2 text-primary" />
            </div>
          </div>
          <p className="text-[9px] font-black uppercase tracking-widest opacity-60">
            <span className="text-primary">@{transfer.fromName}</span> a transmis <span className="text-primary">{transfer.amount} PTS</span>
          </p>
          <Zap className="h-2.5 w-2.5 text-primary animate-pulse" />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function HomePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [sessionQuizzes, setSessionQuizzes] = useState<any[]>([]);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [quizComplete, setQuizComplete] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [quizStarted, setQuizStarted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(15);
  const [showPointsPreview, setShowPointsPreview] = useState(false);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  
  const { user } = useUser();
  const db = useFirestore();

  const userRef = useMemo(() => (db && user?.uid ? doc(db, "users", user.uid) : null), [db, user?.uid]);
  const { data: profile } = useDoc(userRef);

  const quizzesQuery = useMemo(() => {
    if (!db) return null;
    return query(collection(db, "quizzes"), orderBy("createdAt", "asc"));
  }, [db]);

  const { data: allQuizzes, loading: quizzesLoading } = useCollection(quizzesQuery);

  const attemptsQuery = useMemo(() => {
    if (!db || !user?.uid) return null;
    return collection(db, "users", user.uid, "attempts");
  }, [db, user?.uid]);

  const { data: userAttempts, loading: attemptsLoading } = useCollection(attemptsQuery);

  useEffect(() => {
    if (allQuizzes && userAttempts !== null && sessionQuizzes.length === 0) {
      const playedQuizIds = new Set(
        (userAttempts as any[])
          .filter(attempt => attempt.isPlayed === true)
          .map(attempt => attempt.id)
      );

      const availableQuizzes = allQuizzes.filter(quiz => !playedQuizIds.has(quiz.id));
      const shuffled = [...availableQuizzes].sort(() => Math.random() - 0.5);
      setSessionQuizzes(shuffled);
    }
  }, [allQuizzes, userAttempts, sessionQuizzes.length]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (quizStarted && !isAnswered && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && !isAnswered && quizStarted) {
      handleAnswer(-1);
    }
    return () => clearInterval(timer);
  }, [quizStarted, isAnswered, timeLeft]);

  const handleStartChallenge = async () => {
    if (!user || !db || sessionQuizzes.length === 0 || updating) return;
    
    haptic.medium();
    const currentQuiz = sessionQuizzes[currentQuestionIdx];
    const attemptRef = doc(db, "users", user.uid, "attempts", currentQuiz.id);
    
    const startTime = new Date();
    const endTime = new Date(startTime.getTime() + 15000);

    setUpdating(true);
    try {
      await setDoc(attemptRef, {
        attemptedAt: startTime,
        completedAt: endTime,
        isPlayed: false,
        status: 'started'
      }, { merge: true });
      
      setQuizStarted(true);
      setShowPointsPreview(false);
      setTimeLeft(15);
    } catch (error) {
      console.error("Erreur lors du démarrage du défi:", error);
    } finally {
      setUpdating(false);
    }
  };

  const handleLongPressStart = () => {
    if (updating || quizStarted) return;
    longPressTimer.current = setTimeout(() => {
      haptic.light();
      setShowPointsPreview(prev => !prev);
    }, 600);
  };

  const handleLongPressEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
    }
  };

  const handleAnswer = async (index: number) => {
    if (!quizStarted || isAnswered || sessionQuizzes.length === 0 || !user || !db) return;
    
    const currentQuiz = sessionQuizzes[currentQuestionIdx];
    const isCorrect = index === currentQuiz.correctIndex;
    const isTimeout = index === -1;
    const pointsEarned = isCorrect ? (currentQuiz.points || 100) : 0;

    let penalty = 0;
    if (isTimeout && profile && (profile.totalPoints || 0) > 10) {
      penalty = -10;
      toast({
        variant: "destructive",
        title: "Temps Épuisé",
        description: "Votre esprit a hésité. -10 PTS de Lumière.",
      });
    }

    if (isCorrect) haptic.success(); 
    else haptic.error();

    setSelectedOption(index);
    setIsAnswered(true);
    
    if (isCorrect) {
      setScore(prev => prev + pointsEarned);
    }

    const attemptRef = doc(db, "users", user.uid, "attempts", currentQuiz.id);
    const userDocRef = doc(db, "users", user.uid);

    setUpdating(true);
    try {
      await updateDoc(attemptRef, {
        isPlayed: true,
        status: 'completed',
        score: pointsEarned,
        userAnswerIndex: index,
        isTimeout: isTimeout,
        updatedAt: serverTimestamp()
      });

      const totalChange = pointsEarned + penalty;
      
      if (totalChange !== 0) {
        const updatePayload: any = {
          totalPoints: increment(totalChange),
          lastQuizAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };

        if (pointsEarned > 0 && profile && profile.referredBy && !profile.referralRewardClaimed) {
          const newTotal = (profile.totalPoints || 0) + pointsEarned;
          if (newTotal >= 100) {
            const referrersQuery = query(
              collection(db, "users"), 
              where("referralCode", "==", profile.referredBy), 
              limit(1)
            );
            const referrerSnap = await getDocs(referrersQuery);
            if (!referrerSnap.empty) {
              await updateDoc(referrerSnap.docs[0].ref, {
                totalPoints: increment(100),
                updatedAt: serverTimestamp()
              });
              updatePayload.referralRewardClaimed = true;
            }
          }
        }
        await updateDoc(userDocRef, updatePayload);
      }
    } catch (error) {
      console.error("Erreur lors de la finalisation de la réponse:", error);
    } finally {
      setUpdating(false);
    }
  };

  const nextQuestion = () => {
    haptic.light();
    if (sessionQuizzes.length === 0) return;
    if (currentQuestionIdx < sessionQuizzes.length - 1) {
      setCurrentQuestionIdx(prev => prev + 1);
      setSelectedOption(null);
      setIsAnswered(false);
      setQuizStarted(false);
      setShowPointsPreview(false);
      setTimeLeft(15);
    } else {
      setQuizComplete(true);
      haptic.impact();
      if (score === sessionQuizzes.length * 100) {
        haptic.success();
      }
    }
  };

  const resetSession = () => {
    haptic.medium();
    setSessionQuizzes([]);
    setQuizComplete(false);
    setCurrentQuestionIdx(0);
    setSelectedOption(null);
    setIsAnswered(false);
    setQuizStarted(false);
    setShowPointsPreview(false);
    setScore(0);
    setTimeLeft(15);
  };

  if (quizzesLoading || attemptsLoading || (allQuizzes && userAttempts !== null && sessionQuizzes.length === 0 && allQuizzes.length > 0)) {
    return (
      <div className="min-h-screen bg-background flex flex-col pb-32 items-center justify-center p-6 text-center">
        <Loader2 className="h-10 w-10 animate-spin opacity-20 mb-6" />
        <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40 animate-pulse">Synchronisation de l'Éveil</p>
      </div>
    );
  }

  if (!allQuizzes || sessionQuizzes.length === 0) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <main className="flex-1 flex flex-col items-center justify-center p-6 pt-24 space-y-10">
          <div className="relative">
            <div className="absolute inset-0 bg-primary/10 blur-3xl rounded-full scale-150" />
            <div className="relative mx-auto w-24 h-24 bg-card rounded-[2.5rem] flex items-center justify-center border border-primary/5 shadow-2xl">
              <Brain className="h-10 w-10 text-primary opacity-20" />
            </div>
          </div>
          <div className="space-y-3 text-center max-w-xs">
            <h2 className="text-3xl font-black uppercase tracking-tight italic">Cycle Épuisé</h2>
            <p className="text-sm font-medium opacity-40 leading-relaxed">Vous avez triomphé de tous les défis. Revenez plus tard pour de nouvelles épreuves.</p>
          </div>
          <Button 
            variant="ghost" 
            onClick={() => router.push("/profil")}
            className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40 hover:opacity-100 transition-opacity"
          >
            Consulter mon Sceau
          </Button>
        </main>
      </div>
    );
  }

  const question = sessionQuizzes[currentQuestionIdx];

  return (
    <div className="min-h-screen bg-background flex flex-col pb-32">
      <main className="flex-1 flex flex-col items-center justify-center p-6 pt-24 space-y-6">
        <GlobalActivityTicker />

        <div className="w-full max-w-lg">
          <AnimatePresence mode="wait">
            {!quizComplete ? (
              <motion.div
                key={question?.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                className="space-y-8"
              >
                {quizStarted && !isAnswered && (
                  <motion.div 
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col items-center gap-4"
                  >
                    <div className="flex items-center gap-3 px-6 py-3 bg-card/40 backdrop-blur-3xl rounded-2xl border border-primary/10 shadow-xl">
                      <Timer className={`h-5 w-5 ${timeLeft <= 5 ? 'text-red-500 animate-pulse' : 'text-primary/60'}`} />
                      <span className={`text-lg font-black tabular-nums tracking-widest ${timeLeft <= 5 ? 'text-red-500' : 'opacity-60'}`}>
                        {timeLeft}s
                      </span>
                    </div>
                    <div className="w-48 h-1.5 bg-primary/5 rounded-full overflow-hidden border border-primary/5">
                      <motion.div 
                        initial={{ width: "100%" }}
                        animate={{ width: `${(timeLeft / 15) * 100}%` }}
                        transition={{ duration: 1, ease: "linear" }}
                        className={`h-full ${timeLeft <= 5 ? 'bg-red-500' : 'bg-primary'}`}
                      />
                    </div>
                  </motion.div>
                )}

                <Card className="border-none bg-card/40 backdrop-blur-3xl shadow-2xl rounded-[3rem] overflow-hidden relative">
                  <CardContent className="p-8 sm:p-12 space-y-12">
                    <div className="relative min-h-[140px] flex items-center justify-center overflow-hidden rounded-[2rem]">
                      <p className="text-xl sm:text-2xl font-black leading-tight tracking-tight text-center px-4">
                        {question?.question}
                      </p>

                      <AnimatePresence>
                        {!quizStarted && (
                          <>
                            <SpoilerOverlay key="question-mask" />
                            <motion.div 
                              initial={{ opacity: 0, scale: 0.9, filter: "blur(10px)" }}
                              animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                              exit={{ opacity: 0, scale: 1.15, filter: "blur(20px)" }}
                              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                              className="absolute inset-0 z-20 flex items-center justify-center"
                            >
                              <div className="text-center">
                                <AnimatePresence mode="wait">
                                  {!showPointsPreview ? (
                                    <motion.button
                                      key="reveal-button"
                                      layoutId="reveal-element"
                                      onContextMenu={(e) => {
                                        e.preventDefault();
                                        haptic.light();
                                        setShowPointsPreview(true);
                                      }}
                                      onPointerDown={handleLongPressStart}
                                      onPointerUp={handleLongPressEnd}
                                      onPointerLeave={handleLongPressEnd}
                                      onClick={handleStartChallenge}
                                      disabled={updating}
                                      className="h-16 px-12 rounded-2xl font-black text-[10px] uppercase tracking-[0.4em] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] bg-background text-foreground hover:bg-primary hover:text-primary-foreground transition-all duration-500 active:scale-95 group relative overflow-hidden"
                                    >
                                      {updating ? (
                                        <Loader2 className="h-5 w-5 animate-spin" />
                                      ) : (
                                        "Dévoiler l'Inconnu"
                                      )}
                                    </motion.button>
                                  ) : (
                                    <motion.div
                                      key="points-preview"
                                      layoutId="reveal-element"
                                      onContextMenu={(e) => {
                                        e.preventDefault();
                                        haptic.light();
                                        setShowPointsPreview(false);
                                      }}
                                      onPointerDown={handleLongPressStart}
                                      onPointerUp={handleLongPressEnd}
                                      onPointerLeave={handleLongPressEnd}
                                      className="bg-primary text-primary-foreground h-16 px-12 rounded-2xl shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)] flex items-center justify-center gap-3 cursor-default border border-white/10"
                                    >
                                      <motion.div
                                        animate={{ 
                                          scale: [1, 1.2, 1],
                                          opacity: [0.5, 1, 0.5]
                                        }}
                                        transition={{ duration: 2, repeat: Infinity }}
                                      >
                                        <Zap className="h-5 w-5 text-yellow-400 fill-current" />
                                      </motion.div>
                                      <div className="flex items-baseline gap-1">
                                        <p className="text-2xl font-black tabular-nums tracking-tighter">+{question?.points || 100}</p>
                                        <p className="text-[8px] font-black uppercase tracking-[0.2em] opacity-40">PTS</p>
                                      </div>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>
                            </motion.div>
                          </>
                        )}
                      </AnimatePresence>
                    </div>

                    <div className="grid grid-cols-2 gap-3 sm:gap-4">
                      {question?.options.map((option: string, idx: number) => {
                        const isCorrect = idx === question.correctIndex;
                        const isSelected = idx === selectedOption;
                        
                        return (
                          <motion.button
                            key={idx}
                            whileHover={(!isAnswered && quizStarted) ? { scale: 1.02, backgroundColor: "hsl(var(--primary) / 0.05)" } : {}}
                            whileTap={(!isAnswered && quizStarted) ? { scale: 0.98 } : {}}
                            onClick={() => handleAnswer(idx)}
                            disabled={isAnswered || !quizStarted || updating}
                            className={`
                              relative w-full p-4 sm:p-6 rounded-2xl text-center font-black transition-all duration-500 flex flex-col items-center justify-center border min-h-[100px] sm:min-h-[120px] overflow-hidden
                              ${!isAnswered 
                                ? "bg-background/20 border-primary/5" 
                                : isCorrect 
                                  ? "bg-green-500/10 border-green-500/30 text-green-600 dark:text-green-400" 
                                  : isSelected 
                                    ? "bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400" 
                                    : "bg-background/10 border-transparent opacity-20 scale-95"}
                            `}
                          >
                            <span className="text-sm sm:text-xl leading-tight relative z-10">{option}</span>
                            <div className="absolute top-3 right-3 z-10">
                              {isAnswered && isCorrect && <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5" />}
                              {isAnswered && isSelected && !isCorrect && <XCircle className="h-4 w-4 sm:h-5 sm:w-5" />}
                            </div>
                            
                            {isAnswered && isCorrect && (
                              <motion.div 
                                initial={{ scale: 0, opacity: 0 }}
                                animate={{ scale: 1, opacity: 0.1 }}
                                className="absolute inset-0 bg-green-500 rounded-full blur-3xl"
                              />
                            )}
                          </motion.button>
                        );
                      })}
                    </div>

                    <AnimatePresence>
                      {(isAnswered || (timeLeft === 0 && quizStarted)) && (
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="pt-4"
                        >
                          <Button 
                            onClick={nextQuestion} 
                            disabled={updating}
                            className="w-full h-16 rounded-2xl font-black text-xs uppercase tracking-[0.4em] gap-3 shadow-2xl shadow-primary/20 bg-primary text-primary-foreground hover:scale-[1.02] transition-transform active:scale-95"
                          >
                            {updating ? (
                              <Loader2 className="h-5 w-5 animate-spin" />
                            ) : (
                              <>
                                {currentQuestionIdx === sessionQuizzes.length - 1 ? "Finaliser l'Éveil" : "Défi Suivant"}
                                <ArrowRight className="h-5 w-5" />
                              </>
                            )}
                          </Button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </CardContent>
                </Card>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.9, filter: "blur(20px)" }}
                animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                className="text-center space-y-12"
              >
                <div className="relative inline-block">
                  <div className="absolute inset-0 bg-primary/20 blur-[100px] rounded-full scale-150 animate-pulse" />
                  <div className="relative h-40 w-40 bg-card rounded-[3.5rem] flex items-center justify-center border border-primary/10 shadow-[0_32px_128px_-16px_rgba(0,0,0,0.4)]">
                    {score === sessionQuizzes.length * 100 ? (
                      <div className="relative">
                        <Star className="h-20 w-20 text-yellow-500 fill-current" />
                        <motion.div 
                          animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
                          transition={{ duration: 2, repeat: Infinity }}
                          className="absolute inset-0 bg-yellow-500/20 rounded-full blur-xl"
                        />
                      </div>
                    ) : (
                      <Trophy className="h-20 w-20 text-primary" />
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <h2 className="text-5xl font-black tracking-tighter italic">
                    {score === sessionQuizzes.length * 100 ? "Oracle Absolu" : "Éclat Final"}
                  </h2>
                  <p className="text-muted-foreground font-medium text-lg">Votre esprit a rayonné avec une intensité de {score} points.</p>
                </div>

                <div className="p-12 bg-card/40 backdrop-blur-3xl rounded-[4rem] border border-primary/5 shadow-2xl relative overflow-hidden group">
                  <div className="absolute inset-0 bg-gradient-to-tr from-primary/5 via-transparent to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
                  <p className="text-[10px] font-black uppercase tracking-[0.6em] opacity-30 mb-4">Lumière Accumulée</p>
                  <p className="text-7xl font-black tabular-nums tracking-tighter">+{score}</p>
                </div>

                <Button 
                  onClick={resetSession} 
                  disabled={updating}
                  className="w-full h-20 rounded-3xl font-black text-sm uppercase tracking-[0.4em] gap-4 shadow-2xl shadow-primary/30"
                >
                  {updating ? <Loader2 className="animate-spin h-6 w-6" /> : <Sparkles className="h-6 w-6" />}
                  Nouveau Cycle
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
