
"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useUser, useFirestore, useCollection } from "@/firebase";
import { 
  collection, 
  doc, 
  updateDoc, 
  increment, 
  serverTimestamp,
  query,
  orderBy
} from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { BottomNav } from "@/components/BottomNav";
import { Header } from "@/components/Header";
import { Trophy, CheckCircle2, XCircle, ArrowRight, Loader2, Sparkles, Brain } from "lucide-react";
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';

export default function HomePage() {
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [quizComplete, setQuizComplete] = useState(false);
  const [updating, setUpdating] = useState(false);
  
  const { user } = useUser();
  const db = useFirestore();

  const quizzesQuery = useMemo(() => {
    if (!db) return null;
    return query(collection(db, "quizzes"), orderBy("createdAt", "asc"));
  }, [db]);

  const { data: quizzes, loading: quizzesLoading } = useCollection(quizzesQuery);

  const handleAnswer = (index: number) => {
    if (isAnswered || !quizzes) return;
    const currentQuiz = quizzes[currentQuestionIdx];
    setSelectedOption(index);
    setIsAnswered(true);
    
    if (index === currentQuiz.correctIndex) {
      setScore(prev => prev + (currentQuiz.points || 100));
    }
  };

  const nextQuestion = () => {
    if (!quizzes) return;
    if (currentQuestionIdx < quizzes.length - 1) {
      setCurrentQuestionIdx(prev => prev + 1);
      setSelectedOption(null);
      setIsAnswered(false);
    } else {
      finishQuiz();
    }
  };

  const finishQuiz = async () => {
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
  };

  const resetQuiz = () => {
    setCurrentQuestionIdx(0);
    setSelectedOption(null);
    setIsAnswered(false);
    setScore(0);
    setQuizComplete(false);
  };

  if (quizzesLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <Loader2 className="h-8 w-8 animate-spin opacity-20 mb-4" />
        <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">Connexion à l'Éveil...</p>
      </div>
    );
  }

  if (!quizzes || quizzes.length === 0) {
    return (
      <div className="min-h-screen bg-background flex flex-col pb-32">
        <Header />
        <main className="flex-1 flex flex-col items-center justify-center p-6 pt-24 space-y-8">
          <div className="mx-auto w-24 h-24 bg-primary/5 rounded-[2.5rem] flex items-center justify-center border border-primary/10 shadow-2xl">
            <Brain className="h-10 w-10 text-primary opacity-20" />
          </div>
          <div className="space-y-2 text-center">
            <h2 className="text-2xl font-black uppercase tracking-tight">Aucun Défi</h2>
            <p className="text-xs font-medium opacity-40">Le savoir est en cours de compilation. Revenez plus tard.</p>
          </div>
        </main>
        <BottomNav />
      </div>
    );
  }

  const question = quizzes[currentQuestionIdx];

  return (
    <div className="min-h-screen bg-background flex flex-col pb-32">
      <Header />
      
      <main className="flex-1 flex items-center justify-center p-6 pt-24">
        <div className="w-full max-w-lg">
          <AnimatePresence mode="wait">
            {!quizComplete ? (
              <motion.div
                key={question.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                className="space-y-8"
              >
                <div className="flex justify-between items-end px-2">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">Défi Mental</p>
                    <h2 className="text-3xl font-black">Question {currentQuestionIdx + 1}</h2>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">Progression</p>
                    <p className="text-xl font-bold">{currentQuestionIdx + 1}/{quizzes.length}</p>
                  </div>
                </div>

                <Card className="border-none bg-card/40 backdrop-blur-3xl shadow-2xl rounded-[2.5rem] overflow-hidden">
                  <CardContent className="p-8 sm:p-12 space-y-10">
                    <p className="text-xl sm:text-2xl font-medium leading-tight tracking-tight text-center">
                      {question.question}
                    </p>

                    <div className="grid grid-cols-2 gap-3">
                      {question.options.map((option: string, idx: number) => {
                        const isCorrect = idx === question.correctIndex;
                        const isSelected = idx === selectedOption;
                        
                        return (
                          <motion.button
                            key={idx}
                            whileHover={!isAnswered ? { scale: 1.02 } : {}}
                            whileTap={!isAnswered ? { scale: 0.98 } : {}}
                            onClick={() => handleAnswer(idx)}
                            disabled={isAnswered}
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
                        );
                      })}
                    </div>

                    <AnimatePresence>
                      {isAnswered && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="pt-4"
                        >
                          <Button 
                            onClick={nextQuestion} 
                            className="w-full h-16 rounded-2xl font-black text-xs uppercase tracking-widest gap-3 shadow-xl shadow-primary/20"
                          >
                            {currentQuestionIdx === quizzes.length - 1 ? "Terminer" : "Question Suivante"}
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
                  <h2 className="text-4xl font-black tracking-tight">Quiz Terminé</h2>
                  <p className="text-muted-foreground font-medium">Votre esprit s'est enrichi de nouveaux savoirs.</p>
                </div>

                <div className="p-10 bg-card/40 backdrop-blur-3xl rounded-[3rem] border border-primary/5 shadow-2xl">
                  <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40 mb-2">Points Récoltés</p>
                  <p className="text-6xl font-black tabular-nums">+{score}</p>
                </div>

                <div className="flex flex-col gap-4">
                  <Button 
                    onClick={resetQuiz} 
                    disabled={updating}
                    className="w-full h-16 rounded-2xl font-black text-xs uppercase tracking-widest gap-3"
                  >
                    {updating ? <Loader2 className="animate-spin h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
                    Recommencer le défi
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
