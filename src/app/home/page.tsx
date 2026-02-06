
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
import { Progress } from "@/components/ui/progress";
import { Trophy, CheckCircle2, XCircle, ArrowRight, Loader2, Sparkles, Brain, Timer, Zap, Users, Star, Eye, Crown, Clock, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { haptic } from "@/lib/haptics";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export function SpoilerOverlay() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ 
        opacity: 0,
        transition: { duration: 0.3 } 
      }}
      className="absolute inset-0 z-10 overflow-hidden rounded-[2rem] pointer-events-none"
    >
      <div className="absolute inset-0 bg-card/95 backdrop-blur-[45px] z-0 rounded-[2rem]" />
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

function CommunityGoalProgress({ appStatus }: { appStatus: any }) {
  if (!appStatus) return null;

  const current = appStatus.communityGoalPoints || 0;
  const target = appStatus.communityGoalTarget || 10000;
  const progress = Math.min((current / target) * 100, 100);
  
  const royalChallengeUntil = appStatus.royalChallengeActiveUntil?.toDate?.() || null;
  const isRoyalActive = royalChallengeUntil && royalChallengeUntil > new Date();

  return (
    <Card className={cn(
      "border-none backdrop-blur-3xl rounded-[2rem] overflow-hidden transition-all duration-700 w-full max-w-lg mb-6",
      isRoyalActive ? "bg-yellow-500/10 border border-yellow-500/20 shadow-[0_0_40px_-10px_rgba(234,179,8,0.3)] ring-1 ring-yellow-500/20" : "bg-card/40"
    )}>
      <CardContent className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              "h-10 w-10 rounded-xl flex items-center justify-center transition-colors",
              isRoyalActive ? "bg-yellow-500 text-black shadow-lg" : "bg-primary/5 text-primary"
            )}>
              {isRoyalActive ? <Crown className="h-5 w-5" /> : <Users className="h-5 w-5" />}
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Objectif Communautaire</p>
              <h3 className="text-sm font-black uppercase tracking-tight">
                {isRoyalActive ? "Éveil Royal Actif !" : "Résonance de la Semaine"}
              </h3>
            </div>
          </div>
          <div className="text-right">
            <p className={cn("text-xs font-black", isRoyalActive && "text-yellow-600")}>
              {current.toLocaleString()} / {target.toLocaleString()}
            </p>
            <p className="text-[8px] font-bold opacity-30 uppercase">PTS de Lumière</p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="h-2 bg-primary/5 rounded-full overflow-hidden border border-primary/5">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 1.5, ease: "easeOut" }}
              className={cn(
                "h-full transition-colors duration-500",
                isRoyalActive ? "bg-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.5)]" : "bg-primary"
              )}
            />
          </div>
          <p className="text-[9px] font-medium opacity-40 italic text-center">
            {isRoyalActive 
              ? "Le Sanctuaire rayonne d'une intensité royale." 
              : `Encore ${Math.max(0, target - current).toLocaleString()} points pour débloquer l'Éveil Royal.`}
          </p>
        </div>
      </CardContent>
    </Card>
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
  const [hiddenIndices, setHiddenIndices] = useState<number[]>([]);
  const [isProtected, setIsProtected] = useState(false);
  const [isMultiplied, setIsMultiplied] = useState(false);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  
  const { user } = useUser();
  const db = useFirestore();

  const userRef = useMemo(() => (db && user?.uid ? doc(db, "users", user.uid) : null), [db, user?.uid]);
  const appStatusRef = useMemo(() => (db ? doc(db, "appConfig", "status") : null), [db]);
  
  const { data: profile } = useDoc(userRef);
  const { data: appStatus } = useDoc(appStatusRef);

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

  const royalChallengeUntil = appStatus?.royalChallengeActiveUntil?.toDate?.() || null;
  const isRoyalActive = royalChallengeUntil && royalChallengeUntil > new Date();

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
      setHiddenIndices([]);
      setTimeLeft(15);
      setIsProtected(false);
      setIsMultiplied(false);
    } catch (error) {
      console.error("Erreur lors du démarrage du défi:", error);
    } finally {
      setUpdating(false);
    }
  };

  const handleUseHint = async () => {
    if (!user || !db || !profile?.hintCount || isAnswered || !quizStarted || hiddenIndices.length > 0) return;
    
    haptic.impact();
    const currentQuiz = sessionQuizzes[currentQuestionIdx];
    const correctIdx = currentQuiz.correctIndex;
    
    const wrongIndices = [0, 1, 2, 3].filter(i => i !== correctIdx);
    const toHide = [...wrongIndices].sort(() => Math.random() - 0.5).slice(0, 2);
    
    setHiddenIndices(toHide);
    
    try {
      await updateDoc(userRef!, {
        hintCount: increment(-1),
        updatedAt: serverTimestamp()
      });
      toast({ title: "Perception activée", description: "L'illusion se dissipe..." });
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddTime = async () => {
    if (!user || !db || !profile?.timeBoostCount || isAnswered || !quizStarted) return;
    haptic.impact();
    setTimeLeft(prev => prev + 15);
    try {
      await updateDoc(userRef!, {
        timeBoostCount: increment(-1),
        updatedAt: serverTimestamp()
      });
      toast({ title: "Temps Suspendu", description: "15 secondes ont été ajoutées." });
    } catch (e) {}
  };

  const handleUseShield = async () => {
    if (!user || !db || !profile?.shieldCount || isAnswered || !quizStarted || isProtected) return;
    haptic.impact();
    setIsProtected(true);
    try {
      await updateDoc(userRef!, {
        shieldCount: increment(-1),
        updatedAt: serverTimestamp()
      });
      toast({ title: "Sceau de Protection", description: "L'échec n'aura aucune conséquence." });
    } catch (e) {}
  };

  const handleUseMultiplier = async () => {
    if (!user || !db || !profile?.multiplierCount || isAnswered || !quizStarted || isMultiplied) return;
    haptic.impact();
    setIsMultiplied(true);
    try {
      await updateDoc(userRef!, {
        multiplierCount: increment(-1),
        updatedAt: serverTimestamp()
      });
      toast({ title: "Prisme de Lumière", description: "Lumière multipliée pour ce défi." });
    } catch (e) {}
  };

  const handleLongPressStart = () => {
    if (updating || quizStarted) return;
    longPressTimer.current = setTimeout(() => {
      haptic.light();
      setShowPointsPreview(true);
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
    
    let pointsEarned = isCorrect ? (isRoyalActive ? 100 : (currentQuiz.points || 10)) : 0;
    if (isCorrect && isMultiplied) pointsEarned *= 2;

    let penalty = 0;
    if (isTimeout && profile && (profile.totalPoints || 0) > 10 && !isProtected) {
      penalty = -10;
      toast({
        variant: "destructive",
        title: "Temps Épuisé",
        description: "Votre esprit a hésité. -10 PTS de Lumière.",
      });
    } else if (!isCorrect && !isTimeout && profile && (profile.totalPoints || 0) > 5 && !isProtected) {
      // Optionnelle: petite pénalité en cas d'erreur
      penalty = -5;
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

        if (pointsEarned > 0 && appStatusRef) {
          const commUpdate: any = {
            communityGoalPoints: increment(pointsEarned),
            updatedAt: serverTimestamp()
          };
          await updateDoc(appStatusRef, commUpdate);
        }
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
      setHiddenIndices([]);
      setTimeLeft(15);
      setIsProtected(false);
      setIsMultiplied(false);
    } else {
      setQuizComplete(true);
      haptic.impact();
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
    setHiddenIndices([]);
    setScore(0);
    setTimeLeft(15);
    setIsProtected(false);
    setIsMultiplied(false);
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
    <div className={cn(
      "min-h-screen bg-background flex flex-col pb-32 transition-colors duration-1000",
      isRoyalActive && "bg-yellow-500/[0.02]"
    )}>
      <AnimatePresence>
        {isRoyalActive && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 pointer-events-none overflow-hidden z-0"
          >
            <motion.div 
              animate={{ scale: [1, 1.2, 1], x: [0, 50, 0], y: [0, -30, 0] }}
              transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
              className="absolute top-[-10%] left-[-10%] w-[80%] h-[80%] rounded-full bg-yellow-500/[0.03] blur-[120px]" 
            />
          </motion.div>
        )}
      </AnimatePresence>

      <main className="flex-1 flex flex-col items-center justify-center p-6 pt-24 space-y-6 z-10">
        <GlobalActivityTicker />
        <CommunityGoalProgress appStatus={appStatus} />

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
                    <div className={cn(
                      "flex items-center gap-3 px-6 py-3 backdrop-blur-3xl rounded-2xl border shadow-xl transition-colors",
                      isRoyalActive ? "bg-yellow-500/10 border-yellow-500/30" : "bg-card/40 border-primary/10"
                    )}>
                      <Timer className={cn("h-5 w-5", timeLeft <= 5 ? 'text-red-500 animate-pulse' : isRoyalActive ? 'text-yellow-600' : 'text-primary/60')} />
                      <span className={cn("text-lg font-black tabular-nums tracking-widest", timeLeft <= 5 ? 'text-red-500' : isRoyalActive ? 'text-yellow-700' : 'opacity-60')}>
                        {timeLeft}s
                      </span>
                    </div>
                    <div className="flex gap-2">
                      {isProtected && <ShieldCheck className="h-4 w-4 text-green-500 animate-pulse" />}
                      {isMultiplied && <Star className="h-4 w-4 text-yellow-500 animate-pulse" />}
                    </div>
                  </motion.div>
                )}

                <Card className={cn(
                  "border-none backdrop-blur-3xl shadow-2xl rounded-[3rem] overflow-hidden relative transition-all duration-700",
                  isRoyalActive ? "bg-yellow-500/[0.03] ring-2 ring-yellow-500/20 shadow-yellow-500/10" : "bg-card/40"
                )}>
                  <AnimatePresence mode="wait">
                    {showPointsPreview ? (
                      <motion.div
                        key="points-preview"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 1.05 }}
                        onClick={() => setShowPointsPreview(false)}
                        className={cn(
                          "p-12 sm:p-20 text-center flex flex-col items-center justify-center space-y-10 cursor-pointer h-full min-h-[500px]",
                          isRoyalActive ? "bg-yellow-500/5" : "bg-primary/5"
                        )}
                      >
                        <div className="space-y-4">
                          <p className="text-[10px] font-black uppercase tracking-[0.6em] opacity-30">Valeur de l'Éveil</p>
                          <div className="flex items-baseline justify-center gap-2">
                            <span className={cn("text-7xl font-black tabular-nums tracking-tighter", isRoyalActive && "text-yellow-600")}>
                              {isRoyalActive ? 100 : (question?.points || 10)}
                            </span>
                            <span className="text-sm font-black uppercase tracking-widest opacity-20">PTS</span>
                          </div>
                        </div>
                      </motion.div>
                    ) : (
                      <motion.div key="quiz-content" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                        <CardContent className="p-8 sm:p-12 space-y-12">
                          <div className="relative min-h-[140px] flex items-center justify-center overflow-hidden rounded-[2rem]">
                            <AnimatePresence>
                              {quizStarted ? (
                                <motion.p 
                                  initial={{ opacity: 0, filter: "blur(8px)" }}
                                  animate={{ opacity: 1, filter: "blur(0px)" }}
                                  className="text-xl sm:text-2xl font-black leading-tight tracking-tight text-center px-4"
                                >
                                  {question?.question}
                                </motion.p>
                              ) : (
                                <motion.div key="mask" exit={{ opacity: 0 }} className="absolute inset-0 z-20 flex items-center justify-center">
                                  <SpoilerOverlay />
                                  <Button onClick={handleStartChallenge} disabled={updating} className="h-16 px-12 rounded-2xl font-black text-[10px] uppercase tracking-[0.4em] z-30 shadow-2xl transition-all">
                                    {updating ? <Loader2 className="h-5 w-5 animate-spin" /> : "Dévoiler l'Inconnu"}
                                  </Button>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>

                          <div className="grid grid-cols-2 gap-3 sm:gap-4">
                            {question?.options.map((option: string, idx: number) => {
                              const isCorrect = idx === question.correctIndex;
                              const isSelected = idx === selectedOption;
                              const isHidden = hiddenIndices.includes(idx);
                              return (
                                <motion.button
                                  key={idx}
                                  animate={{ opacity: isHidden ? 0 : 1, scale: isHidden ? 0.8 : 1 }}
                                  onClick={() => handleAnswer(idx)}
                                  disabled={isAnswered || !quizStarted || updating || isHidden}
                                  className={cn(
                                    "relative w-full p-4 sm:p-6 rounded-2xl text-center font-black transition-all duration-500 flex flex-col items-center justify-center border min-h-[120px]",
                                    !isAnswered ? "bg-background/20 border-primary/5" : isCorrect ? "bg-green-500/10 border-green-500/30 text-green-600" : isSelected ? "bg-red-500/10 border-red-500/30 text-red-600" : "opacity-20 scale-95"
                                  )}
                                >
                                  <span className="text-lg leading-tight relative z-10">{option}</span>
                                  <div className="absolute top-3 right-3">{isAnswered && isCorrect && <CheckCircle2 className="h-4 w-4" />}{isAnswered && isSelected && !isCorrect && <XCircle className="h-4 w-4" />}</div>
                                </motion.button>
                              );
                            })}
                          </div>

                          <AnimatePresence>
                            {quizStarted && !isAnswered && (
                              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex justify-center gap-2 pt-4">
                                <Button size="icon" variant="ghost" disabled={!profile?.hintCount || hiddenIndices.length > 0} onClick={handleUseHint} className="h-12 w-12 rounded-xl bg-primary/5 border border-primary/5">
                                  <Eye className={cn("h-5 w-5", profile?.hintCount ? "text-blue-500" : "opacity-20")} />
                                  {profile?.hintCount > 0 && <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-[8px] font-black px-1.5 rounded-full">{profile.hintCount}</span>}
                                </Button>
                                <Button size="icon" variant="ghost" disabled={!profile?.timeBoostCount} onClick={handleAddTime} className="h-12 w-12 rounded-xl bg-primary/5 border border-primary/5">
                                  <Clock className={cn("h-5 w-5", profile?.timeBoostCount ? "text-orange-500" : "opacity-20")} />
                                  {profile?.timeBoostCount > 0 && <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-[8px] font-black px-1.5 rounded-full">{profile.timeBoostCount}</span>}
                                </Button>
                                <Button size="icon" variant="ghost" disabled={!profile?.shieldCount || isProtected} onClick={handleUseShield} className="h-12 w-12 rounded-xl bg-primary/5 border border-primary/5">
                                  <ShieldCheck className={cn("h-5 w-5", profile?.shieldCount && !isProtected ? "text-green-500" : "opacity-20")} />
                                  {profile?.shieldCount > 0 && <span className="absolute -top-1 -right-1 bg-green-500 text-white text-[8px] font-black px-1.5 rounded-full">{profile.shieldCount}</span>}
                                </Button>
                                <Button size="icon" variant="ghost" disabled={!profile?.multiplierCount || isMultiplied} onClick={handleUseMultiplier} className="h-12 w-12 rounded-xl bg-primary/5 border border-primary/5">
                                  <Star className={cn("h-5 w-5", profile?.multiplierCount && !isMultiplied ? "text-yellow-500" : "opacity-20")} />
                                  {profile?.multiplierCount > 0 && <span className="absolute -top-1 -right-1 bg-yellow-500 text-white text-[8px] font-black px-1.5 rounded-full">{profile.multiplierCount}</span>}
                                </Button>
                              </motion.div>
                            )}

                            {isAnswered && (
                              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="pt-4">
                                <Button onClick={nextQuestion} disabled={updating} className={cn("w-full h-16 rounded-2xl font-black text-xs uppercase gap-3 shadow-2xl", isRoyalActive ? "bg-yellow-500 text-black" : "bg-primary text-primary-foreground")}>
                                  {updating ? <Loader2 className="h-5 w-5 animate-spin" /> : <>{currentQuestionIdx === sessionQuizzes.length - 1 ? "Finaliser l'Éveil" : "Défi Suivant"}<ArrowRight className="h-5 w-5" /></>}
                                </Button>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </CardContent>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Card>
              </motion.div>
            ) : (
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center space-y-12">
                <div className="relative inline-block">
                  <div className={cn("absolute inset-0 blur-[100px] rounded-full scale-150", isRoyalActive ? "bg-yellow-500/30" : "bg-primary/20")} />
                  <div className="relative h-40 w-40 bg-card rounded-[3.5rem] flex items-center justify-center border shadow-2xl">
                    <Trophy className={cn("h-20 w-20", isRoyalActive ? "text-yellow-500" : "text-primary")} />
                  </div>
                </div>
                <div className="space-y-4">
                  <h2 className="text-5xl font-black tracking-tighter italic">+{score} PTS</h2>
                  <p className="text-muted-foreground font-medium">Votre esprit a rayonné avec intensité.</p>
                </div>
                <Button onClick={resetSession} className="w-full h-20 rounded-3xl font-black text-sm uppercase gap-4 shadow-2xl">
                  <Sparkles className="h-6 w-6" /> Nouveau Cycle
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
