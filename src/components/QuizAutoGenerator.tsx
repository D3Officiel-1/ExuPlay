"use client";

import { useEffect, useMemo, useState } from "react";
import { useFirestore, useDoc, useUser } from "@/firebase";
import { 
  doc, 
  updateDoc, 
  serverTimestamp, 
  collection, 
  addDoc, 
  Timestamp 
} from "firebase/firestore";
import { generateQuiz } from "@/ai/flows/generate-quiz-flow";

/**
 * @fileOverview Oracle de la Genèse Perpétuelle.
 * Un composant invisible qui veille sur le temps et invoque l'IA pour créer des quiz toutes les 5 minutes.
 */
export function QuizAutoGenerator() {
  const db = useFirestore();
  const { user } = useUser();
  const [isGenerating, setIsGenerating] = useState(false);

  const statusRef = useMemo(() => db ? doc(db, "appConfig", "status") : null, [db]);
  const { data: status } = useDoc(statusRef);

  useEffect(() => {
    if (!db || !status || isGenerating || !user) return;

    const checkAndGenerate = async () => {
      // On vérifie si 5 minutes se sont écoulées depuis la dernière génération
      const now = Date.now();
      const lastGen = status.lastAutoGenerationAt 
        ? (status.lastAutoGenerationAt as Timestamp).toDate().getTime() 
        : 0;
      
      const fiveMinutes = 5 * 60 * 1000;

      if (now - lastGen >= fiveMinutes) {
        setIsGenerating(true);
        console.log("[Oracle] Le cycle de 5 minutes est révolu. Invocation de l'IA pour forger le Savoir...");

        try {
          // 1. Marquer immédiatement le début de la génération pour verrouiller le slot
          // Cela empêche plusieurs utilisateurs de déclencher la génération simultanément
          await updateDoc(statusRef!, {
            lastAutoGenerationAt: serverTimestamp()
          });

          // 2. Invoquer l'IA pour créer un nouveau défi complexe
          // C'est ici que l'IA (Genkit) est sollicitée
          const result = await generateQuiz({ 
            theme: "Côte d'Ivoire - Culture et Histoire" 
          });
          
          if (result) {
            // 3. Ancrer le nouveau défi dans la base de connaissances
            await addDoc(collection(db, "quizzes"), {
              ...result,
              playedCount: 0,
              createdAt: serverTimestamp()
            });
            console.log("[Oracle] Un nouveau défi a été matérialisé par l'IA.");
          }
        } catch (error) {
          console.error("[Oracle] Dissonance lors de la genèse automatique par l'IA:", error);
        } finally {
          setIsGenerating(false);
        }
      }
    };

    // Vérification périodique du flux temporel toutes les minutes
    const interval = setInterval(checkAndGenerate, 60000);
    checkAndGenerate();

    return () => clearInterval(interval);
  }, [db, status, isGenerating, user, statusRef]);

  return null;
}
