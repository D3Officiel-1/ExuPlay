
"use client";

import { useState, useMemo, useEffect } from "react";
import { useUser, useFirestore, useCollection, useDoc } from "@/firebase";
import { 
  collection, 
  doc, 
  serverTimestamp,
  query,
  orderBy,
  updateDoc,
  increment,
} from "firebase/firestore";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  ChevronLeft, 
  Loader2, 
  Search,
  Zap,
  Smartphone,
  Check,
  X,
  Calendar,
  Info,
  ArrowRight
} from "lucide-react";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { haptic } from "@/lib/haptics";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';

export default function ConversionsAdminPage() {
  const { user, isLoading: authLoading } = useUser();
  const db = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [selectedExchange, setSelectedExchange] = useState<any | null>(null);

  const userDocRef = useMemo(() => {
    if (!db || !user?.uid) return null;
    return doc(db, "users", user.uid);
  }, [db, user?.uid]);

  const { data: profile, loading: profileLoading } = useDoc(userDocRef);

  const exchangesQuery = useMemo(() => {
    if (!db) return null;
    return query(collection(db, "exchanges"), orderBy("requestedAt", "desc"));
  }, [db]);

  const { data: exchanges, loading: exchangesLoading } = useCollection(exchangesQuery);

  useEffect(() => {
    if (!authLoading && !profileLoading && profile) {
      if (profile.role !== 'admin') {
        router.push("/profil");
      }
    }
  }, [profile, profileLoading, authLoading, router]);

  const filteredExchanges = useMemo(() => {
    if (!exchanges) return [];
    const q = search.toLowerCase().trim();
    if (!q) return exchanges;
    return exchanges.filter(ex => 
      (ex.username?.toLowerCase() || "").includes(q) || 
      (ex.phoneNumber || "").includes(q)
    );
  }, [exchanges, search]);

  const handleUpdateStatus = (e: React.MouseEvent, id: string, newStatus: 'completed' | 'rejected') => {
    e.stopPropagation(); // Éviter d'ouvrir le dialogue lors du clic sur les boutons
    if (!db) return;
    setProcessingId(id);
    haptic.medium();

    const exchange = exchanges?.find(e => e.id === id);
    if (!exchange) {
      setProcessingId(null);
      return;
    }

    const exchangeRef = doc(db, "exchanges", id);
    const userRef = doc(db, "users", exchange.userId);

    if (newStatus === 'completed') {
      updateDoc(exchangeRef, {
        status: 'completed',
        processedAt: serverTimestamp()
      })
      .then(() => {
        haptic.success();
        toast({ title: "Demande validée", description: "La transaction est terminée." });
        if (selectedExchange?.id === id) setSelectedExchange(null);
      })
      .catch(async (error) => {
        const permissionError = new FirestorePermissionError({
          path: exchangeRef.path,
          operation: 'update',
          requestResourceData: { status: 'completed' },
        } satisfies SecurityRuleContext);
        errorEmitter.emit('permission-error', permissionError);
      })
      .finally(() => setProcessingId(null));
    } else {
      updateDoc(userRef, {
        totalPoints: increment(exchange.points || 0),
        updatedAt: serverTimestamp()
      })
      .then(() => {
        updateDoc(exchangeRef, {
          status: 'rejected',
          processedAt: serverTimestamp()
        })
        .then(() => {
          haptic.success();
          toast({ title: "Demande rejetée", description: "Les points ont été rendus à l'utilisateur." });
          if (selectedExchange?.id === id) setSelectedExchange(null);
        })
        .catch(async (error) => {
          const permissionError = new FirestorePermissionError({
            path: exchangeRef.path,
            operation: 'update',
            requestResourceData: { status: 'rejected' },
          } satisfies SecurityRuleContext);
          errorEmitter.emit('permission-error', permissionError);
        });
      })
      .catch(async (error) => {
        const permissionError = new FirestorePermissionError({
          path: userRef.path,
          operation: 'update',
          requestResourceData: { totalPoints: `increment ${exchange.points}` },
        } satisfies SecurityRuleContext);
        errorEmitter.emit('permission-error', permissionError);
      })
      .finally(() => setProcessingId(null));
    }
  };

  const handleRowClick = (exchange: any) => {
    haptic.light();
    setSelectedExchange(exchange);
  };

  if (authLoading || profileLoading || profile?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin opacity-20" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col pb-24">
      <main className="flex-1 p-4 pt-20 space-y-6 md:space-y-8 max-w-5xl mx-auto w-full">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full h-10 w-10 md:h-12 md:w-12">
              <ChevronLeft className="h-6 w-6" />
            </Button>
            <div className="space-y-0">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">Finance</p>
              <h1 className="text-xl md:text-2xl font-black tracking-tight">Flux des Conversions</h1>
            </div>
          </div>
          
          <div className="relative w-full max-w-[240px] hidden sm:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 opacity-40" />
            <Input 
              placeholder="Chercher un esprit..." 
              className="pl-10 h-10 rounded-xl bg-card/40 border-primary/5" 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <Card className="border-none bg-card/40 backdrop-blur-3xl rounded-[2rem] overflow-hidden">
          <CardHeader className="p-8 pb-4">
            <CardTitle className="text-sm font-black uppercase tracking-widest opacity-40">Demandes de Retrait</CardTitle>
          </CardHeader>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-primary/5">
                  <TableHead className="font-black text-xs uppercase px-6 md:px-8 py-4">Esprit & Contact</TableHead>
                  <TableHead className="hidden sm:table-cell font-black text-xs uppercase px-8 py-4">Lumière</TableHead>
                  <TableHead className="font-black text-xs uppercase px-6 md:px-8 py-4">Montant Net</TableHead>
                  <TableHead className="hidden sm:table-cell font-black text-xs uppercase px-8 py-4">Date</TableHead>
                  <TableHead className="hidden sm:table-cell font-black text-xs uppercase px-8 py-4">Statut</TableHead>
                  <TableHead className="font-black text-xs uppercase px-6 md:px-8 py-4 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {exchangesLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center">
                      <Loader2 className="h-6 w-6 animate-spin opacity-20 mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : filteredExchanges.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center opacity-40 font-bold uppercase text-[10px] tracking-widest">
                      Aucune demande trouvée
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredExchanges.map((ex) => (
                    <TableRow 
                      key={ex.id} 
                      onClick={() => handleRowClick(ex)}
                      className="border-primary/5 hover:bg-primary/5 transition-colors cursor-pointer"
                    >
                      <TableCell className="px-6 md:px-8 py-6">
                        <div className="flex flex-col gap-1">
                          <span className="font-black text-sm">@{ex.username}</span>
                          <span className="text-[10px] font-bold opacity-40 flex items-center gap-1">
                            <Smartphone className="h-3 w-3" />
                            {ex.phoneNumber}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell px-8 py-6 font-black text-sm">
                        <div className="flex items-center gap-1.5">
                          <Zap className="h-3 w-3 text-primary opacity-40" />
                          {ex.points?.toLocaleString()} PTS
                        </div>
                      </TableCell>
                      <TableCell className="px-6 md:px-8 py-6">
                        <span className="font-black text-primary text-base">
                          {ex.amount?.toLocaleString()} <span className="text-[10px] opacity-40">FCFA</span>
                        </span>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell px-8 py-6">
                        <div className="flex flex-col text-[10px] font-bold opacity-40">
                          <span>{ex.requestedAt && typeof ex.requestedAt.toDate === 'function' ? format(ex.requestedAt.toDate(), "dd MMM yyyy", { locale: fr }) : "---"}</span>
                          <span>{ex.requestedAt && typeof ex.requestedAt.toDate === 'function' ? format(ex.requestedAt.toDate(), "HH:mm") : ""}</span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell px-8 py-6">
                        {ex.status === 'pending' && (
                          <Badge variant="secondary" className="bg-orange-500/10 text-orange-600 border-none font-black text-[9px] uppercase tracking-widest px-3 py-1">
                            En attente
                          </Badge>
                        )}
                        {ex.status === 'completed' && (
                          <Badge variant="secondary" className="bg-green-500/10 text-green-600 border-none font-black text-[9px] uppercase tracking-widest px-3 py-1">
                            Traité
                          </Badge>
                        )}
                        {ex.status === 'rejected' && (
                          <Badge variant="secondary" className="bg-red-500/10 text-red-600 border-none font-black text-[9px] uppercase tracking-widest px-3 py-1">
                            Rejeté
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="px-6 md:px-8 py-6 text-right">
                        {ex.status === 'pending' && (
                          <div className="flex justify-end gap-2">
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              onClick={(e) => handleUpdateStatus(e, ex.id, 'rejected')}
                              disabled={processingId === ex.id}
                              className="h-10 w-10 rounded-xl text-destructive hover:bg-destructive/10"
                            >
                              <X className="h-5 w-5" />
                            </Button>
                            <Button 
                              size="icon" 
                              onClick={(e) => handleUpdateStatus(e, ex.id, 'completed')}
                              disabled={processingId === ex.id}
                              className="h-10 w-10 rounded-xl"
                            >
                              {processingId === ex.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-5 w-5" />}
                            </Button>
                          </div>
                        )}
                        {ex.status !== 'pending' && (
                          <div className="text-[10px] font-black opacity-20 uppercase tracking-widest">
                            {ex.status === 'completed' ? 'Traité' : 'Refusé'}
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      </main>

      <Dialog open={!!selectedExchange} onOpenChange={(open) => !open && setSelectedExchange(null)}>
        <DialogContent className="sm:max-w-md bg-card/95 backdrop-blur-3xl border-white/5 rounded-[2.5rem] p-0 overflow-hidden shadow-2xl">
          <div className="p-8 space-y-8">
            <DialogHeader>
              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Fiche de Transaction</p>
                <DialogTitle className="text-2xl font-black tracking-tight">Détails de la Conversion</DialogTitle>
              </div>
            </DialogHeader>

            {selectedExchange && (
              <div className="space-y-6">
                <div className="flex items-center gap-4 p-6 bg-primary/5 rounded-[2rem] border border-primary/5">
                  <div className="h-12 w-12 bg-background rounded-2xl flex items-center justify-center border border-primary/5 shadow-sm">
                    <Zap className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Esprit Sollicitant</p>
                    <p className="font-black text-lg truncate">@{selectedExchange.username}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-5 bg-background/40 rounded-3xl border border-primary/5 space-y-1">
                    <p className="text-[9px] font-black uppercase tracking-widest opacity-40">Lumière brute</p>
                    <p className="font-black text-base">{selectedExchange.points?.toLocaleString()} <span className="text-[10px] opacity-30">PTS</span></p>
                  </div>
                  <div className="p-5 bg-background/40 rounded-3xl border border-primary/5 space-y-1">
                    <p className="text-[9px] font-black uppercase tracking-widest opacity-40">Montant Net</p>
                    <p className="font-black text-base text-primary">{selectedExchange.amount?.toLocaleString()} <span className="text-[10px] opacity-30">FCFA</span></p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between px-2">
                    <div className="flex items-center gap-2 opacity-40">
                      <Smartphone className="h-3 w-3" />
                      <span className="text-[10px] font-black uppercase tracking-widest">Liaison Wave</span>
                    </div>
                    <span className="text-xs font-bold">{selectedExchange.phoneNumber}</span>
                  </div>
                  <div className="flex items-center justify-between px-2">
                    <div className="flex items-center gap-2 opacity-40">
                      <Calendar className="h-3 w-3" />
                      <span className="text-[10px] font-black uppercase tracking-widest">Date de Requête</span>
                    </div>
                    <span className="text-xs font-bold">
                      {selectedExchange.requestedAt && typeof selectedExchange.requestedAt.toDate === 'function' 
                        ? format(selectedExchange.requestedAt.toDate(), "dd/MM/yyyy HH:mm") 
                        : "---"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between px-2">
                    <div className="flex items-center gap-2 opacity-40">
                      <Info className="h-3 w-3" />
                      <span className="text-[10px] font-black uppercase tracking-widest">État Actuel</span>
                    </div>
                    {selectedExchange.status === 'pending' && <span className="text-[10px] font-black uppercase text-orange-500">En Attente</span>}
                    {selectedExchange.status === 'completed' && <span className="text-[10px] font-black uppercase text-green-500">Traité le {selectedExchange.processedAt && typeof selectedExchange.processedAt.toDate === 'function' ? format(selectedExchange.processedAt.toDate(), "dd/MM") : ""}</span>}
                    {selectedExchange.status === 'rejected' && <span className="text-[10px] font-black uppercase text-red-500">Rejeté le {selectedExchange.processedAt && typeof selectedExchange.processedAt.toDate === 'function' ? format(selectedExchange.processedAt.toDate(), "dd/MM") : ""}</span>}
                  </div>
                </div>

                {selectedExchange.status === 'pending' && (
                  <div className="flex gap-3 pt-4">
                    <Button 
                      variant="outline"
                      onClick={(e) => handleUpdateStatus(e, selectedExchange.id, 'rejected')}
                      disabled={processingId === selectedExchange.id}
                      className="flex-1 h-14 rounded-2xl font-black text-[10px] uppercase tracking-widest text-destructive hover:bg-destructive/5 border-destructive/10"
                    >
                      Refuser
                    </Button>
                    <Button 
                      onClick={(e) => handleUpdateStatus(e, selectedExchange.id, 'completed')}
                      disabled={processingId === selectedExchange.id}
                      className="flex-2 h-14 rounded-2xl font-black text-[10px] uppercase tracking-widest gap-2 shadow-xl shadow-primary/20"
                    >
                      {processingId === selectedExchange.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                      Valider Retrait
                    </Button>
                  </div>
                )}
              </div>
            )}

            <div className="p-6 bg-primary/5 rounded-[2rem] border border-primary/5">
              <p className="text-[10px] leading-relaxed font-medium opacity-40 text-center italic">
                "Chaque flux validé matérialise la Lumière en prospérité terrestre."
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
