"use client";

import { motion } from "framer-motion";
import { WifiOff, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { useRouter } from "next/navigation";

/**
 * @fileOverview Page de secours ultra-stylisée pour l'état hors ligne.
 * Design immersif avec textures dynamiques et animations éthérées.
 */

export default function OfflinePage() {
  const router = useRouter();

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        delayChildren: 0.3
      }
    }
  };

  const itemVariants = {
    hidden: { y: 30, opacity: 0, filter: "blur(10px)", scale: 0.95 },
    visible: { 
      y: 0, 
      opacity: 1, 
      filter: "blur(0px)", 
      scale: 1,
      transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] }
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-8 text-center relative overflow-hidden">
      {/* Orbes éthérés */}
      <div className="absolute inset-0 pointer-events-none">
        <motion.div 
          animate={{ 
            scale: [1, 1.2, 1],
            x: [0, 50, 0],
            y: [0, -30, 0]
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[-10%] left-[-10%] w-[80%] h-[80%] rounded-full bg-primary/5 blur-[120px]" 
        />
        <motion.div 
          animate={{ 
            scale: [1, 1.3, 1],
            x: [0, -40, 0],
            y: [0, 20, 0]
          }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute bottom-[-10%] right-[-10%] w-[80%] h-[80%] rounded-full bg-destructive/5 blur-[120px]" 
        />
      </div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-16 z-10 max-w-sm w-full"
      >
        <motion.div variants={itemVariants} className="flex justify-center">
          <Logo className="scale-125" />
        </motion.div>

        <div className="space-y-10">
          <motion.div variants={itemVariants} className="relative mx-auto w-28 h-28">
            <motion.div 
              animate={{ 
                scale: [1, 1.5, 1],
                opacity: [0.1, 0.3, 0.1]
              }}
              transition={{ duration: 4, repeat: Infinity }}
              className="absolute inset-0 bg-destructive/20 rounded-[2.5rem] blur-3xl"
            />
            <div className="relative h-full w-full bg-card/40 backdrop-blur-2xl border border-destructive/10 rounded-[3rem] flex items-center justify-center shadow-2xl overflow-hidden">
              <WifiOff className="h-12 w-12 text-destructive" />
              <motion.div 
                animate={{ x: ["-100%", "200%"] }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 bg-gradient-to-r from-transparent via-destructive/5 to-transparent skew-x-12"
              />
            </div>
          </motion.div>

          <motion.div variants={itemVariants} className="space-y-4">
            <h1 className="text-4xl font-black tracking-tighter uppercase text-destructive italic">
              Esprit Hors Ligne
            </h1>
            <p className="text-sm font-medium opacity-40 leading-relaxed px-4">
              La connexion à l'éther est rompue. Vos réflexions sont isolées du flux universel de l'éveil.
            </p>
          </motion.div>
        </div>

        <motion.div variants={itemVariants} className="flex flex-col gap-4">
          <Button 
            variant="ghost" 
            onClick={() => router.push("/")}
            className="h-12 font-black text-[9px] uppercase tracking-[0.4em] opacity-30 gap-2 hover:bg-primary/5 rounded-xl"
          >
            <ArrowLeft className="h-3 w-3" />
            Retour à l'Essentiel
          </Button>
        </motion.div>
      </motion.div>

      {/* Indicateur d'éveil pulsé */}
      <div className="absolute bottom-12 left-0 right-0 flex justify-center items-center gap-4">
        <div className="h-[1px] w-12 bg-gradient-to-r from-transparent to-destructive/20" />
        <div className="flex gap-2">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              animate={{ 
                scale: [1, 1.5, 1],
                opacity: [0.2, 1, 0.2] 
              }}
              transition={{ duration: 2, repeat: Infinity, delay: i * 0.4 }}
              className="h-1.5 w-1.5 bg-destructive rounded-full"
            />
          ))}
        </div>
        <div className="h-[1px] w-12 bg-gradient-to-l from-transparent to-destructive/20" />
      </div>
    </div>
  );
}
