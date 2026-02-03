
"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useUser, useFirestore, useDoc } from "@/firebase";
import { doc, updateDoc, increment, serverTimestamp } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { BottomNav } from "@/components/BottomNav";
import { Header } from "@/components/Header";
import { Trophy, CheckCircle2, XCircle, ArrowRight, Loader2, Sparkles } from "lucide-react";
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';

const QUIZ_QUESTIONS = [
  {
    id: 1,
    question: "Qui a écrit 'Le Banquet' ?",
    options: ["Socrate", "Platon", "Aristote", "Épicure"],
    correct: 1,
    points: 100
  },
  {
    id: 2,
    question: "Quel philosophe a affirmé 'Dieu est mort' ?",
    options: ["Kant", "Hegel", "Nietzsche", "Sartre"],
    correct: 2,
    points: 150
  },
  {
    id: 3,
    question: "Le concept de 'Cogito' est associé à :",
    options: ["Descartes", "Spinoza", "Pascal", "Leibniz"],
    correct: 0,
    points: 100
  },
  {
    id: 4,
    question: "Qui est l'auteur de 'L'Existentialisme est un humanisme' ?",
    options: ["Camus", "Sartre", "Beauvoir", "Heidegger"],
    correct: 1,
    points: 120
  }
];

export default function HomePage() {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [quizComplete, setQuizComplete] = useState(false);
  const [updating, setUpdating] = useState(false);
  
  const { user } = useUser();
  const db = useFirestore();

  const handleAnswer = (index: number) => {
    if (isAnswered) return;
    setSelectedOption(index);
    setIsAnswered(true);
    
    if (index === QUIZ_QUESTIONS[currentQuestion].correct) {
      setScore(prev => prev + QUIZ_QUESTIONS[currentQuestion].points);
    }
  };

  const nextQuestion = () => {
    if (currentQuestion < QUIZ_QUESTIONS.length - 1) {
      setCurrentQuestion(prev => prev + 1);
      setSelectedOption(null);
      setIsAnswered(false);
    } else {
      finishQuiz();
    }
  };

  const finishQuiz = async () => {
    setQuizComplete(true);
    if (user && score > 0) {
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
    setCurrentQuestion(0);
    setSelectedOption(null);
    setIsAnswered(false);
    setScore(0);
    setQuizComplete(false);
  };

  const question = QUIZ_QUESTIONS[currentQuestion];

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
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">Défi Philosophique</p>
                    <h2 className="text-3xl font-black">Question {currentQuestion + 1}</h2>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">Progression</p>
                    <p className="text-xl font-bold">{currentQuestion + 1}/{QUIZ_QUESTIONS.length}</p>
                  </div>
                </div>

                <Card className="border-none bg-card/40 backdrop-blur-3xl shadow-2xl rounded-[2.5rem] overflow-hidden">
                  <CardContent className="p-8 sm:p-12 space-y-10">
                    <p className="text-xl sm:text-2xl font-medium leading-tight tracking-tight text-center">
                      {question.question}
                    </p>

                    <div className="grid gap-3">
                      {question.options.map((option, idx) => {
                        const isCorrect = idx === question.correct;
                        const isSelected = idx === selectedOption;
                        
                        return (
                          <motion.button
                            key={idx}
                            whileHover={!isAnswered ? { scale: 1.02 } : {}}
                            whileTap={!isAnswered ? { scale: 0.98 } : {}}
                            onClick={() => handleAnswer(idx)}
                            disabled={isAnswered}
                            className={`
                              w-full p-6 rounded-2xl text-left font-bold transition-all duration-300 flex items-center justify-between border
                              ${!isAnswered 
                                ? "bg-background/50 border-primary/5 hover:border-primary/20" 
                                : isCorrect 
                                  ? "bg-green-500/10 border-green-500/50 text-green-600 dark:text-green-400" 
                                  : isSelected 
                                    ? "bg-red-500/10 border-red-500/50 text-red-600 dark:text-red-400" 
                                    : "bg-background/20 border-transparent opacity-40"}
                            `}
                          >
                            <span>{option}</span>
                            {isAnswered && isCorrect && <CheckCircle2 className="h-5 w-5" />}
                            {isAnswered && isSelected && !isCorrect && <XCircle className="h-5 w-5" />}
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
                            {currentQuestion === QUIZ_QUESTIONS.length - 1 ? "Terminer" : "Question Suivante"}
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
                  <h2 className="text-4xl font-black tracking-tight">Éveil Terminé</h2>
                  <p className="text-muted-foreground font-medium">Votre esprit s'est enrichi de nouvelles pensées.</p>
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
                    Recommencer l'éveil
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
