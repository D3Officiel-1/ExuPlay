
"use client";

import { useState, useEffect, useMemo } from "react";
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
import { BottomNav } from "@/components/BottomNav";
import { Header } from "@/components/Header";
import { Trophy, CheckCircle2, XCircle, ArrowRight, Loader2, Sparkles, Brain, Timer } from "lucide-react";
import { useRouter } from "next/navigation";

/**
 * @fileOverview Un masque de question ultra-stylisé avec des animations complexes pour la mise à jour majeure.
 */

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
      {/* Verre dépoli de base avec angles arrondis */}
      <div className="absolute inset-0 bg-card/90 backdrop-blur-[45px] z-0 rounded-[2rem]" />
      
      {/* Voile flouté supplémentaire derrière le masque */}
      <div className="absolute inset-0 bg-background/30 backdrop-blur-xl -z-10 rounded-[2rem]" />
      
      {/* Texture de bruit numérique animée - Très douce */}
      <motion.div
        animate={{
          opacity: [0.03, 0.06, 0.03],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute inset-0 z-10 opacity-5 pointer-events-none rounded-[2rem]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          backgroundSize: "120px 120px",
        }}
      />

      {/* Orbes lumineux éthérés */}
      <motion.div 
        animate={{ 
          scale: [1, 1.2, 1],
          x: [0, 30, 0],
          y: [0, -20, 0],
        }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-[-20%] left-[-10%] w-[80%] h-[80%] bg-primary/5 rounded-full blur-[100px] z-20"
      />
      <motion.div 
        animate={{ 
          scale: [1, 1.3, 1],
          x: [0, -40, 0],
          y: [0, 30, 0],
        }}
        transition={{ duration: 15, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        className="absolute bottom-[-20%] right-[-10%] w-[80%] h-[80%] bg-primary/5 rounded-full blur-[100px] z-20"
      />

      {/* Effet de balayage lumineux subtil */}
      <motion.div 
        animate={{ 
          x: ["-150%", "250%"],
        }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", repeatDelay: 3 }}
        className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent skew-x-12 z-30"
      />
    </motion.div>
  );
}

export default function HomePage() {
  const router = useRouter();
  const [sessionQuizzes, setSessionQuizzes] = useState<any[]>([]);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [quizComplete, setQuizComplete] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [quizStarted, setQuizStarted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(15);
  
  const { user } = useUser();
  const db = useFirestore();

  const userRef = useMemo(() => (db && user?.uid ? doc(db, "users", user.uid) : null), [db, user?.uid]);
  const { data: profile } = useDoc(userRef);

  // Récupérer tous les quiz
  const quizzesQuery = useMemo(() => {
    if (!db) return null;
    return query(collection(db, "quizzes"), orderBy("createdAt", "asc"));
  }, [db]);

  const { data: allQuizzes, loading: quizzesLoading } = useCollection(quizzesQuery);

  // Récupérer les tentatives pour filtrer
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
      handleAnswer(-1); // Échec auto sur timeout
    }
    return () => clearInterval(timer);
  }, [quizStarted, isAnswered, timeLeft]);

  const handleStartChallenge = async () => {
    if (!user || !db || sessionQuizzes.length === 0) return;
    
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
      setTimeLeft(15);
    } catch (error) {
      console.error("Erreur lors du démarrage du défi:", error);
    } finally {
      setUpdating(false);
    }
  };

  const handleAnswer = async (index: number) => {
    if (!quizStarted || isAnswered || sessionQuizzes.length === 0 || !user || !db) return;
    
    const currentQuiz = sessionQuizzes[currentQuestionIdx];
    const isCorrect = index === currentQuiz.correctIndex;
    const pointsEarned = isCorrect ? (currentQuiz.points || 100) : 0;

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
        updatedAt: serverTimestamp()
      });

      if (pointsEarned > 0) {
        const updatePayload: any = {
          totalPoints: increment(pointsEarned),
          lastQuizAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };

        if (profile && profile.referredBy && !profile.referralRewardClaimed) {
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
    if (sessionQuizzes.length === 0) return;
    if (currentQuestionIdx < sessionQuizzes.length - 1) {
      setCurrentQuestionIdx(prev => prev + 1);
      setSelectedOption(null);
      setIsAnswered(false);
      setQuizStarted(false);
      setTimeLeft(15);
    } else {
      setQuizComplete(true);
    }
  };

  const resetSession = () => {
    setSessionQuizzes([]);
    setQuizComplete(false);
    setCurrentQuestionIdx(0);
    setSelectedOption(null);
    setIsAnswered(false);
    setQuizStarted(false);
    setScore(0);
    setTimeLeft(15);
  };

  if (quizzesLoading || attemptsLoading || (allQuizzes && userAttempts !== null && sessionQuizzes.length === 0 && allQuizzes.length > 0)) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <Loader2 className="h-10 w-10 animate-spin opacity-20 mb-6" />
        <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40 animate-pulse">Synchronisation de l'Éveil</p>
      </div>
    );
  }

  if (!allQuizzes || sessionQuizzes.length === 0) {
    return (
      <div className="min-h-screen bg-background flex flex-col pb-32">
        <Header />
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
                                <Button 
                                  onClick={handleStartChallenge}
                                  disabled={updating}
                                  className="h-16 px-12 rounded-2xl font-black text-[10px] uppercase tracking-[0.4em] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] bg-background text-foreground hover:bg-primary hover:text-primary-foreground transition-all duration-500 active:scale-95 group"
                                >
                                  {updating ? (
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                  ) : (
                                    "Dévoiler l'Inconnu"
                                  )}
                                </Button>
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
                              relative w-full p-4 sm:p-6 rounded-2xl text-left font-black transition-all duration-500 flex items-center justify-between border min-h-[80px] sm:min-h-[90px] overflow-hidden
                              ${!isAnswered 
                                ? "bg-background/20 border-primary/5" 
                                : isCorrect 
                                  ? "bg-green-500/10 border-green-500/30 text-green-600 dark:text-green-400" 
                                  : isSelected 
                                    ? "bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400" 
                                    : "bg-background/10 border-transparent opacity-20 scale-95"}
                            `}
                          >
                            <span className="text-[10px] sm:text-sm leading-tight relative z-10">{option}</span>
                            <div className="shrink-0 ml-1 sm:ml-3 relative z-10">
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
                    <Trophy className="h-20 w-20 text-primary" />
                  </div>
                </div>

                <div className="space-y-4">
                  <h2 className="text-5xl font-black tracking-tighter italic">Éclat Final</h2>
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

      <BottomNav />
    </div>
  );
}
