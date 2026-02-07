
"use client";

import { useState, useMemo, useEffect, useRef } from "react";
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
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
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
  ArrowRight,
  Filter,
  TrendingUp,
  Clock,
  Banknote,
  ShieldCheck
} from "lucide-react";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { haptic } from "@/lib/haptics";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';
import { cn } from "@/lib/utils";

export default function ConversionsAdminPage() {
  const { user, isLoading: authLoading } = useUser();
  const db = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
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

  const metrics = useMemo(() => {
    if (!exchanges) return { pendingCount: 0, pendingAmount: 0, totalPaid: 0, pointsInLimbo: 0 };
    
    const pending = exchanges.filter(e => e.status === 'pending');
    const completed = exchanges.filter(e => e.status === 'completed');
    
    return {
      pendingCount: pending.length,
      pendingAmount: pending.reduce((acc, e) => acc + (e.amount || 0), 0),
      totalPaid: completed.reduce((acc, e) => acc + (e.amount || 0), 0),
      pointsInLimbo: pending.reduce((acc, e) => acc + (e.points || 0), 0)
    };
  }, [exchanges]);

  const filteredExchanges = useMemo(() => {
    if (!exchanges) return [];
    let result = exchanges;
    
    const q = search.toLowerCase().trim();
    if (q) {
      result = result.filter(ex => 
        (ex.username?.toLowerCase() || "").includes(q) || 
        (ex.phoneNumber || "").includes(q)
      );
    }

    if (statusFilter !== "all") {
      result = result.filter(ex => ex.status === statusFilter);
    }

    return result;
  }, [exchanges, search, statusFilter]);

  const handleUpdateStatus = (e: React.MouseEvent, id: string, newStatus: 'completed' | 'rejected') => {
    e.stopPropagation();
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
        toast({ title: "Flux validé", description: "La Lumière a été matérialisée." });
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
          toast({ title: "Flux révoqué", description: "Les points ont réintégré l'essence de l'esprit." });
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

  const handleCopyPhone = async (phoneNumber: string) => {
    if (!phoneNumber) return;
    const cleanPhone = phoneNumber.replace("+225", "");
    try {
      await navigator.clipboard.writeText(cleanPhone);
      haptic.medium();
      toast({ title: "Numéro capturé", description: `${cleanPhone} prêt pour transfert.` });
    } catch (e) {
      toast({ variant: "destructive", title: "Dissonance", description: "Échec de la capture." });
    }
  };

  const handleContextMenu = (e: React.MouseEvent, phoneNumber: string) => {
    e.preventDefault();
    handleCopyPhone(phoneNumber);
  };

  const handleLongPressStart = (phoneNumber: string) => {
    longPressTimer.current = setTimeout(() => {
      handleCopyPhone(phoneNumber);
    }, 600);
  };

  const handleLongPressEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
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
        </div>

        {/* Métriques de Flux */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="border-none bg-card/40 backdrop-blur-3xl rounded-[1.5rem] p-6 space-y-2">
            <div className="h-10 w-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
              <Clock className="h-5 w-5 text-orange-500" />
            </div>
            <div>
              <p className="text-[8px] font-black uppercase tracking-widest opacity-40">En Attente</p>
              <p className="text-2xl font-black">{metrics.pendingAmount.toLocaleString()} <span className="text-xs opacity-30">FCFA</span></p>
              <p className="text-[9px] font-bold opacity-30 uppercase">{metrics.pendingCount} demandes actives</p>
            </div>
          </Card>

          <Card className="border-none bg-card/40 backdrop-blur-3xl rounded-[1.5rem] p-6 space-y-2">
            <div className="h-10 w-10 rounded-xl bg-primary/5 flex items-center justify-center">
              <Zap className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-[8px] font-black uppercase tracking-widest opacity-40">Lumière Séquestrée</p>
              <p className="text-2xl font-black">{metrics.pointsInLimbo.toLocaleString()} <span className="text-xs opacity-30">PTS</span></p>
              <p className="text-[9px] font-bold opacity-30 uppercase">En attente de matérialisation</p>
            </div>
          </Card>

          <Card className="border-none bg-card/40 backdrop-blur-3xl rounded-[1.5rem] p-6 space-y-2">
            <div className="h-10 w-10 rounded-xl bg-green-500/10 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p className="text-[8px] font-black uppercase tracking-widest opacity-40">Prospérité Versée</p>
              <p className="text-2xl font-black">{metrics.totalPaid.toLocaleString()} <span className="text-xs opacity-30">FCFA</span></p>
              <p className="text-[9px] font-bold opacity-30 uppercase">Volume total historique</p>
            </div>
          </Card>
        </div>

        {/* Filtres et Recherche */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 opacity-40" />
            <Input 
              placeholder="Chercher un esprit ou un numéro..." 
              className="pl-12 h-12 rounded-2xl bg-card/40 border-none" 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-3 w-full sm:w-[240px]">
            <Filter className="h-4 w-4 opacity-40 shrink-0" />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-12 rounded-2xl bg-card/40 border-none px-6 font-bold">
                <SelectValue placeholder="Tous les états" />
              </SelectTrigger>
              <SelectContent className="bg-card/95 backdrop-blur-2xl rounded-2xl border-primary/5">
                <SelectItem value="all" className="font-bold">Toute la stase</SelectItem>
                <SelectItem value="pending" className="font-bold text-orange-500">En attente</SelectItem>
                <SelectItem value="completed" className="font-bold text-green-500">Traité</SelectItem>
                <SelectItem value="rejected" className="font-bold text-red-500">Refusé</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Card className="border-none bg-card/40 backdrop-blur-3xl rounded-[2rem] overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-primary/5">
                  <TableHead className="font-black text-xs uppercase px-6 md:px-8 py-4">Esprit & Contact</TableHead>
                  <TableHead className="hidden sm:table-cell font-black text-xs uppercase px-8 py-4 text-center">Lumière</TableHead>
                  <TableHead className="font-black text-xs uppercase px-6 md:px-8 py-4 text-right">Montant Net</TableHead>
                  <TableHead className="hidden sm:table-cell font-black text-xs uppercase px-8 py-4 text-right">Statut</TableHead>
                  <TableHead className="font-black text-xs uppercase px-6 md:px-8 py-4 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {exchangesLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center">
                      <Loader2 className="h-6 w-6 animate-spin opacity-20 mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : filteredExchanges.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center opacity-40 font-bold uppercase text-[10px] tracking-widest">
                      Aucun flux ne résonne ici
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredExchanges.map((ex) => (
                    <TableRow 
                      key={ex.id} 
                      onClick={() => handleRowClick(ex)}
                      onContextMenu={(e) => handleContextMenu(e, ex.phoneNumber)}
                      onPointerDown={() => handleLongPressStart(ex.phoneNumber)}
                      onPointerUp={handleLongPressEnd}
                      onPointerLeave={handleLongPressEnd}
                      className="border-primary/5 hover:bg-primary/5 transition-colors cursor-pointer select-none"
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
                      <TableCell className="hidden sm:table-cell px-8 py-6 font-black text-sm text-center">
                        <div className="flex items-center justify-center gap-1.5 opacity-60">
                          <Zap className="h-3 w-3 text-primary" />
                          {ex.points?.toLocaleString()} <span className="text-[9px] opacity-40">PTS</span>
                        </div>
                      </TableCell>
                      <TableCell className="px-6 md:px-8 py-6 text-right">
                        <span className="font-black text-primary text-base tabular-nums">
                          {ex.amount?.toLocaleString()} <span className="text-[10px] opacity-40 font-bold">FCFA</span>
                        </span>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell px-8 py-6 text-right">
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
                        {ex.status === 'pending' ? (
                          <div className="flex justify-end gap-2" onClick={e => e.stopPropagation()}>
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
                              className="h-10 w-10 rounded-xl shadow-lg shadow-primary/10"
                            >
                              {processingId === ex.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-5 w-5" />}
                            </Button>
                          </div>
                        ) : (
                          <div className="text-[10px] font-black opacity-20 uppercase tracking-[0.2em]">
                            {ex.status === 'completed' ? 'Archivé' : 'Révoqué'}
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
                <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Fiche de Flux Financier</p>
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
                    <p className="text-[9px] font-black uppercase tracking-widest opacity-40">Énergie Totale</p>
                    <p className="font-black text-base">{selectedExchange.points?.toLocaleString()} <span className="text-[10px] opacity-30 font-bold">PTS</span></p>
                  </div>
                  <div className="p-5 bg-background/40 rounded-3xl border border-primary/5 space-y-1">
                    <p className="text-[9px] font-black uppercase tracking-widest opacity-40">Prospérité Nette</p>
                    <p className="font-black text-base text-primary">{selectedExchange.amount?.toLocaleString()} <span className="text-[10px] opacity-30 font-bold">FCFA</span></p>
                  </div>
                </div>

                <div className="space-y-3 px-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 opacity-40">
                      <Smartphone className="h-3 w-3" />
                      <span className="text-[10px] font-black uppercase tracking-widest">Compte Wave</span>
                    </div>
                    <span className="text-xs font-bold">{selectedExchange.phoneNumber}</span>
                  </div>
                  <div className="flex items-center justify-between">
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
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 opacity-40">
                      <Info className="h-3 w-3" />
                      <span className="text-[10px] font-black uppercase tracking-widest">État du Flux</span>
                    </div>
                    {selectedExchange.status === 'pending' && <span className="text-[10px] font-black uppercase text-orange-500 animate-pulse">En Attente</span>}
                    {selectedExchange.status === 'completed' && <span className="text-[10px] font-black uppercase text-green-500">Versé le {selectedExchange.processedAt && typeof selectedExchange.processedAt.toDate === 'function' ? format(selectedExchange.processedAt.toDate(), "dd/MM") : ""}</span>}
                    {selectedExchange.status === 'rejected' && <span className="text-[10px] font-black uppercase text-red-500">Révoqué le {selectedExchange.processedAt && typeof selectedExchange.processedAt.toDate === 'function' ? format(selectedExchange.processedAt.toDate(), "dd/MM") : ""}</span>}
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
                      Révoquer
                    </Button>
                    <Button 
                      onClick={(e) => handleUpdateStatus(e, selectedExchange.id, 'completed')}
                      disabled={processingId === selectedExchange.id}
                      className="flex-[2] h-14 rounded-2xl font-black text-[10px] uppercase tracking-widest gap-2 shadow-xl shadow-primary/20"
                    >
                      {processingId === selectedExchange.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                      Valider le Transfert
                    </Button>
                  </div>
                )}
              </div>
            )}

            <div className="p-6 bg-primary/5 rounded-[2rem] border border-primary/5">
              <p className="text-[10px] leading-relaxed font-medium opacity-40 text-center italic">
                "Chaque validation harmonise l'éther et matérialise la récompense terrestre."
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
