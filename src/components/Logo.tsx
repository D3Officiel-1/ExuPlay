
"use client"

import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface LogoProps {
  className?: string;
  layout?: 'vertical' | 'horizontal';
}

export function Logo({ className, layout = 'vertical' }: LogoProps) {
  const isHorizontal = layout === 'horizontal';
  
  return (
    <div className={cn(
      "group relative flex select-none cursor-default", 
      isHorizontal ? "flex-row items-center gap-4" : "flex-col items-center gap-4",
      className
    )}>
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
            className={cn(isHorizontal ? "h-8 w-8" : "h-12 w-12")}
          >
            {/* L'avion */}
            <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
          </svg>
        </div>
      </div>

      <div className="flex flex-col items-start">
        <span className={cn(
          "font-black tracking-tighter text-foreground font-sans uppercase",
          isHorizontal ? "text-xl" : "text-3xl"
        )}>
          Exu Play<span className="text-primary transition-colors duration-500">.</span>
        </span>
      </div>
    </div>
  );
}
