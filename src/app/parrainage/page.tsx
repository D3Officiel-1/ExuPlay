
"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { useUser, useFirestore, useDoc, useCollection } from "@/firebase";
import { collection, query, where, orderBy, doc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { 
  ChevronLeft, 
  Users, 
  User as UserIcon,
  Calendar,
  Sparkles,
  Loader2,
  CheckCircle2,
  Zap,
  Target,
  TrendingUp,
  ShieldCheck
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import Image from "next/image";

export default function ParrainagePage() {
  const { user } = useUser();
  const db = useFirestore();
  const router = useRouter();

  const userDocRef = useMemo(() => {
    if (!db || !user?.uid) return null;
    return doc(db, "users", user.uid);
  }, [db, user?.uid]);

  const { data: profile, loading: profileLoading } = useDoc(userDocRef);

  const referredUsersQuery = useMemo(() => {
    if (!db || !profile?.referralCode) return null;
    return query(
      collection(db, "users"),
      where("referredBy", "==", profile.referralCode),
      orderBy("createdAt", "desc")
    );
  }, [db, profile?.referralCode]);

  const { data: referredUsers, loading: usersLoading } = useCollection(referredUsersQuery);

  const stats = useMemo(() => {
    if (!referredUsers) return { awakened: 0, pending: 0, latentPoints: 0, totalEarned: 0 };
    const awakened = referredUsers.filter(u => (u.totalPoints || 0) >= 100).length;
    const pending = referredUsers.length - awakened;
    return {
      awakened,
      pending,
      latentPoints: pending * 100,
      totalEarned: awakened * 100
    };
  }, [referredUsers]);

  if (profileLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin opacity-20" />
      </div>
    );
  }

  const isLoading = profile?.referralCode && usersLoading;
  const trustProgress = Math.min((stats.awakened / 10) * 100, 100);

  return (
    <div className="min-h-screen bg-background flex flex-col pb-32">
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
            <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40">Expansion</p>
            <h1 className="text-3xl font-black tracking-tight">Esprits Liés</h1>
          </div>
        </div>

        {/* trust seal progress section */}
        <Card className="border-none bg-primary text-primary-foreground shadow-2xl rounded-[2.5rem] overflow-hidden relative">
          <div className="absolute top-0 right-0 p-6 opacity-10"><ShieldCheck className="h-20 w-20" /></div>
          <CardContent className="p-8 space-y-6 relative z-10">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 bg-primary-foreground/10 rounded-2xl flex items-center justify-center shadow-inner">
                <ShieldCheck className={cn("h-6 w-6", stats.awakened >= 10 ? "text-green-400" : "opacity-40")} />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-black tracking-tight">Sceau de Confiance</h3>
                <p className="text-[10px] font-bold uppercase tracking-widest opacity-60">
                  {stats.awakened >= 10 ? "Authentifié & Certifié" : "En cours d'harmonisation"}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-end px-1">
                <p className="text-[9px] font-black uppercase tracking-[0.2em] opacity-40">Progression</p>
                <p className="text-xs font-black">{stats.awakened}/10 <span className="opacity-40 text-[10px]">ÉVEILLÉS</span></p>
              </div>
              <div className="h-2 bg-primary-foreground/10 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${trustProgress}%` }}
                  transition={{ duration: 1.5, ease: "easeOut" }}
                  className="h-full bg-primary-foreground shadow-[0_0_15px_rgba(255,255,255,0.5)]"
                />
              </div>
              <p className="text-[10px] font-medium leading-relaxed opacity-60 italic text-center">
                {stats.awakened >= 10 
                  ? "Vous êtes un pilier de confiance du Sanctuaire." 
                  : `Éveillez encore ${10 - stats.awakened} esprits pour augmenter votre flux quotidien.`}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Expansion Summary Dashboard */}
        {!isLoading && referredUsers && referredUsers.length > 0 && (
          <Card className="border-none bg-card/40 backdrop-blur-3xl shadow-xl rounded-[2.5rem] overflow-hidden border border-primary/5">
            <CardContent className="p-8 space-y-8">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Lumière Récoltée</p>
                  <p className="text-4xl font-black tabular-nums">+{stats.totalEarned}</p>
                </div>
                <div className="h-14 w-14 bg-primary/5 rounded-[1.5rem] flex items-center justify-center relative">
                  <TrendingUp className="h-6 w-6 text-primary" />
                  <motion.div animate={{ opacity: [0, 1, 0] }} transition={{ duration: 2, repeat: Infinity }} className="absolute -top-1 -right-1 h-3 w-3 bg-green-500 rounded-full border-2 border-background" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-primary/5 rounded-2xl border border-primary/5 space-y-1">
                  <div className="flex items-center gap-2 opacity-40">
                    <CheckCircle2 className="h-3 w-3" />
                    <span className="text-[9px] font-black uppercase tracking-widest">Éveillés</span>
                  </div>
                  <p className="text-xl font-black">{stats.awakened}</p>
                </div>
                <div className="p-4 bg-primary/5 rounded-2xl border border-primary/5 space-y-1">
                  <div className="flex items-center gap-2 opacity-40">
                    <Target className="h-3 w-3" />
                    <span className="text-[9px] font-black uppercase tracking-widest">Latente</span>
                  </div>
                  <p className="text-xl font-black text-primary/40">+{stats.latentPoints}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="space-y-4">
          {isLoading ? (
            <div className="flex justify-center p-12">
              <Loader2 className="h-6 w-6 animate-spin opacity-20" />
            </div>
          ) : referredUsers && referredUsers.length > 0 ? (
            <>
              <p className="text-[10px] font-black uppercase tracking-widest opacity-40 px-2">Flux des Adeptes</p>
              <div className="space-y-4">
                {referredUsers.map((u, idx) => {
                  const points = u.totalPoints || 0;
                  const progress = Math.min((points / 100) * 100, 100);
                  const isAwakened = points >= 100;

                  return (
                    <motion.div
                      key={u.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                    >
                      <Card className={cn(
                        "border-none bg-card/40 backdrop-blur-3xl shadow-lg rounded-[2rem] overflow-hidden transition-all",
                        isAwakened && "border border-primary/5"
                      )}>
                        <CardContent className="p-6 space-y-4">
                          <div className="flex items-center gap-4">
                            <div className="h-12 w-12 bg-primary/5 rounded-2xl flex items-center justify-center shrink-0 overflow-hidden relative">
                              {u.profileImage ? (
                                <Image src={u.profileImage} alt="" fill className="object-cover" />
                              ) : (
                                <UserIcon className="h-6 w-6 text-primary opacity-40" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-black text-base truncate">@{u.username}</p>
                              <div className="flex items-center gap-1.5 opacity-40">
                                <Calendar className="h-3 w-3" />
                                <p className="text-[9px] font-black uppercase tracking-wider">
                                  Inscrit en {u.createdAt && typeof u.createdAt.toDate === 'function' ? format(u.createdAt.toDate(), "MMMM yyyy", { locale: fr }) : "inconnu"}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              {isAwakened ? (
                                <div className="flex flex-col items-end gap-1">
                                  <div className="h-8 w-8 bg-green-500/10 rounded-full flex items-center justify-center">
                                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                                  </div>
                                </div>
                              ) : (
                                <div className="flex flex-col items-end">
                                  <p className="text-xs font-black">{points}/100</p>
                                  <p className="text-[8px] font-bold opacity-30 uppercase">En éveil</p>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Progress value={progress} className="h-1.5 bg-primary/5" />
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="text-center py-20 space-y-6 opacity-20">
              <Users className="h-16 w-16 mx-auto" />
              <div className="space-y-2">
                <p className="text-sm font-black uppercase tracking-[0.2em]">Aucun esprit lié</p>
                <p className="text-xs font-medium px-10 leading-relaxed">
                  Votre cercle d'influence est encore vierge. Partagez votre lien magique pour éveiller de nouveaux esprits.
                </p>
              </div>
              <Button 
                variant="ghost" 
                onClick={() => router.push("/profil")}
                className="text-[10px] font-black uppercase tracking-widest"
              >
                Copier mon lien
              </Button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
