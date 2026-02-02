
"use client";

import { motion } from "framer-motion";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function Home() {
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
        {/* Logo Animation */}
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ 
            duration: 1, 
            ease: [0.22, 1, 0.36, 1] 
          }}
        >
          <Logo className="scale-125 md:scale-[1.5]" />
        </motion.div>

        {/* Text Reveal */}
        <div className="flex flex-col items-center text-center space-y-4 max-w-2xl">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.8 }}
            className="text-4xl md:text-6xl font-black tracking-tighter leading-none"
          >
            LA SAGESSE <br /> RÉINVENTÉE.
          </motion.h1>
          
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.6 }}
            transition={{ delay: 1, duration: 1 }}
            className="text-sm md:text-lg font-medium tracking-wide uppercase max-w-md mx-auto"
          >
            Découvrez la version 2.0 de Philo. Un nouveau regard sur les grands esprits de l'histoire.
          </motion.p>
        </div>

        {/* CTA Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.4, duration: 0.8 }}
        >
          <Link href="/random">
            <Button 
              size="lg" 
              className="group relative h-16 px-10 rounded-full bg-foreground text-background text-lg font-bold overflow-hidden transition-all hover:scale-105 active:scale-95"
            >
              <span className="relative z-10 flex items-center gap-2">
                Commencer l'expérience
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </span>
              <motion.div 
                className="absolute inset-0 bg-background/10"
                initial={{ x: "-100%" }}
                whileHover={{ x: "100%" }}
                transition={{ duration: 0.5 }}
              />
            </Button>
          </Link>
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
              y: [null, "-20px", "20px", null],
              opacity: [0.1, 0.5, 0.1]
            }}
            transition={{ 
              duration: 3 + Math.random() * 5, 
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
        ))}
      </div>

      {/* Version Badge */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.3 }}
        transition={{ delay: 2 }}
        className="absolute bottom-8 text-[10px] font-bold tracking-[0.5em] uppercase"
      >
        Build 2.0.0 — Modern Philosophia
      </motion.div>
    </div>
  );
}
