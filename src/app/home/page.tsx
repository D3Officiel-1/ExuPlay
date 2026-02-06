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
  getDocs,
  getDoc,
  deleteDoc
} from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Trophy, CheckCircle2, XCircle, ArrowRight, Loader2, Sparkles, Brain, Timer, Zap, Users, Star, Eye, Crown, Clock, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { haptic } from "@/lib/haptics";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';

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
      "border-none bg-card/20 backdrop-blur-3xl rounded-full overflow-hidden w-full max-w-lg mb-10 transition-all duration-700",
      isRoyalActive && "ring-1 ring-yellow-500/30 shadow-[0_0_20px_rgba(234,179,8,0.1)]"
    )}>
      <CardContent className="p-3 px-6 space-y-2">
        <div className="h-1 bg-primary/5 rounded-full overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            className={cn(
              "h-full transition-colors duration-500",
              isRoyalActive ? "bg-yellow-500" : "bg-primary"
            )}
          />
        </div>
        <p className={cn(
          "text-[8px] font-black uppercase tracking-[0.4em] text-center",
          isRoyalActive ? "text-yellow-600" : "opacity-20"
        )}>
          {isRoyalActive 
            ? "Éveil Royal Actif" 
            : `Encore ${Math.max(0, target - current).toLocaleString()} points requis`}
        </p>
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
  const [hiddenIndices, setHiddenIndices] = useState<number[]>([]);
  const [isProtected, setIsProtected] = useState(false);
  const [isMultiplied, setIsMultiplied] = useState(false);
  const [showPenaltyAnim, setShowPenaltyAnim] = useState(false);
  
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

  // Oracle du Flux Temporel : Désactivation automatique de l'Éveil Royal après expiration
  useEffect(() => {
    if (!appStatus || !db) return;
    
    const checkExpiry = async () => {
      const until = appStatus.royalChallengeActiveUntil?.toDate?.();
      if (until && until < new Date()) {
        try {
          const statusRef = doc(db, "appConfig", "status");
          await updateDoc(statusRef, {
            communityGoalPoints: 0,
            royalChallengeActiveUntil: null,
            updatedAt: serverTimestamp()
          });
        } catch (e) {}
      }
    };

    const interval = setInterval(checkExpiry, 10000); // Surveillance toutes les 10s
    return () => clearInterval(interval);
  }, [appStatus, db]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && quizStarted && !isAnswered && user?.uid && profile?.totalPoints) {
        const penalty = Math.floor(profile.totalPoints / 2);
        
        if (penalty > 0) {
          const userDocRef = doc(db, "users", user.uid);
          updateDoc(userDocRef, {
            totalPoints: increment(-penalty),
            updatedAt: serverTimestamp()
          }).catch(() => {});
          setIsAnswered(true);
          setQuizStarted(false);
          haptic.error();
        }
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [quizStarted, isAnswered, user?.uid, profile?.totalPoints, db]);

  useEffect(() => {
    if (allQuizzes && userAttempts !== null && sessionQuizzes.length === 0) {
      const playedQuizIds = new Set(
        (userAttempts as any[]).filter(attempt => attempt.isPlayed === true).map(attempt => attempt.id)
      );
      const availableQuizzes = allQuizzes.filter(quiz => !playedQuizIds.has(quiz.id));
      const shuffled = [...availableQuizzes].sort(() => Math.random() - 0.5);
      setSessionQuizzes(shuffled);
    }
  }, [allQuizzes, userAttempts, sessionQuizzes.length]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (quizStarted && !isAnswered && timeLeft > 0) {
      timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
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
    
    setUpdating(true);
    try {
      await setDoc(attemptRef, {
        attemptedAt: serverTimestamp(),
        isPlayed: false,
        status: 'started'
      }, { merge: true });
      setQuizStarted(true);
      setHiddenIndices([]);
      setTimeLeft(15);
      setIsProtected(false);
      setIsMultiplied(false);
      setShowPenaltyAnim(false);
    } catch (error) {
      console.error(error);
    } finally {
      setUpdating(false);
    }
  };

  const handleUseHint = async () => {
    if (!user || !db || !profile?.hintCount || isAnswered || !quizStarted || hiddenIndices.length > 0) return;
    haptic.impact();
    const currentQuiz = sessionQuizzes[currentQuestionIdx];
    const wrongIndices = [0, 1, 2, 3].filter(i => i !== currentQuiz.correctIndex);
    const toHide = [...wrongIndices].sort(() => Math.random() - 0.5).slice(0, 2);
    setHiddenIndices(toHide);
    updateDoc(userRef!, { hintCount: increment(-1), updatedAt: serverTimestamp() });
    toast({ title: "Perception activée", description: "L'illusion se dissipe..." });
  };

  const handleAddTime = async () => {
    if (!user || !db || !profile?.timeBoostCount || isAnswered || !quizStarted) return;
    haptic.impact();
    setTimeLeft(prev => prev + 15);
    updateDoc(userRef!, { timeBoostCount: increment(-1), updatedAt: serverTimestamp() });
    toast({ title: "Temps Suspendu", description: "15 secondes ajoutées." });
  };

  const handleUseShield = async () => {
    if (!user || !db || !profile?.shieldCount || isAnswered || !quizStarted || isProtected) return;
    haptic.impact();
    setIsProtected(true);
    updateDoc(userRef!, { shieldCount: increment(-1), updatedAt: serverTimestamp() });
    toast({ title: "Sceau de Protection", description: "L'échec n'aura aucune conséquence." });
  };

  const handleUseMultiplier = async () => {
    if (!user || !db || !profile?.multiplierCount || isAnswered || !quizStarted || isMultiplied) return;
    haptic.impact();
    setIsMultiplied(true);
    updateDoc(userRef!, { multiplierCount: increment(-1), updatedAt: serverTimestamp() });
    toast({ title: "Prisme de Lumière", description: "Lumière multipliée." });
  };

  const handleAnswer = (index: number) => {
    if (!quizStarted || isAnswered || sessionQuizzes.length === 0 || !user || !db) return;
    const currentQuiz = sessionQuizzes[currentQuestionIdx];
    const isCorrect = index === currentQuiz.correctIndex;
    const isTimeout = index === -1;
    
    let pointsEarned = isCorrect ? (isRoyalActive ? 100 : (currentQuiz.points || 10)) : 0;
    if (isCorrect && isMultiplied) pointsEarned *= 2;

    let penalty = 0;
    if (isTimeout && profile && (profile.totalPoints || 0) > 10 && !isProtected) {
      penalty = -10;
      toast({ variant: "destructive", title: "Temps Épuisé", description: "-10 PTS." });
    } else if (!isCorrect && !isTimeout && !isProtected) {
      penalty = -2;
      setShowPenaltyAnim(true);
    }

    if (isCorrect) haptic.success(); else haptic.error();
    setSelectedOption(index);
    setIsAnswered(true);
    if (isCorrect) setScore(prev => prev + pointsEarned);

    const attemptRef = doc(db, "users", user.uid, "attempts", currentQuiz.id);
    updateDoc(attemptRef, { isPlayed: true, status: 'completed', score: pointsEarned, userAnswerIndex: index, updatedAt: serverTimestamp() });

    const totalChange = pointsEarned + penalty;
    if (totalChange !== 0) {
      updateDoc(doc(db, "users", user.uid), { totalPoints: increment(totalChange), lastQuizAt: serverTimestamp(), updatedAt: serverTimestamp() });
      
      if (pointsEarned > 0 && appStatusRef && appStatus) {
        const currentProgress = (appStatus.communityGoalPoints || 0) + pointsEarned;
        const target = appStatus.communityGoalTarget || 10000;
        
        let updateData: any = { 
          communityGoalPoints: increment(pointsEarned), 
          updatedAt: serverTimestamp() 
        };

        if (currentProgress >= target && !isRoyalActive) {
          const expiry = new Date();
          expiry.setMinutes(expiry.getMinutes() + 10);
          updateData.royalChallengeActiveUntil = expiry;
          haptic.impact();
          toast({ 
            title: "Éveil Royal Activé !", 
            description: "Le flux a atteint son paroxysme. +100 PTS par défi pendant 10 minutes !" 
          });
        }
        
        updateDoc(appStatusRef, updateData);
      }
    }
  };

  const nextQuestion = () => {
    haptic.light();
    if (currentQuestionIdx < sessionQuizzes.length - 1) {
      setCurrentQuestionIdx(prev => prev + 1);
      setSelectedOption(null);
      setIsAnswered(false);
      setQuizStarted(false);
      setHiddenIndices([]);
      setTimeLeft(15);
      setIsProtected(false);
      setIsMultiplied(false);
      setShowPenaltyAnim(false);
    } else {
      setQuizComplete(true);
      haptic.impact();
    }
  };

  if (quizzesLoading || attemptsLoading || (allQuizzes && userAttempts !== null && sessionQuizzes.length === 0 && allQuizzes.length > 0)) {
    return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="h-10 w-10 animate-spin opacity-20" /></div>;
  }

  const question = sessionQuizzes[currentQuestionIdx];
  const hasTools = profile && (profile.hintCount > 0 || profile.timeBoostCount > 0 || profile.shieldCount > 0 || profile.multiplierCount > 0);

  return (
    <div className={cn("min-h-screen bg-background flex flex-col pb-32 transition-colors duration-1000", isRoyalActive && "bg-yellow-500/[0.02]")}>
      <main className="flex-1 flex flex-col items-center justify-center p-6 pt-24 space-y-6 z-10">
        <AnimatePresence mode="wait">
          {!quizStarted && !quizComplete && (
            <motion.div
              key="flux-stats"
              initial={{ opacity: 0, y: -20, filter: "blur(10px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -20, filter: "blur(10px)" }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="w-full flex flex-col items-center space-y-6"
            >
              <GlobalActivityTicker />
              <CommunityGoalProgress appStatus={appStatus} />
            </motion.div>
          )}
        </AnimatePresence>

        <div className="w-full max-w-lg relative">
          <AnimatePresence>
            {showPenaltyAnim && (
              <motion.div 
                initial={{ opacity: 0, y: 40, scale: 0.5, filter: "blur(20px)" }} 
                animate={{ opacity: [0, 1, 1, 0], y: -140, scale: [0.8, 1.4, 1.2, 1.5], filter: ["blur(10px)", "blur(0px)", "blur(0px)", "blur(20px)"] }} 
                transition={{ duration: 1.2, times: [0, 0.2, 0.8, 1], ease: [0.22, 1, 0.36, 1] }}
                className="absolute inset-0 flex flex-col items-center justify-center z-[100] pointer-events-none"
              >
                <span className="text-6xl font-black text-red-500 italic drop-shadow-[0_0_25px_rgba(239,68,68,0.8)] tracking-tighter">-2 PTS</span>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence mode="wait">
            {!quizComplete ? (
              <motion.div key={question?.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }} className="space-y-8">
                {quizStarted && !isAnswered && (
                  <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center gap-4">
                    <div className={cn("flex items-center gap-3 px-6 py-3 backdrop-blur-3xl rounded-2xl border shadow-xl", isRoyalActive ? "bg-yellow-500/10 border-yellow-500/30" : "bg-card/40 border-primary/10")}>
                      <Timer className={cn("h-5 w-5", timeLeft <= 5 ? 'text-red-500 animate-pulse' : isRoyalActive ? 'text-yellow-600' : 'text-primary/60')} />
                      <span className={cn("text-lg font-black tabular-nums tracking-widest", timeLeft <= 5 ? 'text-red-500' : isRoyalActive ? 'text-yellow-700' : 'opacity-60')}>{timeLeft}s</span>
                    </div>
                  </motion.div>
                )}

                <Card className={cn("border-none backdrop-blur-3xl shadow-2xl rounded-[3rem] overflow-hidden relative", isRoyalActive ? "bg-yellow-500/[0.03] ring-2 ring-yellow-500/20 shadow-yellow-500/10" : "bg-card/40")}>
                  <CardContent className="p-8 sm:p-12 space-y-12">
                    <div className="relative min-h-[140px] flex items-center justify-center overflow-hidden rounded-[2rem]">
                      <AnimatePresence>
                        {quizStarted ? (
                          <motion.p initial={{ opacity: 0, filter: "blur(8px)" }} animate={{ opacity: 1, filter: "blur(0px)" }} className="text-xl sm:text-2xl font-black leading-tight tracking-tight text-center px-4">{question?.question}</motion.p>
                        ) : (
                          <motion.div key="mask" exit={{ opacity: 0 }} className="absolute inset-0 z-20 flex items-center justify-center">
                            <SpoilerOverlay />
                            <Button onClick={handleStartChallenge} disabled={updating} className="h-16 px-12 rounded-2xl font-black text-[10px] uppercase tracking-[0.4em] z-30 shadow-2xl">{updating ? <Loader2 className="h-5 w-5 animate-spin" /> : "Dévoiler l'Inconnu"}</Button>
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
                          <motion.button key={idx} animate={{ opacity: isHidden ? 0 : 1, scale: isHidden ? 0.8 : 1 }} onClick={() => handleAnswer(idx)} disabled={isAnswered || !quizStarted || updating || isHidden} className={cn("relative w-full p-4 sm:p-6 rounded-2xl text-center font-black transition-all duration-500 flex flex-col items-center justify-center border min-h-[120px]", !isAnswered ? "bg-background/20 border-primary/5" : isCorrect ? "bg-green-500/10 border-green-500/30 text-green-600" : isSelected ? "bg-red-500/10 border-red-500/30 text-red-600" : "opacity-20 scale-95")}>
                            <span className="text-lg leading-tight relative z-10">{option}</span>
                          </motion.button>
                        );
                      })}
                    </div>

                    {quizStarted && !isAnswered && hasTools && (
                      <div className="flex justify-center gap-2 pt-4">
                        {profile?.hintCount > 0 && (
                          <Button size="icon" variant="ghost" disabled={hiddenIndices.length > 0} onClick={handleUseHint} className="h-12 w-12 rounded-xl bg-primary/5 border border-primary/5 relative">
                            <Eye className="h-5 w-5 text-blue-500" />
                            <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-[8px] font-black px-1.5 rounded-full">{profile.hintCount}</span>
                          </Button>
                        )}
                        {profile?.timeBoostCount > 0 && (
                          <Button size="icon" variant="ghost" onClick={handleAddTime} className="h-12 w-12 rounded-xl bg-primary/5 border border-primary/5 relative">
                            <Clock className="h-5 w-5 text-orange-500" />
                            <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-[8px] font-black px-1.5 rounded-full">{profile.timeBoostCount}</span>
                          </Button>
                        )}
                        {profile?.shieldCount > 0 && (
                          <Button size="icon" variant="ghost" disabled={isProtected} onClick={handleUseShield} className="h-12 w-12 rounded-xl bg-primary/5 border border-primary/5 relative">
                            <ShieldCheck className={cn("h-5 w-5", isProtected ? "opacity-20" : "text-green-500")} />
                            <span className="absolute -top-1 -right-1 bg-green-500 text-white text-[8px] font-black px-1.5 rounded-full">{profile.shieldCount}</span>
                          </Button>
                        )}
                        {profile?.multiplierCount > 0 && (
                          <Button size="icon" variant="ghost" disabled={isMultiplied} onClick={handleUseMultiplier} className="h-12 w-12 rounded-xl bg-primary/5 border border-primary/5 relative">
                            <Star className={cn("h-5 w-5", isMultiplied ? "opacity-20" : "text-yellow-500")} />
                            <span className="absolute -top-1 -right-1 bg-yellow-500 text-white text-[8px] font-black px-1.5 rounded-full">{profile.multiplierCount}</span>
                          </Button>
                        )}
                      </div>
                    )}

                    {isAnswered && (
                      <Button onClick={nextQuestion} disabled={updating} className={cn("w-full h-16 rounded-2xl font-black text-xs uppercase gap-3 shadow-2xl", isRoyalActive ? "bg-yellow-500 text-black" : "bg-primary text-primary-foreground")}>
                        {currentQuestionIdx === sessionQuizzes.length - 1 ? "Finaliser l'Éveil" : "Défi Suivant"}<ArrowRight className="h-5 w-5" />
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ) : (
              <div className="text-center space-y-12">
                <div className="relative h-40 w-40 bg-card rounded-[3.5rem] flex items-center justify-center border shadow-2xl mx-auto"><Trophy className="h-20 w-20 text-primary" /></div>
                <h2 className="text-5xl font-black tracking-tighter">+{score} PTS</h2>
                <Button onClick={() => setQuizComplete(false)} className="w-full h-20 rounded-3xl font-black text-sm uppercase gap-4 shadow-2xl">Nouveau Cycle</Button>
              </div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
