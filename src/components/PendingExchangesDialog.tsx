"use client";

import { motion } from "framer-motion";
import { useUser, useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { doc, serverTimestamp, collection, query, where, orderBy, deleteDoc, updateDoc, increment } from "firebase/firestore";
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
  Clock
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { haptic } from "@/lib/haptics";
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';

interface PendingExchangesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PendingExchangesDialog({ open, onOpenChange }: PendingExchangesDialogProps) {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();

  const pendingExchangesQuery = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return query(
      collection(db, "exchanges"),
      where("userId", "==", user.uid),
      where("status", "==", "pending"),
      orderBy("requestedAt", "desc")
    );
  }, [db, user?.uid]);

  const { data: pendingExchanges, loading: exchangesLoading } = useCollection(pendingExchangesQuery);

  const handleCancelExchange = (id: string) => {
    if (!db || !user?.uid) return;
    
    const exchange = pendingExchanges?.find(e => e.id === id);
    if (!exchange) return;

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
            title: "Demande annulée",
            description: "Votre lumière vous a été restituée."
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
        <div className="p-8 space-y-8 max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Historique</p>
              <DialogTitle className="text-2xl font-black tracking-tight">Demandes en cours</DialogTitle>
            </div>
          </DialogHeader>

          <div className="space-y-4 pr-2">
            {exchangesLoading ? (
              <div className="flex justify-center p-20">
                <Loader2 className="h-8 w-8 animate-spin opacity-20" />
              </div>
            ) : !pendingExchanges || pendingExchanges.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 opacity-20 space-y-4 text-center">
                <Zap className="h-12 w-12" />
                <p className="text-xs font-black uppercase tracking-widest">Aucune demande active</p>
              </div>
            ) : (
              pendingExchanges.map((ex) => (
                <motion.div
                  key={ex.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                >
                  <Card className="border-none bg-card/40 backdrop-blur-xl shadow-xl rounded-[2rem] overflow-hidden border border-primary/5">
                    <CardContent className="p-6 flex items-center justify-between gap-4">
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Zap className="h-3 w-3 text-primary opacity-40" />
                          <span className="text-base font-black tabular-nums">{ex.amount?.toLocaleString()} FCFA</span>
                        </div>
                        <div className="flex items-center gap-2 opacity-40">
                          <Clock className="h-3 w-3" />
                          <p className="text-[9px] font-bold uppercase tracking-widest">
                            {ex.requestedAt && typeof ex.requestedAt.toDate === 'function' ? ex.requestedAt.toDate().toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }) : '---'}
                          </p>
                        </div>
                      </div>

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleCancelExchange(ex.id)}
                        className="h-12 w-12 rounded-2xl text-destructive hover:bg-destructive/10 transition-colors"
                      >
                        <Trash2 className="h-5 w-5" />
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              ))
            )}
          </div>

          <div className="p-6 bg-primary/5 rounded-[2rem] border border-primary/5">
            <p className="text-[10px] leading-relaxed font-medium opacity-40 text-center italic">
              "Une demande annulée libère immédiatement votre Lumière mise en séquestre."
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
