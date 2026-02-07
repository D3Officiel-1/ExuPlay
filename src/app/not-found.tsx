
"use client";

import { motion } from "framer-motion";
import { Compass, ArrowLeft, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { useRouter } from "next/navigation";
import { haptic } from "@/lib/haptics";

/**
 * @fileOverview Page 404 réinventée : La Dimension Inconnue.
 * Transforme une erreur système en une expérience immersive et poétique.
 */

export default function NotFound() {
  const router = useRouter();

  const handleReturn = () => {
    haptic.medium();
    router.push("/");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-8 text-center relative overflow-hidden">
      {/* Arrière-plan éthéré et orbes dynamiques */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <motion.div 
          animate={{ 
            scale: [1, 1.3, 1],
            rotate: [0, 45, 0],
            opacity: [0.1, 0.2, 0.1]
          }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[-20%] left-[-20%] w-[100%] h-[100%] rounded-full bg-primary/10 blur-[150px]" 
        />
        <motion.div 
          animate={{ 
            scale: [1, 1.2, 1],
            x: [0, 50, 0],
            y: [0, -30, 0],
            opacity: [0.05, 0.1, 0.05]
          }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute bottom-[-10%] right-[-10%] w-[80%] h-[80%] rounded-full bg-primary/20 blur-[120px]" 
        />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
        className="space-y-16 z-10 max-w-sm w-full"
      >
        <div className="flex justify-center">
          <Logo className="scale-125" />
        </div>

        <div className="space-y-10">
          <div className="relative mx-auto w-32 h-32">
            {/* Anneau de résonance */}
            <motion.div 
              animate={{ 
                rotate: 360,
                scale: [1, 1.1, 1]
              }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              className="absolute inset-[-10px] border border-dashed border-primary/20 rounded-full"
            />
            
            <div className="relative h-full w-full bg-card/40 backdrop-blur-2xl border border-primary/10 rounded-[3.5rem] flex items-center justify-center shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)] overflow-hidden">
              <Compass className="h-14 w-14 text-primary opacity-20" />
              
              {/* Éclats de lumière */}
              <motion.div 
                animate={{ 
                  opacity: [0.2, 0.6, 0.2],
                  scale: [0.8, 1.2, 0.8]
                }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="absolute top-6 right-6"
              >
                <Sparkles className="h-5 w-5 text-primary opacity-40" />
              </motion.div>

              <motion.div 
                animate={{ x: ["-100%", "200%"] }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent skew-x-12"
              />
            </div>
          </div>

          <div className="space-y-4">
            <h1 className="text-6xl font-black tracking-tighter uppercase italic leading-none">
              404
            </h1>
            <p className="text-[10px] font-black uppercase tracking-[0.6em] opacity-40 ml-[0.6em]">
              Dimension Inexistante
            </p>
            
            <div className="h-px w-12 bg-primary/10 mx-auto my-8" />
            
            <p className="text-sm font-medium opacity-60 leading-relaxed px-4 italic">
              "Votre esprit s'est égaré dans les méandres du non-être. Le chemin que vous cherchez n'a pas encore été harmonisé par l'Oracle."
            </p>
          </div>
        </div>

        <div className="pt-4">
          <Button 
            onClick={handleReturn}
            className="w-full h-20 rounded-[2.5rem] font-black text-[10px] uppercase tracking-[0.4em] shadow-2xl shadow-primary/20 gap-4 group active:scale-95 transition-all"
          >
            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
            Retour au Sanctuaire
          </Button>
        </div>
      </motion.div>

      {/* Indicateurs de bas de page */}
      <div className="absolute bottom-12 flex flex-col items-center gap-4 opacity-20">
        <div className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 2, repeat: Infinity, delay: i * 0.4 }}
              className="h-1 w-1 rounded-full bg-primary"
            />
          ))}
        </div>
        <p className="text-[8px] font-black uppercase tracking-[0.5em] italic">
          Limbo Éthéré
        </p>
      </div>
    </div>
  );
}
