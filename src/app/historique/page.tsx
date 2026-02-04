
"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { useUser, useFirestore, useCollection } from "@/firebase";
import { collection, query, orderBy } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  ChevronLeft, 
  History, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Trophy,
  Brain
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export default function HistoriquePage() {
  const { user } = useUser();
  const db = useFirestore();
  const router = useRouter();

  const attemptsQuery = useMemo(() => {
    if (!db || !user?.uid) return null;
    return query(
      collection(db, "users", user.uid, "attempts"),
      orderBy("attemptedAt", "desc")
    );
  }, [db, user?.uid]);

  const quizzesQuery = useMemo(() => {
    if (!db) return null;
    return collection(db, "quizzes");
  }, [db]);

  const { data: attempts, loading: attemptsLoading } = useCollection(attemptsQuery);
  const { data: quizzes, loading: quizzesLoading } = useCollection(quizzesQuery);

  const history = useMemo(() => {
    if (!attempts || !quizzes) return [];
    return attempts.map(attempt => {
      const quiz = quizzes.find(q => q.id === attempt.id);
      return {
        ...attempt,
        quizDetails: quiz
      };
    }).filter(h => h.status === "completed");
  }, [attempts, quizzes]);

  if (attemptsLoading || quizzesLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <motion.div 
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.7, 0.3] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="h-12 w-12 bg-primary/20 rounded-full blur-xl"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col pb-32">
      <Header />
      
      <main className="flex-1 p-6 pt-24 space-y-8 max-w-lg mx-auto w-full">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => router.back()}
            className="rounded-full h-10 w-10 hover:bg-primary/5"
          >
            <ChevronLeft className="h-6 w-6" />
          </Button>
          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40">Parcours</p>
            <h1 className="text-3xl font-black tracking-tight">Historique</h1>
          </div>
        </div>

        <div className="space-y-4">
          {history.length > 0 ? (
            history.map((item, idx) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
              >
                <Card className="border-none bg-card/40 backdrop-blur-3xl shadow-xl rounded-[2rem] overflow-hidden group">
                  <CardContent className="p-6 space-y-4">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 opacity-40">
                          <Clock className="h-3 w-3" />
                          <p className="text-[10px] font-black uppercase tracking-widest">
                            {item.attemptedAt ? format(item.attemptedAt.toDate(), "d MMMM yyyy 'à' HH:mm", { locale: fr }) : "Date inconnue"}
                          </p>
                        </div>
                        <h3 className="text-sm font-bold leading-tight pr-4">
                          {item.quizDetails?.question || "Question supprimée"}
                        </h3>
                      </div>
                      <div className={`p-2 rounded-xl flex items-center justify-center ${item.score > 0 ? "bg-green-500/10 text-green-600" : "bg-red-500/10 text-red-600"}`}>
                        {item.score > 0 ? <Trophy className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                      </div>
                    </div>

                    {item.quizDetails && (
                      <div className="space-y-3 pt-2">
                        <div className="grid grid-cols-1 gap-2">
                          {item.quizDetails.options.map((option: string, oIdx: number) => {
                            const isCorrect = oIdx === item.quizDetails.correctIndex;
                            const isUserAnswer = oIdx === item.userAnswerIndex;
                            
                            if (!isCorrect && !isUserAnswer) return null;

                            return (
                              <div 
                                key={oIdx}
                                className={`flex items-center justify-between p-3 rounded-xl border text-xs font-bold ${
                                  isCorrect 
                                    ? "bg-green-500/5 border-green-500/20 text-green-600" 
                                    : "bg-red-500/5 border-red-500/20 text-red-600"
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  {isCorrect ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                                  <span>{option}</span>
                                </div>
                                <span className="text-[8px] uppercase tracking-widest opacity-60">
                                  {isUserAnswer ? (isCorrect ? "VOTRE RÉPONSE" : "VOTRE ERREUR") : "LA VÉRITÉ"}
                                </span>
                              </div>
                            );
                          })}
                          {item.userAnswerIndex === undefined && (
                            <div className="p-3 rounded-xl border bg-orange-500/5 border-orange-500/20 text-orange-600 text-xs font-bold flex items-center gap-3">
                              <History className="h-3.5 w-3.5" />
                              <span>Temps écoulé (Aucune réponse)</span>
                            </div>
                          )}
                        </div>
                        <div className="flex justify-end">
                          <p className="text-[10px] font-black uppercase tracking-widest opacity-30">
                            +{item.score} POINTS RÉCOLTÉS
                          </p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ))
          ) : (
            <div className="text-center py-20 space-y-4 opacity-20">
              <Brain className="h-16 w-16 mx-auto" />
              <p className="text-sm font-black uppercase tracking-[0.2em]">Aucun éveil enregistré</p>
              <Button 
                variant="ghost" 
                onClick={() => router.push("/home")}
                className="text-[10px] font-black uppercase tracking-widest"
              >
                Commencer mon parcours
              </Button>
            </div>
          )}
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
