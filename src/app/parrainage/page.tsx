
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
  CheckCircle2
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

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

  if (profileLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin opacity-20" />
      </div>
    );
  }

  const isLoading = profile?.referralCode && usersLoading;

  // Calculer le total des récompenses réelles basées sur le seuil d'éveil de 100 pts
  const totalRewards = referredUsers?.filter(u => (u.totalPoints || 0) >= 100).length || 0;

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

        <div className="space-y-4">
          {isLoading ? (
            <div className="flex justify-center p-12">
              <Loader2 className="h-6 w-6 animate-spin opacity-20" />
            </div>
          ) : referredUsers && referredUsers.length > 0 ? (
            <>
              <div className="px-2 flex items-center justify-between">
                <p className="text-[10px] font-black uppercase tracking-widest opacity-40">
                  {referredUsers.length} FILLEUL{referredUsers.length > 1 ? 'S' : ''}
                </p>
                <div className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-primary">
                  <Sparkles className="h-3 w-3" />
                  <span>+{totalRewards * 100} PTS RÉCOLTÉS</span>
                </div>
              </div>
              
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
                      <Card className={`border-none bg-card/40 backdrop-blur-3xl shadow-lg rounded-[2rem] overflow-hidden transition-all ${isAwakened ? 'border border-primary/5' : ''}`}>
                        <CardContent className="p-6 space-y-4">
                          <div className="flex items-center gap-4">
                            <div className="h-12 w-12 bg-primary/5 rounded-2xl flex items-center justify-center shrink-0">
                              <UserIcon className="h-6 w-6 text-primary opacity-40" />
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
                                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                                  <p className="text-[10px] font-black text-green-600 uppercase tracking-tighter">+100 PTS</p>
                                </div>
                              ) : (
                                <p className="text-[10px] font-black opacity-30 uppercase tracking-tighter">{points}/100</p>
                              )}
                            </div>
                          </div>

                          <div className="space-y-2">
                            <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest opacity-30">
                              <span>Chemin vers l'éveil</span>
                              <span>{Math.round(progress)}%</span>
                            </div>
                            <Progress value={progress} className="h-1.5 bg-primary/5" />
                          </div>

                          {!isAwakened && (
                            <p className="text-[8px] font-bold text-center opacity-20 uppercase tracking-[0.2em]">
                              Récompense de 100 PTS à l'éveil complet
                            </p>
                          )}
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
