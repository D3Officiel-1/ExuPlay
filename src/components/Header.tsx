
"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { Logo } from "@/components/Logo";
import { cn } from "@/lib/utils";
import { Trophy } from "lucide-react";
import { useUser, useFirestore, useDoc } from "@/firebase";
import { doc } from "firebase/firestore";

export function Header() {
  const { user } = useUser();
  const db = useFirestore();

  const userDocRef = useMemo(() => {
    if (!db || !user?.uid) return null;
    return doc(db, "users", user.uid);
  }, [db, user?.uid]);

  const { data: profile } = useDoc(userDocRef);
  const totalPoints = profile?.totalPoints || 0;

  return (
    <motion.header 
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ 
        duration: 1.2, 
        ease: [0.22, 1, 0.36, 1],
        delay: 0.2
      }}
      className={cn(
        "fixed top-0 left-0 right-0 z-50 h-20 sm:h-24",
        "flex items-center px-6 sm:px-12",
        "bg-background/10 backdrop-blur-2xl border-b border-primary/5",
        "after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[1px] after:bg-gradient-to-r after:from-transparent after:via-primary/20 after:to-transparent"
      )}
    >
      <div className="max-w-screen-2xl mx-auto w-full flex items-center justify-between">
        <motion.div
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.8, ease: "easeOut" }}
          className="relative"
        >
          <div className="absolute -inset-4 bg-primary/5 blur-3xl rounded-full opacity-50 pointer-events-none" />
          <Logo layout="horizontal" className="relative z-10" />
        </motion.div>

        {/* Mini carte des points */}
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 1.5, delay: 1, ease: [0.22, 1, 0.36, 1] }}
          className="flex items-center"
        >
          <div className="flex items-center gap-3 px-5 py-2.5 bg-card/50 backdrop-blur-3xl rounded-2xl border border-primary/10 shadow-xl shadow-primary/5 group hover:border-primary/20 transition-all duration-500">
            <div className="relative">
              <Trophy className="h-4 w-4 text-primary group-hover:scale-110 transition-transform duration-500" />
              <motion.div 
                animate={{ opacity: [0, 1, 0], scale: [1, 1.5, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute inset-0 bg-primary/20 rounded-full blur-md"
              />
            </div>
            <div className="flex flex-col items-start leading-none gap-1">
              <span className="text-[10px] font-black tracking-[0.3em] uppercase opacity-40">Score Total</span>
              <span className="text-sm font-black tracking-tight">{totalPoints.toLocaleString()} PTS</span>
            </div>
          </div>
        </motion.div>
      </div>

      <motion.div
        animate={{
          x: ["-100%", "200%"],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "linear",
          repeatDelay: 5
        }}
        className="absolute bottom-0 left-0 w-40 h-[1px] bg-gradient-to-r from-transparent via-primary/40 to-transparent z-10"
      />
    </motion.header>
  );
}
