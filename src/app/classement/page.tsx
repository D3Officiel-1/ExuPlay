
"use client";

import { useMemo, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useFirestore, useCollection, useUser, useDoc } from "@/firebase";
import { 
  collection, 
  query, 
  orderBy, 
  limit, 
  doc, 
  updateDoc, 
  increment, 
  serverTimestamp, 
  addDoc 
} from "firebase/firestore";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Trophy, 
  Loader2, 
  Zap, 
  Shield, 
  Swords, 
  ArrowRightLeft, 
  X, 
  Check, 
  User as UserIcon,
  ShieldCheck,
  AlertCircle,
  Plus,
  Users
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ProfileAvatar } from "@/components/ProfileAvatar";
import { getHonorTitle } from "@/lib/titles";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { haptic } from "@/lib/haptics";

export default function ClassementPage() {
  const db = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [selectedUserForVision, setSelectedUserForVision] = useState<any>(null);
  const [amount, setAmount] = useState("");
  const [mode, setMode] = useState<'transfer' | 'duel'>('transfer');
  const [isProcessing, setIsProcessing] = useState(false);
  const [battleParty, setBattleParty] = useState<any[]>([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);

  const myProfileRef = useMemo(() => (db && user?.uid) ? doc(db, "users", user.uid) : null, [db, user?.uid]);
  const { data: myProfile } = useDoc(myProfileRef);

  const topUsersQuery = useMemo(() => {
    if (!db) return null;
    return query(collection(db, "users"), orderBy("totalPoints", "desc"), limit(50));
  }, [db]);

  const { data: allUsers, loading } = useCollection(topUsersQuery);

  const { podium, rest } = useMemo(() => {
    if (!allUsers) return { podium: [], rest: [] };
    
    // Logique du Voile de l'Esprit : on filtre ceux qui veulent être masqués,
    // SAUF si c'est l'utilisateur actuel lui-même.
    const visibleUsers = allUsers.filter(u => !u.rankingHidden || u.id === user?.uid);
    
    return {
      podium: visibleUsers.slice(0, 3),
      rest: visibleUsers.slice(3)
    };
  }, [allUsers, user?.uid]);

  const handleUserClick = (u: any) => {
    if (u.id === user?.uid) {
      haptic.medium();
      toast({ title: "C'est vous !", description: "Explorez votre propre profil." });
      return;
    }

    if (isSelectionMode) {
      haptic.light();
      setBattleParty(prev => {
        const exists = prev.find(p => p.id === u.id);
        if (exists) return prev.filter(p => p.id !== u.id);
        return [...prev, u];
      });
      return;
    }

    haptic.light();
    setSelectedUser(u);
    setAmount("");
    setMode('transfer');
    setBattleParty([u]);
  };

  const handleEnterSelectionMode = () => {
    haptic.medium();
    setIsSelectionMode(true);
    setSelectedUser(null);
  };

  const handleAction = async () => {
    if (battleParty.length === 0 || !amount || isProcessing || !user?.uid || !db) return;
    
    const bet = parseInt(amount);
    if (isNaN(bet) || bet <= 0) {
      toast({ variant: "destructive", title: "Montant invalide" });
      return;
    }

    const fees = mode === 'transfer' ? Math.floor(bet * 0.1) : 0;
    const totalCost = mode === 'transfer' ? (bet + fees) : (bet * battleParty.length);
    const dailyLimit = myProfile?.trustBadge ? 2500 : 500;

    if (bet > dailyLimit) {
      haptic.error();
      toast({ variant: "destructive", title: "Limite dépassée", description: `Votre limite est de ${dailyLimit} PTS.` });
      return;
    }

    if ((myProfile?.totalPoints || 0) < totalCost) {
      haptic.error();
      toast({ variant: "destructive", title: "Lumière insuffisante", description: `Il vous faut ${totalCost} PTS.` });
      return;
    }

    setIsProcessing(true);
    haptic.medium();

    try {
      const senderRef = doc(db, "users", user.uid);

      if (mode === 'transfer') {
        const receiver = battleParty[0];
        const receiverRef = doc(db, "users", receiver.id);
        await updateDoc(senderRef, { totalPoints: increment(-totalCost), updatedAt: serverTimestamp() });
        await updateDoc(receiverRef, { totalPoints: increment(bet), updatedAt: serverTimestamp() });
        await addDoc(collection(db, "transfers"), {
          fromId: user.uid, fromName: myProfile?.username || "Anonyme", fromPhoto: myProfile?.profileImage || "",
          toId: receiver.id, amount: bet, timestamp: new Date().toISOString(), read: false
        });
        toast({ title: "Transmission réussie" });
      } else {
        await updateDoc(senderRef, { totalPoints: increment(-(bet * battleParty.length)), updatedAt: serverTimestamp() });
        
        const participants: Record<string, any> = {
          [user.uid]: {
            name: myProfile?.username || "Anonyme",
            photo: myProfile?.profileImage || "",
            status: 'accepted'
          }
        };

        battleParty.forEach(p => {
          participants[p.id] = {
            name: p.username || "Anonyme",
            photo: p.profileImage || "",
            status: 'pending'
          };
        });

        await addDoc(collection(db, "duels"), {
          challengerId: user.uid,
          challengerName: myProfile?.username || "Anonyme",
          challengerPhoto: myProfile?.profileImage || "",
          participantIds: [user.uid, ...battleParty.map(p => p.id)],
          participants,
          wager: bet,
          status: 'pending',
          createdAt: serverTimestamp(),
          round: 1
        });
        toast({ title: "Choc des Esprits lancé !", description: `Attente des ${battleParty.length} opposants.` });
      }
      setSelectedUser(null);
      setBattleParty([]);
      setIsSelectionMode(false);
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "Dissonance" });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleContextMenu = (e: React.MouseEvent, u: any) => {
    if (u.id === user?.uid) return;
    e.preventDefault();
    haptic.medium();
    setSelectedUserForVision(u);
  };

  const handleLongPressStart = (u: any) => {
    if (u.id === user?.uid) return;
    longPressTimer.current = setTimeout(() => {
      haptic.medium();
      setSelectedUserForVision(u);
    }, 600);
  };

  const handleLongPressEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin opacity-20" /></div>;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col pb-32">
      <main className="flex-1 p-6 pt-24 space-y-10 max-w-lg mx-auto w-full">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40">Hiérarchie</p>
            <h1 className="text-3xl font-black tracking-tight">Le Hall des Sages</h1>
          </div>
          {isSelectionMode && (
            <Button variant="ghost" onClick={() => { haptic.light(); setIsSelectionMode(false); setBattleParty([]); }} className="h-10 rounded-xl bg-destructive/5 text-destructive text-[10px] font-black uppercase">
              Annuler
            </Button>
          )}
        </div>

        {/* Podium Section */}
        {podium.length > 0 && (
          <div className="grid grid-cols-3 items-end gap-2 px-2 pt-8 pb-4 relative">
            <div className="absolute inset-0 bg-primary/5 blur-[100px] rounded-full -z-10" />
            
            {podium.map((u, idx) => {
              const rankMap = [2, 1, 3];
              const rank = rankMap[idx];
              // Podium index: Left(2nd), Center(1st), Right(3rd)
              const displayOrder = [1, 0, 2]; // 0 is 1st, 1 is 2nd, 2 is 3rd
              const userInPodium = podium[displayOrder[idx]];
              if (!userInPodium) return null;
              const isSelected = battleParty.find(p => p.id === userInPodium.id);

              return (
                <motion.div 
                  key={userInPodium.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    "flex flex-col items-center gap-3 cursor-pointer select-none transition-all",
                    rank === 1 && "-mt-8",
                    isSelected && "scale-110"
                  )}
                  onClick={() => handleUserClick(userInPodium)}
                  onContextMenu={(e) => handleContextMenu(e, userInPodium)}
                  onPointerDown={() => handleLongPressStart(userInPodium)}
                  onPointerUp={handleLongPressEnd}
                  onPointerLeave={handleLongPressEnd}
                >
                  <div className="relative">
                    <ProfileAvatar imageUrl={userInPodium.profileImage} points={userInPodium.totalPoints} size={rank === 1 ? "lg" : "md"} className={cn(isSelected && "ring-4 ring-primary ring-offset-4 ring-offset-background")} />
                    <div className={cn(
                      "absolute -top-3 flex items-center justify-center rounded-full border-2 border-background shadow-lg",
                      rank === 1 ? "-right-2 bg-yellow-500 text-black h-8 w-8" : rank === 2 ? "-right-2 bg-gray-400 text-white h-6 w-6" : "-left-2 bg-orange-400 text-white h-6 w-6"
                    )}>
                      {rank === 1 ? <Trophy className="h-4 w-4" /> : <span className="text-[10px] font-black">{rank}</span>}
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="text-[9px] font-black uppercase truncate w-24">@{userInPodium.username}</p>
                    <p className="text-[10px] font-bold opacity-40">{userInPodium.totalPoints} PTS</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        <div className="space-y-4">
          {rest.map((u, idx) => {
            const isMe = u.id === user?.uid;
            const isSelected = battleParty.find(p => p.id === u.id);
            const rank = idx + 4;
            const title = getHonorTitle(u.totalPoints || 0);

            return (
              <motion.div 
                key={u.id} 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                onClick={() => handleUserClick(u)}
                onContextMenu={(e) => handleContextMenu(e, u)}
                onPointerDown={() => handleLongPressStart(u)}
                onPointerUp={handleLongPressEnd}
                onPointerLeave={handleLongPressEnd}
                className="select-none"
              >
                <Card className={cn(
                  "border-none backdrop-blur-3xl transition-all duration-500 overflow-hidden rounded-[2rem] cursor-pointer",
                  isSelected ? "bg-primary text-primary-foreground shadow-2xl scale-[1.02]" : isMe ? "bg-primary/5 opacity-60" : "bg-card/40 shadow-lg hover:bg-card/60"
                )}>
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="flex flex-col items-center justify-center w-10 shrink-0">
                      <span className={cn("text-xs font-black opacity-30", isSelected && "opacity-60")}>#{rank}</span>
                    </div>
                    <ProfileAvatar imageUrl={u.profileImage} points={u.totalPoints} size="sm" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-black text-sm truncate uppercase tracking-tight">@{u.username}</p>
                        {!isSelected && <Shield className={cn("h-2.5 w-2.5", title.color)} />}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Zap className={cn("h-3 w-3 text-primary", isSelected && "text-primary-foreground")} />
                        <p className={cn("text-[10px] font-bold uppercase opacity-40", isSelected && "opacity-80")}>{u.totalPoints?.toLocaleString()} PTS</p>
                      </div>
                    </div>
                    {isSelected && <Check className="h-5 w-5 text-primary-foreground" />}
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </main>

      {/* Floating Action for Selection Mode */}
      <AnimatePresence>
        {isSelectionMode && battleParty.length > 0 && (
          <motion.div initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }} className="fixed bottom-24 left-0 right-0 z-50 px-6 max-w-lg mx-auto">
            <Button onClick={() => setSelectedUser(battleParty[0])} className="w-full h-16 rounded-[2rem] font-black text-sm uppercase tracking-widest gap-3 shadow-2xl">
              <Swords className="h-5 w-5" /> Lancer le Choc ({battleParty.length + 1} esprits)
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Oracle Vision Dialog */}
      <Dialog open={!!selectedUserForVision} onOpenChange={(open) => !open && setSelectedUserForVision(null)}>
        <DialogContent className="max-w-[90vw] sm:max-w-md bg-transparent border-none p-0 overflow-hidden shadow-none ring-0 [&>button]:hidden">
          {selectedUserForVision && (
            <motion.div className="relative w-full aspect-[4/5] bg-card/40 backdrop-blur-3xl rounded-[3rem] border border-white/10 shadow-2xl overflow-hidden flex flex-col">
              <div className="relative flex-1 w-full overflow-hidden">
                {selectedUserForVision.profileImage ? <img src={selectedUserForVision.profileImage} alt="" className="absolute inset-0 w-full h-full object-cover" /> : <div className="absolute inset-0 flex items-center justify-center bg-primary/5"><UserIcon className="h-32 w-32 text-primary opacity-10" /></div>}
                <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
              </div>
              <div className="p-10 space-y-8 relative z-10 bg-background/60 backdrop-blur-3xl border-t border-white/5">
                <div className="text-center space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-[0.5em] opacity-40">Oracle de la Vision</p>
                  <h2 className="text-4xl font-black italic tracking-tighter uppercase">@{selectedUserForVision.username}</h2>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-5 bg-primary/5 rounded-[2rem] text-center space-y-1"><p className="text-[9px] font-black uppercase tracking-widest opacity-40">Lumière</p><p className="font-black text-lg">{selectedUserForVision.totalPoints?.toLocaleString()} PTS</p></div>
                  <div className="p-5 bg-primary/5 rounded-[2rem] text-center space-y-1"><p className="text-[9px] font-black uppercase tracking-widest opacity-40">Valeur</p><p className="font-black text-lg text-primary">{(selectedUserForVision.totalPoints * 0.5).toLocaleString()} FCFA</p></div>
                </div>
                <Button onClick={() => setSelectedUserForVision(null)} className="w-full h-16 rounded-[2rem] font-black text-xs uppercase tracking-[0.3em] shadow-2xl shadow-primary/20">Fermer</Button>
              </div>
            </motion.div>
          )}
        </DialogContent>
      </Dialog>

      {/* Interaction Dialog */}
      <Dialog open={!!selectedUser} onOpenChange={(open) => !open && setSelectedUser(null)}>
        <DialogContent className="sm:max-w-md bg-card/95 backdrop-blur-3xl border-white/5 rounded-[2.5rem] p-0 overflow-hidden shadow-2xl">
          <div className="p-8 space-y-8">
            <DialogHeader>
              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Action de Flux</p>
                <DialogTitle className="text-2xl font-black tracking-tight">{mode === 'duel' ? "Le Choc des Esprits" : "Transmission"}</DialogTitle>
              </div>
            </DialogHeader>

            {selectedUser && (
              <div className="space-y-8">
                <div className="flex items-center gap-4 p-6 bg-primary/5 rounded-[2rem] border border-primary/5">
                  <div className="flex -space-x-4">
                    {battleParty.slice(0, 3).map((p, i) => (
                      <ProfileAvatar key={p.id} imageUrl={p.profileImage} size="sm" className="ring-2 ring-background" />
                    ))}
                    {battleParty.length > 3 && (
                      <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center text-[10px] font-black text-white ring-2 ring-background">+{battleParty.length - 3}</div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-sm truncate">{battleParty.length > 1 ? `${battleParty.length} Adversaires` : `@${selectedUser.username}`}</p>
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-40">{mode === 'duel' ? "Préparation au choc" : "Destinataire"}</p>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="flex gap-2 p-1 bg-primary/5 rounded-2xl">
                    <Button variant={mode === 'transfer' ? 'default' : 'ghost'} onClick={() => { setMode('transfer'); setBattleParty([selectedUser]); setIsSelectionMode(false); }} className="flex-1 h-12 rounded-xl text-[10px] font-black uppercase tracking-widest gap-2">
                      <ArrowRightLeft className="h-3.5 w-3.5" /> Transfert
                    </Button>
                    <Button variant={mode === 'duel' ? 'default' : 'ghost'} onClick={() => setMode('duel')} className="flex-1 h-12 rounded-xl text-[10px] font-black uppercase tracking-widest gap-2">
                      <Swords className="h-3.5 w-3.5" /> Duel
                    </Button>
                  </div>

                  {mode === 'duel' && (
                    <Button variant="outline" onClick={handleEnterSelectionMode} className="w-full h-12 rounded-xl text-[10px] font-black uppercase tracking-widest gap-2 bg-primary/5 border-primary/10">
                      <Plus className="h-4 w-4" /> Ajouter un autre opposant
                    </Button>
                  )}

                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase opacity-40 ml-2">Mise de Lumière (par esprit)</Label>
                    <div className="relative">
                      <Zap className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-primary opacity-20" />
                      <Input type="number" placeholder="0" value={amount} onChange={(e) => setAmount(e.target.value)} className="h-16 text-3xl font-black text-center pl-12 rounded-2xl bg-primary/5 border-none" autoFocus />
                    </div>
                  </div>

                  <div className="space-y-3">
                    {mode === 'transfer' && (
                      <div className="flex items-center justify-between p-4 bg-orange-500/5 rounded-2xl border border-orange-500/10">
                        <span className="text-[10px] font-black uppercase opacity-60">Taxe (10%)</span>
                        <span className="text-xs font-black text-orange-600">+{Math.floor((parseInt(amount) || 0) * 0.1)} PTS</span>
                      </div>
                    )}
                    {mode === 'duel' && battleParty.length > 1 && (
                      <div className="flex items-center justify-between p-4 bg-primary/5 rounded-2xl border border-primary/10">
                        <span className="text-[10px] font-black uppercase opacity-60">Coût Total (Mise x {battleParty.length})</span>
                        <span className="text-xs font-black">{(parseInt(amount) || 0) * battleParty.length} PTS</span>
                      </div>
                    )}
                  </div>
                </div>

                <Button onClick={handleAction} disabled={isProcessing || !amount || parseInt(amount) <= 0} className="w-full h-16 rounded-2xl font-black text-sm uppercase gap-3 shadow-xl shadow-primary/20">
                  {isProcessing ? <Loader2 className="h-5 w-5 animate-spin" /> : mode === 'transfer' ? "Transmettre" : "Lancer le Choc"}
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
