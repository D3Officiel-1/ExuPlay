
"use client";

import { motion } from "framer-motion";
import { useUser, useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { doc, serverTimestamp, collection, query, where, orderBy, deleteDoc, updateDoc, increment, limit } from "firebase/firestore";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Zap, 
  Loader2, 
  Trash2,
  Clock,
  CheckCircle2,
  XCircle,
  History,
  Info
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { haptic } from "@/lib/haptics";
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface PendingExchangesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * @fileOverview Oracle de l'Historique de Flux.
 * Affiche toutes les tentatives de matérialisation de Lumière de l'utilisateur.
 */
export function PendingExchangesDialog({ open, onOpenChange }: PendingExchangesDialogProps) {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();

  const exchangesQuery = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return query(
      collection(db, "exchanges"),
      where("userId", "==", user.uid),
      orderBy("requestedAt", "desc"),
      limit(20)
    );
  }, [db, user?.uid]);

  const { data: exchanges, loading: exchangesLoading } = useCollection(exchangesQuery);

  const handleCancelExchange = (id: string) => {
    if (!db || !user?.uid) return;
    
    const exchange = exchanges?.find(e => e.id === id);
    if (!exchange || exchange.status !== 'pending') return;

    haptic.medium();
    const userRef = doc(db, "users", user.uid);

    // 1. Restituer les points
    updateDoc(userRef, {
      totalPoints: increment(exchange.points || 0),
      updatedAt: serverTimestamp()
    }).then(() => {
      // 2. Supprimer le document
      deleteDoc(doc(db, "exchanges", id))
        .then(() => {
          haptic.success();
          toast({
            title: "Demande révoquée",
            description: "Votre Lumière a réintégré votre essence."
          });
        })
        .catch((error) => {
          const permissionError = new FirestorePermissionError({
            path: `exchanges/${id}`,
            operation: 'delete',
          } satisfies SecurityRuleContext);
          errorEmitter.emit('permission-error', permissionError);
        });
    }).catch(async (error) => {
      const permissionError = new FirestorePermissionError({
        path: userRef.path,
        operation: 'update',
        requestResourceData: { totalPoints: `increment ${exchange.points}` },
      } satisfies SecurityRuleContext);
      errorEmitter.emit('permission-error', permissionError);
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card/95 backdrop-blur-3xl border-white/5 rounded-[2.5rem] p-0 overflow-hidden shadow-2xl">
        <div className="p-8 space-y-8 max-h-[85vh] flex flex-col">
          <DialogHeader>
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40">Annales</p>
              <DialogTitle className="text-2xl font-black tracking-tight italic">Historique des Flux</DialogTitle>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto no-scrollbar space-y-4 pr-1">
            {exchangesLoading ? (
              <div className="flex justify-center p-20">
                <Loader2 className="h-8 w-8 animate-spin opacity-20" />
              </div>
            ) : !exchanges || exchanges.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 opacity-20 space-y-4 text-center">
                <History className="h-16 w-16" />
                <p className="text-xs font-black uppercase tracking-widest px-10">Aucun flux n'a encore été invoqué</p>
              </div>
            ) : (
              exchanges.map((ex, idx) => (
                <motion.div
                  key={ex.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                >
                  <Card className={cn(
                    "border-none backdrop-blur-xl shadow-lg rounded-[2rem] overflow-hidden border transition-all duration-500",
                    ex.status === 'pending' ? "bg-primary/5 border-primary/5" : "bg-card/40 border-transparent opacity-60"
                  )}>
                    <CardContent className="p-6 flex items-center justify-between gap-4">
                      <div className="space-y-2 min-w-0">
                        <div className="flex items-center gap-2">
                          {ex.status === 'pending' && <Zap className="h-3 w-3 text-orange-500 animate-pulse" />}
                          {ex.status === 'completed' && <CheckCircle2 className="h-3 w-3 text-green-500" />}
                          {ex.status === 'rejected' && <XCircle className="h-3 w-3 text-red-500" />}
                          <span className="text-lg font-black tabular-nums">{ex.amount?.toLocaleString()} FCFA</span>
                        </div>
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2 opacity-40">
                            <Clock className="h-3 w-3" />
                            <p className="text-[9px] font-bold uppercase tracking-widest">
                              {ex.requestedAt && typeof ex.requestedAt.toDate === 'function' 
                                ? format(ex.requestedAt.toDate(), "dd MMM yyyy 'à' HH:mm", { locale: fr }) 
                                : '---'}
                            </p>
                          </div>
                          {ex.status === 'pending' && (
                            <span className="text-[8px] font-black uppercase tracking-widest text-orange-500">Arbitrage en cours</span>
                          )}
                          {ex.status === 'completed' && (
                            <span className="text-[8px] font-black uppercase tracking-widest text-green-600">Matérialisé</span>
                          )}
                          {ex.status === 'rejected' && (
                            <span className="text-[8px] font-black uppercase tracking-widest text-red-600">Flux Refusé</span>
                          )}
                        </div>
                      </div>

                      {ex.status === 'pending' ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleCancelExchange(ex.id)}
                          className="h-12 w-12 rounded-2xl text-destructive hover:bg-destructive/10 transition-colors shrink-0"
                        >
                          <Trash2 className="h-5 w-5" />
                        </Button>
                      ) : (
                        <div className="h-12 w-12 rounded-2xl bg-primary/5 flex items-center justify-center shrink-0">
                          <Info className="h-5 w-5 opacity-20" />
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              ))
            )}
          </div>

          <div className="p-6 bg-primary/5 rounded-[2rem] border border-primary/5 shadow-inner">
            <p className="text-[10px] leading-relaxed font-medium opacity-40 text-center italic">
              "L'historique est le reflet de votre prospérité. Chaque flux validé renforce votre ancrage dans le Sanctuaire."
            </p>
          </div>

          <Button 
            variant="ghost" 
            onClick={() => onOpenChange(false)}
            className="w-full h-10 rounded-xl font-black text-[10px] uppercase opacity-20"
          >
            Fermer l'Historique
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
