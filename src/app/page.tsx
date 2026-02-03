
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Logo } from "@/components/Logo";
import { useUser, useFirestore } from "@/firebase";
import { doc, getDoc } from "firebase/firestore";

export default function SplashPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useUser();
  const db = useFirestore();
  const [splashDone, setSplashDone] = useState(false);

  useEffect(() => {
    const splashTimer = setTimeout(() => {
      setSplashDone(true);
    }, 3500); // Augmenté pour laisser l'animation respirer
    return () => clearTimeout(splashTimer);
  }, []);

  useEffect(() => {
    const checkRedirect = async () => {
      if (authLoading || !splashDone) return;

      if (!user) {
        router.push("/login");
        return;
      }

      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        const userData = userDoc.data();

        const isFullyAuthorized = 
          userData?.cameraAuthorized === true && 
          userData?.notificationsEnabled === true && 
          userData?.locationAuthorized === true;

        const nextPath = isFullyAuthorized ? "/random" : "/autoriser";
        router.push(nextPath);
      } catch (error) {
        console.error("Error checking permissions:", error);
        router.push("/login");
      }
    };

    checkRedirect();
  }, [authLoading, user, router, db, splashDone]);

  // Variantes pour les lignes de vent
  const windLineVariants = {
    animate: (i: number) => ({
      x: ["-100%", "200%"],
      opacity: [0, 0.3, 0],
      transition: {
        duration: 2 + i,
        repeat: Infinity,
        ease: "linear",
        delay: i * 0.5,
      },
    }),
  };

  return (
    <div className="relative min-h-screen w-full flex flex-col items-center justify-center overflow-hidden bg-background">
      {/* Arrière-plan cinématique */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Lignes de vent abstraites */}
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            custom={i}
            variants={windLineVariants}
            animate="animate"
            className="absolute h-[1px] bg-primary/20"
            style={{
              top: `${20 + i * 12}%`,
              left: 0,
              width: "40%",
              filter: "blur(1px)",
            }}
          />
        ))}
        
        {/* Glows d'ambiance */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.08, 0.04] }}
          transition={{ duration: 4, times: [0, 0.5, 1], ease: "easeInOut" }}
          className="absolute inset-0"
        >
          <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] rounded-full bg-primary/10 blur-[120px]" />
          <div className="absolute bottom-[-20%] right-[-10%] w-[70%] h-[70%] rounded-full bg-primary/10 blur-[120px]" />
        </motion.div>
      </div>

      <div className="z-10 flex flex-col items-center px-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 20, filter: "blur(10px)" }}
          animate={{ opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1] }}
        >
          <motion.div 
            animate={{ 
              y: [0, -8, 0],
              rotate: [0, -1, 1, 0]
            }} 
            transition={{ 
              duration: 5, 
              repeat: Infinity, 
              ease: "easeInOut" 
            }}
          >
            <Logo className="scale-150 md:scale-[2.5]" />
          </motion.div>
        </motion.div>

        {/* Texte avec animation de tracking */}
        <div className="mt-12 text-center overflow-hidden">
          <motion.p
            initial={{ opacity: 0, letterSpacing: "0.2em" }}
            animate={{ opacity: 0.4, letterSpacing: "0.5em" }}
            transition={{ delay: 0.8, duration: 2, ease: "easeOut" }}
            className="text-[10px] font-black uppercase tracking-[0.5em] text-foreground"
          >
            L'éveil par le voyage intérieur
          </motion.p>
        </div>

        {/* Barre de progression stylisée */}
        <motion.div 
          className="mt-16 w-40 h-[2px] bg-primary/5 relative overflow-hidden rounded-full"
          initial={{ opacity: 0, width: 0 }}
          animate={{ opacity: 1, width: 160 }}
          transition={{ delay: 1.2, duration: 1 }}
        >
          <motion.div 
            className="absolute inset-0 bg-primary"
            initial={{ x: "-100%" }}
            animate={{ x: "0%" }}
            transition={{ 
              duration: 3, 
              ease: [0.445, 0.05, 0.55, 0.95], 
              delay: 0.5 
            }}
          />
        </motion.div>
      </div>

      {/* Footer minimaliste */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.5, duration: 1 }}
        className="absolute bottom-10 text-[8px] font-bold uppercase tracking-[0.3em] opacity-20"
      >
        Version 2.0 • Exu Play Global
      </motion.div>
    </div>
  );
}
