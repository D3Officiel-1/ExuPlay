
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
  AlertCircle
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
    return {
      podium: allUsers.slice(0, 3),
      rest: allUsers.slice(3)
    };
  }, [allUsers]);

  const handleUserClick = (u: any) => {
    if (u.id === user?.uid) {
      haptic.medium();
      toast({ title: "C'est vous !", description: "Explorez votre propre profil pour voir vos statistiques." });
      return;
    }
    haptic.light();
    setSelectedUser(u);
    setAmount("");
    setMode('transfer');
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

  const handleAction = async () => {
    if (!selectedUser || !amount || isProcessing || !user?.uid || !db) return;
    
    const transferAmount = parseInt(amount);
    if (isNaN(transferAmount) || transferAmount <= 0) {
      toast({ variant: "destructive", title: "Montant invalide" });
      return;
    }

    const fees = mode === 'transfer' ? Math.floor(transferAmount * 0.1) : 0;
    const totalCost = transferAmount + fees;
    const dailyLimit = myProfile?.trustBadge ? 2500 : 500;

    if (transferAmount > dailyLimit) {
      haptic.error();
      toast({ variant: "destructive", title: "Limite dépassée", description: `Votre limite est de ${dailyLimit} PTS.` });
      return;
    }

    if ((myProfile?.totalPoints || 0) < totalCost) {
      haptic.error();
      toast({ variant: "destructive", title: "Lumière insuffisante", description: `Il vous faut ${totalCost} PTS pour cette action.` });
      return;
    }

    setIsProcessing(true);
    haptic.medium();

    try {
      const senderRef = doc(db, "users", user.uid);
      const receiverRef = doc(db, "users", selectedUser.id);

      if (mode === 'transfer') {
        await updateDoc(senderRef, { totalPoints: increment(-totalCost), updatedAt: serverTimestamp() });
        await updateDoc(receiverRef, { totalPoints: increment(transferAmount), updatedAt: serverTimestamp() });
        await addDoc(collection(db, "transfers"), {
          fromId: user.uid,
          fromName: myProfile?.username || "Anonyme",
          fromPhoto: myProfile?.profileImage || "",
          toId: selectedUser.id,
          amount: transferAmount,
          timestamp: new Date().toISOString(),
          read: false
        });
        haptic.success();
        toast({ title: "Transmission réussie", description: `${transferAmount} PTS envoyés à @${selectedUser.username}` });
      } else {
        await updateDoc(senderRef, { totalPoints: increment(-transferAmount), updatedAt: serverTimestamp() });
        await addDoc(collection(db, "duels"), {
          challengerId: user.uid,
          challengerName: myProfile?.username || "Anonyme",
          challengerPhoto: myProfile?.profileImage || "",
          opponentId: selectedUser.id,
          opponentName: selectedUser.username || "Adversaire",
          opponentPhoto: selectedUser.profileImage || "",
          wager: transferAmount,
          status: 'pending',
          createdAt: serverTimestamp(),
          round: 1
        });
        haptic.success();
        toast({ title: "Défi lancé !", description: `Attente de la réponse de @${selectedUser.username}` });
      }
      setSelectedUser(null);
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "Dissonance", description: "Le flux a été interrompu." });
    } finally {
      setIsProcessing(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.05 }
    }
  };

  const itemVariants = {
    hidden: { x: -20, opacity: 0 },
    visible: { x: 0, opacity: 1 }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <Loader2 className="h-10 w-10 animate-spin opacity-20 mb-4" />
        <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40">Consultation de l'Oracle</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col pb-32">
      <main className="flex-1 p-6 pt-24 space-y-10 max-w-lg mx-auto w-full">
        <div className="space-y-1">
          <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40">Hiérarchie</p>
          <h1 className="text-3xl font-black tracking-tight">Le Hall des Sages</h1>
        </div>

        {/* Podium Section */}
        {podium.length > 0 && (
          <div className="grid grid-cols-3 items-end gap-2 px-2 pt-8 pb-4 relative">
            <div className="absolute inset-0 bg-primary/5 blur-[100px] rounded-full -z-10" />
            
            {/* 2nd Place */}
            {podium[1] && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="flex flex-col items-center gap-3 cursor-pointer select-none"
                onClick={() => handleUserClick(podium[1])}
                onContextMenu={(e) => handleContextMenu(e, podium[1])}
                onPointerDown={() => handleLongPressStart(podium[1])}
                onPointerUp={handleLongPressEnd}
                onPointerLeave={handleLongPressEnd}
              >
                <div className="relative">
                  <ProfileAvatar imageUrl={podium[1].profileImage} points={podium[1].totalPoints} activeTheme={podium[1].activeTheme} size="md" />
                  <div className="absolute -top-3 -right-2 bg-gray-400 text-white h-6 w-6 rounded-full flex items-center justify-center border-2 border-background shadow-lg">
                    <span className="text-[10px] font-black">2</span>
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-[9px] font-black uppercase truncate w-24">@{podium[1].username}</p>
                  <p className="text-[10px] font-bold opacity-40">{podium[1].totalPoints} PTS</p>
                </div>
              </motion.div>
            )}

            {/* 1st Place */}
            {podium[0] && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: "spring", damping: 12 }}
                className="flex flex-col items-center gap-4 -mt-8 cursor-pointer select-none"
                onClick={() => handleUserClick(podium[0])}
                onContextMenu={(e) => handleContextMenu(e, podium[0])}
                onPointerDown={() => handleLongPressStart(podium[0])}
                onPointerUp={handleLongPressEnd}
                onPointerLeave={handleLongPressEnd}
              >
                <div className="relative">
                  <ProfileAvatar imageUrl={podium[0].profileImage} points={podium[0].totalPoints} activeTheme={podium[0].activeTheme} size="lg" className="z-10" />
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-yellow-500 text-black h-8 w-8 rounded-full flex items-center justify-center border-4 border-background shadow-xl z-20">
                    <Trophy className="h-4 w-4" />
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-xs font-black uppercase tracking-tight">@{podium[0].username}</p>
                  <div className="flex items-center justify-center gap-1">
                    <Zap className="h-3 w-3 text-yellow-500 fill-current" />
                    <p className="text-sm font-black text-yellow-600">{podium[0].totalPoints} PTS</p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* 3rd Place */}
            {podium[2] && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="flex flex-col items-center gap-3 cursor-pointer select-none"
                onClick={() => handleUserClick(podium[2])}
                onContextMenu={(e) => handleContextMenu(e, podium[2])}
                onPointerDown={() => handleLongPressStart(podium[2])}
                onPointerUp={handleLongPressEnd}
                onPointerLeave={handleLongPressEnd}
              >
                <div className="relative">
                  <ProfileAvatar imageUrl={podium[2].profileImage} points={podium[2].totalPoints} activeTheme={podium[2].activeTheme} size="md" />
                  <div className="absolute -top-3 -left-2 bg-orange-400 text-white h-6 w-6 rounded-full flex items-center justify-center border-2 border-background shadow-lg">
                    <span className="text-[10px] font-black">3</span>
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-[9px] font-black uppercase truncate w-24">@{podium[2].username}</p>
                  <p className="text-[10px] font-bold opacity-40">{podium[2].totalPoints} PTS</p>
                </div>
              </motion.div>
            )}
          </div>
        )}

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-4"
        >
          {rest.map((u, idx) => {
            const isMe = u.id === user?.uid;
            const rank = idx + 4;
            const title = getHonorTitle(u.totalPoints || 0);

            return (
              <motion.div 
                key={u.id} 
                variants={itemVariants} 
                onClick={() => handleUserClick(u)}
                onContextMenu={(e) => handleContextMenu(e, u)}
                onPointerDown={() => handleLongPressStart(u)}
                onPointerUp={handleLongPressEnd}
                onPointerLeave={handleLongPressEnd}
                className="select-none"
              >
                <Card className={cn(
                  "border-none backdrop-blur-3xl transition-all duration-500 overflow-hidden rounded-[2rem] cursor-pointer",
                  isMe ? "bg-primary text-primary-foreground shadow-2xl scale-[1.02]" : "bg-card/40 shadow-lg hover:bg-card/60"
                )}>
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="flex flex-col items-center justify-center w-10 shrink-0">
                      <span className={cn("text-xs font-black opacity-30", isMe && "opacity-60")}>#{rank}</span>
                    </div>

                    <ProfileAvatar imageUrl={u.profileImage} points={u.totalPoints} activeTheme={u.activeTheme} size="sm" className="shrink-0" />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-black text-sm truncate uppercase tracking-tight">
                          @{u.username}
                        </p>
                        <Shield className={cn("h-2.5 w-2.5", isMe ? "text-primary-foreground/60" : title.color)} />
                        <span className={cn("text-[7px] font-black uppercase tracking-widest", isMe ? "text-primary-foreground/40" : "opacity-30")}>
                          {title.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Zap className={cn("h-3 w-3 text-primary", isMe ? "text-primary-foreground" : "opacity-40")} />
                        <p className={cn("text-[10px] font-bold uppercase tracking-widest opacity-40", isMe && "opacity-80")}>
                          {u.totalPoints?.toLocaleString()} PTS
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </motion.div>
      </main>

      {/* Vision Dialog (Oracle de la Vision Profonde) */}
      <Dialog open={!!selectedUserForVision} onOpenChange={(open) => !open && setSelectedUserForVision(null)}>
        <DialogContent className="max-w-[90vw] sm:max-w-md bg-transparent border-none p-0 overflow-hidden shadow-none ring-0 focus:outline-none [&>button]:hidden">
          {selectedUserForVision && (
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, filter: "blur(20px)" }}
              animate={{ scale: 1, opacity: 1, filter: "blur(0px)" }}
              exit={{ scale: 0.9, opacity: 0, filter: "blur(20px)" }}
              className="relative w-full aspect-[4/5] bg-card/40 backdrop-blur-3xl rounded-[3rem] border border-white/10 shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="relative flex-1 w-full overflow-hidden">
                {selectedUserForVision.profileImage ? (
                  <img 
                    src={selectedUserForVision.profileImage} 
                    alt="" 
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-primary/5">
                    <UserIcon className="h-32 w-32 text-primary opacity-10" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
              </div>

              <div className="p-10 space-y-8 relative z-10 bg-background/60 backdrop-blur-3xl border-t border-white/5">
                <div className="text-center space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-[0.5em] opacity-40">Oracle de la Vision</p>
                  <h2 className="text-4xl font-black italic tracking-tighter uppercase">@{selectedUserForVision.username}</h2>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-5 bg-primary/5 rounded-[2rem] border border-primary/5 text-center space-y-1">
                    <p className="text-[9px] font-black uppercase tracking-widest opacity-40">Lumière accumulée</p>
                    <p className="font-black text-lg">{selectedUserForVision.totalPoints?.toLocaleString()} <span className="text-[10px] opacity-30">PTS</span></p>
                  </div>
                  <div className="p-5 bg-primary/5 rounded-[2rem] border border-primary/5 text-center space-y-1">
                    <p className="text-[9px] font-black uppercase tracking-widest opacity-40">Valeur Terrestre</p>
                    <p className="font-black text-lg text-primary">{(selectedUserForVision.totalPoints * 0.5).toLocaleString()} <span className="text-[10px] opacity-30">FCFA</span></p>
                  </div>
                </div>

                <Button 
                  onClick={() => setSelectedUserForVision(null)}
                  className="w-full h-16 rounded-[2rem] font-black text-xs uppercase tracking-[0.3em] shadow-2xl shadow-primary/20"
                >
                  Fermer la Vision
                </Button>
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
                <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Résonance Inter-Esprits</p>
                <DialogTitle className="text-2xl font-black tracking-tight">Action de Flux</DialogTitle>
              </div>
            </DialogHeader>

            {selectedUser && (
              <div className="space-y-8">
                <div className="flex items-center gap-4 p-6 bg-primary/5 rounded-[2rem] border border-primary/5">
                  <ProfileAvatar imageUrl={selectedUser.profileImage} points={selectedUser.totalPoints} size="md" />
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-lg truncate">@{selectedUser.username}</p>
                    <div className="flex items-center gap-1.5">
                      <Shield className={cn("h-3 w-3", getHonorTitle(selectedUser.totalPoints || 0).color)} />
                      <p className={cn("text-[10px] font-black uppercase tracking-widest", getHonorTitle(selectedUser.totalPoints || 0).color)}>
                        {getHonorTitle(selectedUser.totalPoints || 0).name}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="flex gap-2 p-1 bg-primary/5 rounded-2xl border border-primary/5">
                    <Button 
                      variant={mode === 'transfer' ? 'default' : 'ghost'} 
                      onClick={() => setMode('transfer')}
                      className="flex-1 h-12 rounded-xl text-[10px] font-black uppercase tracking-widest gap-2"
                    >
                      <ArrowRightLeft className="h-3.5 w-3.5" />
                      Transfert
                    </Button>
                    <Button 
                      variant={mode === 'duel' ? 'default' : 'ghost'} 
                      onClick={() => setMode('duel')}
                      className="flex-1 h-12 rounded-xl text-[10px] font-black uppercase tracking-widest gap-2"
                    >
                      <Swords className="h-3.5 w-3.5" />
                      Duel
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase opacity-40 ml-2">Montant de Lumière</Label>
                    <div className="relative">
                      <Zap className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-primary opacity-20" />
                      <Input 
                        type="number" 
                        placeholder="0" 
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="h-16 text-3xl font-black text-center pl-12 rounded-2xl bg-primary/5 border-none focus-visible:ring-1 focus-visible:ring-primary/20"
                        autoFocus
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    {mode === 'transfer' && (
                      <div className="flex items-center justify-between p-4 bg-orange-500/5 rounded-2xl border border-orange-500/10">
                        <div className="flex items-center gap-2">
                          <AlertCircle className="h-3 w-3 text-orange-500 opacity-60" />
                          <span className="text-[10px] font-black uppercase tracking-widest text-orange-600/60">Taxe de passage (10%)</span>
                        </div>
                        <span className="text-xs font-black text-orange-600">+{Math.floor((parseInt(amount) || 0) * 0.1)} PTS</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between px-2">
                      <p className="text-[10px] font-black uppercase opacity-40">Votre Lumière</p>
                      <p className="text-xs font-black">{myProfile?.totalPoints?.toLocaleString()} PTS</p>
                    </div>
                  </div>
                </div>

                <Button 
                  onClick={handleAction}
                  disabled={isProcessing || !amount || parseInt(amount) <= 0}
                  className="w-full h-16 rounded-2xl font-black text-sm uppercase tracking-widest gap-3 shadow-xl shadow-primary/20"
                >
                  {isProcessing ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      {mode === 'transfer' ? <ArrowRightLeft className="h-5 w-5" /> : <Swords className="h-5 w-5" />}
                      {mode === 'transfer' ? "Transmettre la Lumière" : "Lancer le Défi"}
                    </>
                  )}
                </Button>
              </div>
            )}

            <div className="p-6 bg-primary/5 rounded-[2rem] border border-primary/5">
              <p className="text-[10px] leading-relaxed font-medium opacity-40 text-center italic">
                "Chaque interaction entre esprits renforce le flux du Sanctuaire."
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
