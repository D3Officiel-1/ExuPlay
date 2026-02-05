
"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { useFirestore, useCollection, useUser } from "@/firebase";
import { collection, query, orderBy, limit } from "firebase/firestore";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { Card, CardContent } from "@/components/ui/card";
import { Trophy, Medal, Star, User as UserIcon, Loader2, Zap } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * @fileOverview Le Hall des Sages. Un classement dynamique des esprits les plus éveillés.
 */

export default function ClassementPage() {
  const db = useFirestore();
  const { user } = useUser();

  const topUsersQuery = useMemo(() => {
    if (!db) return null;
    return query(collection(db, "users"), orderBy("totalPoints", "desc"), limit(50));
  }, [db]);

  const { data: topUsers, loading } = useCollection(topUsersQuery);

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
      <Header />
      
      <main className="flex-1 p-6 pt-24 space-y-8 max-w-lg mx-auto w-full">
        <div className="space-y-1">
          <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40">Hiérarchie</p>
          <h1 className="text-3xl font-black tracking-tight">Le Hall des Sages</h1>
        </div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-4"
        >
          {topUsers?.map((u, idx) => {
            const isMe = u.id === user?.uid;
            const rank = idx + 1;
            const isTop3 = rank <= 3;

            return (
              <motion.div key={u.id} variants={itemVariants}>
                <Card className={cn(
                  "border-none backdrop-blur-3xl transition-all duration-500 overflow-hidden rounded-[2rem]",
                  isMe ? "bg-primary text-primary-foreground shadow-2xl scale-[1.02]" : "bg-card/40 shadow-lg",
                  isTop3 && !isMe ? "border border-primary/10" : ""
                )}>
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="flex flex-col items-center justify-center w-10 shrink-0">
                      {rank === 1 ? (
                        <Trophy className="h-6 w-6 text-yellow-500" />
                      ) : rank === 2 ? (
                        <Medal className="h-6 w-6 text-gray-400" />
                      ) : rank === 3 ? (
                        <Medal className="h-6 w-6 text-orange-400" />
                      ) : (
                        <span className={cn("text-xs font-black opacity-30", isMe && "opacity-60")}>#{rank}</span>
                      )}
                    </div>

                    <div className="relative h-12 w-12 rounded-2xl overflow-hidden bg-background/10 border border-white/5 shrink-0">
                      {u.profileImage ? (
                        <Image src={u.profileImage} alt={u.username} fill className="object-cover" />
                      ) : (
                        <UserIcon className={cn("h-6 w-6 m-auto absolute inset-0 opacity-20", isMe && "opacity-60")} />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="font-black text-sm truncate uppercase tracking-tight">
                        @{u.username} {isMe && <span className="ml-1 text-[8px] opacity-60">(MOI)</span>}
                      </p>
                      <div className="flex items-center gap-1.5">
                        <Zap className={cn("h-3 w-3 text-primary", isMe ? "text-primary-foreground" : "opacity-40")} />
                        <p className={cn("text-[10px] font-bold uppercase tracking-widest opacity-40", isMe && "opacity-80")}>
                          {u.totalPoints?.toLocaleString()} PTS
                        </p>
                      </div>
                    </div>

                    {isTop3 && (
                      <div className="pr-2">
                        <Star className={cn("h-4 w-4 fill-current", rank === 1 ? "text-yellow-500" : rank === 2 ? "text-gray-400" : "text-orange-400")} />
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </motion.div>
      </main>

      <BottomNav />
    </div>
  );
}
