
"use client";

import { motion } from "framer-motion";
import { Logo } from "@/components/Logo";
import { cn } from "@/lib/utils";

export function Header() {
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
          {/* Lueur d'accentuation subtile */}
          <div className="absolute -inset-4 bg-primary/5 blur-3xl rounded-full opacity-50 pointer-events-none" />
          
          <Logo layout="horizontal" className="relative z-10" />
        </motion.div>

        {/* Élément décoratif high-tech minimaliste */}
        <motion.div 
          initial={{ scaleX: 0, opacity: 0 }}
          animate={{ scaleX: 1, opacity: 1 }}
          transition={{ duration: 1.5, delay: 1, ease: [0.22, 1, 0.36, 1] }}
          className="hidden md:flex items-center gap-4"
        >
          <div className="h-[1px] w-24 bg-gradient-to-r from-transparent to-primary/20" />
          <span className="text-[10px] font-black uppercase tracking-[0.5em] opacity-30">
            Navigation System
          </span>
        </motion.div>
      </div>

      {/* Animation de balayage lumineuse périodique */}
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
