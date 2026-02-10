"use client";

import { useEffect, useMemo, useState } from "react";
import { useUser, useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { 
  collection, 
  query, 
  where, 
  doc, 
  updateDoc, 
  increment, 
  serverTimestamp 
} from "firebase/firestore";
import { getRecentMatches, checkOutcome } from "@/app/actions/sport";
import { haptic } from "@/lib/haptics";
import { useToast } from "@/hooks/use-toast";
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';

/**
 * @fileOverview Oracle de la Résolution Sportive v2.0.
 * Sentinelle invisible qui arbitre les coupons terminés dès que les matches sont clos.
 * Utilise désormais getRecentMatches pour éviter le blocage des gains lors du changement de jour.
 */
export function SportBetResolver() {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  const [resolvingIds, setResolvingIds] = useState<Set<string>>(new Set());

  const betsQuery = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return query(
      collection(db, "bets"), 
      where("userId", "==", user.uid), 
      where("status", "==", "pending")
    );
  }, [db, user?.uid]);

  const { data: pendingBets } = useCollection(betsQuery);

  useEffect(() => {
    if (!pendingBets || pendingBets.length === 0 || !db || !user?.uid) return;

    const resolveBets = async () => {
      // 1. Récupérer l'état actuel des matches récents (Hier + Aujourd'hui)
      const currentMatches = await getRecentMatches();

      for (const bet of pendingBets) {
        if (resolvingIds.has(bet.id)) continue;

        // 2. Vérifier si TOUS les matches du coupon sont terminés
        const betMatchIds = bet.selections.map((s: any) => s.matchId);
        const matchesInCoupon = currentMatches.filter(m => betMatchIds.includes(m.id));
        
        // Si on ne trouve pas tous les matches du coupon (ils datent peut-être de plus de 2 jours), 
        // on ne peut pas encore résoudre ce coupon via cette sentinelle simplifiée.
        if (matchesInCoupon.length < betMatchIds.length) continue;

        const allFinished = matchesInCoupon.every(m => m.status === 'finished');

        if (allFinished) {
          setResolvingIds(prev => new Set(prev).add(bet.id));
          
          // 3. Arbitrage de chaque sélection
          const verificationPromises = bet.selections.map(async (sel: any) => {
            const match = matchesInCoupon.find(m => m.id === sel.matchId);
            return match ? await checkOutcome(match, sel.outcome) : false;
          });

          const results = await Promise.all(verificationPromises);
          const isWon = results.every(r => r === true);
          const newStatus = isWon ? 'won' : 'lost';

          // 4. Matérialisation du gain ou scellage de la perte
          const betRef = doc(db, "bets", bet.id);
          const userRef = doc(db, "users", user.uid);

          updateDoc(betRef, {
            status: newStatus,
            resolvedAt: serverTimestamp()
          }).catch(async (error) => {
            const permissionError = new FirestorePermissionError({
              path: betRef.path,
              operation: 'update',
              requestResourceData: { status: newStatus },
            } satisfies SecurityRuleContext);
            errorEmitter.emit('permission-error', permissionError);
          });

          if (isWon) {
            haptic.success();
            updateDoc(userRef, {
              totalPoints: increment(bet.potentialWin),
              updatedAt: serverTimestamp()
            }).then(() => {
              toast({
                title: "Triomphe Sportif !",
                description: `Votre pacte a généré ${bet.potentialWin} PTS de Lumière.`
              });
            }).catch(async (error) => {
              const permissionError = new FirestorePermissionError({
                path: userRef.path,
                operation: 'update',
                requestResourceData: { totalPoints: `increment ${bet.potentialWin}` },
              } satisfies SecurityRuleContext);
              errorEmitter.emit('permission-error', permissionError);
            });
          }
        }
      }
    };

    // Cycle d'arbitrage toutes les 20 secondes
    const interval = setInterval(resolveBets, 20000);
    resolveBets(); // Premier lancement immédiat

    return () => clearInterval(interval);
  }, [pendingBets, db, user?.uid, resolvingIds, toast]);

  return null;
}
