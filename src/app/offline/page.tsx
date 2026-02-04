
"use client";

import { motion } from "framer-motion";
import { WifiOff, RefreshCcw, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { useRouter } from "next/navigation";

/**
 * @fileOverview Page de secours affichée lorsque l'utilisateur est hors ligne.
 * Design minimaliste et immersif conforme à l'esthétique d'Exu Play.
 */

export default function OfflinePage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-8 text-center relative overflow-hidden">
      {/* Orbes de fond pour l'ambiance */}
      <div className="absolute inset-0 pointer-events-none opacity-20">
        <div className="absolute top-[-10%] left-[-10%] w-[70%] h-[70%] rounded-full bg-primary/10 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[70%] h-[70%] rounded-full bg-primary/10 blur-[120px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.9, filter: "blur(10px)" }}
        animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="space-y-12 z-10 max-w-sm w-full"
      >
        <div className="flex justify-center">
          <Logo className="scale-125" />
        </div>

        <div className="space-y-8">
          <div className="relative mx-auto w-24 h-24">
            <motion.div 
              animate={{ 
                scale: [1, 1.3, 1],
                opacity: [0.2, 0.4, 0.2]
              }}
              transition={{ duration: 4, repeat: Infinity }}
              className="absolute inset-0 bg-destructive/20 rounded-[2.5rem] blur-2xl"
            />
            <div className="relative h-full w-full bg-card border border-destructive/10 rounded-[2.5rem] flex items-center justify-center shadow-2xl">
              <WifiOff className="h-10 w-10 text-destructive" />
            </div>
          </div>

          <div className="space-y-3">
            <h1 className="text-3xl font-black tracking-tighter uppercase text-destructive">Esprit Hors Ligne</h1>
            <p className="text-sm font-medium opacity-40 leading-relaxed px-6">
              La connexion à l'éther a été rompue. Vos réflexions sont momentanément isolées du flux universel.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <Button 
            onClick={() => window.location.reload()}
            className="w-full h-16 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] gap-3 bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-xl"
          >
            <RefreshCcw className="h-4 w-4" />
            Reconnecter l'âme
          </Button>
          
          <Button 
            variant="ghost" 
            onClick={() => router.push("/")}
            className="h-12 font-black text-[9px] uppercase tracking-[0.3em] opacity-30 gap-2"
          >
            <ArrowLeft className="h-3 w-3" />
            Retour à l'Essentiel
          </Button>
        </div>
      </motion.div>

      {/* Indicateur de statut pulsé en bas */}
      <div className="absolute bottom-12 left-0 right-0 flex justify-center">
        <div className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              animate={{ opacity: [0.2, 1, 0.2] }}
              transition={{ duration: 2, repeat: Infinity, delay: i * 0.3 }}
              className="h-1 w-1 bg-destructive rounded-full"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
