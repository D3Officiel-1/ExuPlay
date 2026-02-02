
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Logo } from "@/components/Logo";
import { useUser, useFirestore } from "@/firebase";
import { doc, getDoc } from "firebase/firestore";

export default function SplashPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useUser();
  const db = useFirestore();
  const [checkingPermissions, setCheckingPermissions] = useState(true);

  useEffect(() => {
    const checkRedirect = async () => {
      if (authLoading) return;

      if (!user) {
        // Pas connecté -> Login
        const timer = setTimeout(() => router.push("/login"), 3500);
        return () => clearTimeout(timer);
      }

      try {
        // Connecté -> Vérifier les permissions obligatoires
        const userDoc = await getDoc(doc(db, "users", user.uid));
        const userData = userDoc.data();

        const isFullyAuthorized = 
          userData?.cameraAuthorized === true && 
          userData?.notificationsEnabled === true && 
          userData?.locationAuthorized === true;

        const timer = setTimeout(() => {
          if (isFullyAuthorized) {
            router.push("/random");
          } else {
            router.push("/autoriser");
          }
        }, 3500);
        
        return () => clearTimeout(timer);
      } catch (error) {
        console.error("Error checking permissions:", error);
        router.push("/random"); // Fallback en cas d'erreur
      } finally {
        setCheckingPermissions(false);
      }
    };

    checkRedirect();
  }, [authLoading, user, router, db]);

  return (
    <div className="relative min-h-screen w-full flex flex-col items-center justify-center overflow-hidden bg-background">
      {/* Background Decorative Elements */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0.05, 0.02] }}
        transition={{ duration: 4, times: [0, 0.5, 1], ease: "easeInOut" }}
        className="absolute inset-0 pointer-events-none"
      >
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-foreground blur-[150px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-foreground blur-[150px]" />
      </motion.div>

      {/* Content Container */}
      <div className="z-10 flex flex-col items-center px-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.7, filter: "blur(20px)" }}
          animate={{ 
            opacity: 1, 
            scale: 1, 
            filter: "blur(0px)",
          }}
          transition={{ 
            duration: 2.5, 
            ease: [0.22, 1, 0.36, 1],
            delay: 0.5
          }}
        >
          <motion.div
            animate={{ 
              y: [0, -10, 0],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            <Logo className="scale-150 md:scale-[2.5]" />
          </motion.div>
        </motion.div>

        {/* Progress Bar Decorator */}
        <motion.div 
          className="mt-24 w-48 h-[1px] bg-foreground/10 relative overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5, duration: 1 }}
        >
          <motion.div 
            className="absolute inset-0 bg-foreground"
            initial={{ x: "-100%" }}
            animate={{ x: "0%" }}
            transition={{ duration: 3, ease: "easeInOut", delay: 1 }}
          />
        </motion.div>
      </div>

      {/* Floating Modern Particles */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute h-[1px] w-[1px] bg-foreground rounded-full"
            initial={{ 
              x: Math.random() * 100 + "%", 
              y: Math.random() * 100 + "%",
              opacity: 0,
              scale: 0
            }}
            animate={{ 
              opacity: [0, 0.4, 0],
              scale: [0, 1.5, 0],
              y: ["0%", "-10%"]
            }}
            transition={{ 
              duration: 3 + Math.random() * 3, 
              repeat: Infinity,
              ease: "linear",
              delay: Math.random() * 2
            }}
          />
        ))}
      </div>
    </div>
  );
}
