"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Logo } from "@/components/Logo";
import { useUser, useFirestore } from "@/firebase";
import { doc, getDoc } from "firebase/firestore";

/**
 * @fileOverview Page de démarrage (Splash Screen) avec redirection intelligente.
 * Reconstruction purifiée pour dissiper les erreurs de chunk.
 */

export default function SplashPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useUser();
  const db = useFirestore();
  const [isMinDisplayTimeOver, setIsMinDisplayTimeOver] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsMinDisplayTimeOver(true);
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (isMinDisplayTimeOver && !authLoading && !isNavigating) {
      const performNavigation = async () => {
        setIsNavigating(true);
        
        if (!user) {
          router.push("/login");
          return;
        }

        try {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          
          if (!userDoc.exists()) {
            router.push("/login");
            return;
          }

          const userData = userDoc.data();
          const isFullyAuthorized = userData?.cameraAuthorized === true;

          const nextPath = isFullyAuthorized ? "/home" : "/autoriser";
          router.push(nextPath);
        } catch (error) {
          console.error("Dissonance lors de la redirection:", error);
          router.push("/login");
        }
      };

      performNavigation();
    }
  }, [isMinDisplayTimeOver, authLoading, user, db, router, isNavigating]);

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
      <AnimatePresence>
        {!isNavigating && (
          <motion.div
            key="splash-content"
            initial={{ opacity: 1 }}
            exit={{ 
              opacity: 0, 
              y: -40, 
              scale: 1.05,
              filter: "blur(20px)",
              transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] } 
            }}
            className="flex flex-col items-center justify-center w-full h-full"
          >
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
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

              <motion.div 
                className="mt-16 w-40 h-[2px] bg-primary/5 relative overflow-hidden rounded-full"
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 160 }}
                transition={{ delay: 0.8, duration: 1 }}
              >
                <motion.div 
                  className="absolute inset-0 bg-primary"
                  initial={{ x: "-100%" }}
                  animate={{ x: "0%" }}
                  transition={{ 
                    duration: 2.5, 
                    ease: [0.445, 0.05, 0.55, 0.95], 
                    delay: 0.2 
                  }}
                />
              </motion.div>
              
              {authLoading && (
                <motion.p 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.3 }}
                  className="mt-4 text-[9px] font-black uppercase tracking-[0.4em]"
                >
                  Synchronisation...
                </motion.p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}