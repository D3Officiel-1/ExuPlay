"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { useFirestore, useCollection, useUser } from "@/firebase";
import { collection, query, orderBy, limit } from "firebase/firestore";
import { Card, CardContent } from "@/components/ui/card";
import { Trophy, Loader2, Zap, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { ProfileAvatar } from "@/components/ProfileAvatar";
import { getHonorTitle } from "@/lib/titles";

export default function ClassementPage() {
  const db = useFirestore();
  const { user } = useUser();

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
                className="flex flex-col items-center gap-3"
              >
                <div className="relative">
                  <ProfileAvatar imageUrl={podium[1].profileImage} points={podium[1].totalPoints} size="md" />
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
                className="flex flex-col items-center gap-4 -mt-8"
              >
                <div className="relative">
                  <motion.div 
                    animate={{ rotate: 360 }}
                    transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-[-12px] border-2 border-dashed border-yellow-500/20 rounded-full"
                  />
                  <ProfileAvatar imageUrl={podium[0].profileImage} points={podium[0].totalPoints} size="lg" className="z-10" />
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
                className="flex flex-col items-center gap-3"
              >
                <div className="relative">
                  <ProfileAvatar imageUrl={podium[2].profileImage} points={podium[2].totalPoints} size="md" />
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
              <motion.div key={u.id} variants={itemVariants}>
                <Card className={cn(
                  "border-none backdrop-blur-3xl transition-all duration-500 overflow-hidden rounded-[2rem]",
                  isMe ? "bg-primary text-primary-foreground shadow-2xl scale-[1.02]" : "bg-card/40 shadow-lg"
                )}>
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="flex flex-col items-center justify-center w-10 shrink-0">
                      <span className={cn("text-xs font-black opacity-30", isMe && "opacity-60")}>#{rank}</span>
                    </div>

                    <ProfileAvatar imageUrl={u.profileImage} points={u.totalPoints} size="sm" className="shrink-0" />

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
    </div>
  );
}
