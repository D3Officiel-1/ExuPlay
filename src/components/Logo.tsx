
"use client"

import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface LogoProps {
  className?: string;
}

export function Logo({ className }: LogoProps) {
  return (
    <div className={cn("group relative flex flex-col items-center gap-4 select-none cursor-default", className)}>
      <div className="relative">
        {/* Aura subtile derrière l'avion */}
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.2, 0.1] }}
          transition={{ duration: 4, repeat: Infinity }}
          className="absolute inset-0 bg-primary rounded-full blur-2xl"
        />
        
        <div className="relative text-foreground transition-all duration-700 group-hover:scale-110">
          <svg 
            viewBox="0 0 24 24" 
            fill="currentColor" 
            stroke="none"
            className="h-12 w-12"
          >
            {/* L'avion - Simple, pur, sans traits superflus */}
            <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
          </svg>
        </div>
      </div>

      <div className="flex flex-col items-center">
        <span className="text-3xl font-black tracking-tighter text-foreground font-sans uppercase">
          Exu Play<span className="text-primary transition-colors duration-500">.</span>
        </span>
      </div>
    </div>
  );
}
