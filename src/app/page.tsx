
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Logo } from "@/components/Logo";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.push("/home");
    }, 4000); // Réduction légère du temps d'attente pour plus de fluidité
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="relative min-h-screen w-full flex flex-col items-center justify-center overflow-hidden bg-background">
      {/* Background Decorative Elements */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.05 }}
        transition={{ duration: 2 }}
        className="absolute inset-0 pointer-events-none"
      >
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-foreground blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-foreground blur-[120px]" />
      </motion.div>

      <div className="z-10 flex flex-col items-center gap-12 px-6">
        {/* Logo Animation - Plus central et imposant */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ 
            duration: 1.5, 
            ease: [0.22, 1, 0.36, 1] 
          }}
        >
          <Logo className="scale-150 md:scale-[2]" />
        </motion.div>
      </div>

      {/* Floating Particle Elements */}
      <div className="absolute inset-0 pointer-events-none opacity-20">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute h-1 w-1 bg-foreground rounded-full"
            initial={{ 
              x: Math.random() * 100 + "%", 
              y: Math.random() * 100 + "%",
              opacity: Math.random()
            }}
            animate={{ 
              y: [null, "-60px", "60px", null],
              opacity: [0.1, 0.4, 0.1]
            }}
            transition={{ 
              duration: 5 + Math.random() * 5, 
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
        ))}
      </div>

      {/* Version Badge - Très discret */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.15 }}
        transition={{ delay: 2 }}
        className="absolute bottom-8 text-[9px] font-bold tracking-[0.6em] uppercase"
      >
        Philo v2.0
      </motion.div>
    </div>
  );
}
