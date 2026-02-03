
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
      isHorizontal ? "flex-row items-center gap-3 sm:gap-4" : "flex-col items-center gap-4",
      className
    )}>
      <div className="relative">
        <motion.div
          animate={{ 
            scale: [1, 1.2, 1], 
            opacity: [0.1, 0.2, 0.1],
            rotate: [0, 3, -3, 0]
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute inset-0 bg-primary rounded-full blur-xl group-hover:bg-primary/30 transition-colors"
        />
        
        <motion.div 
          whileHover={{ scale: 1.1, rotate: -1 }}
          transition={{ type: "spring", stiffness: 400, damping: 15 }}
          className="relative text-foreground"
        >
          <svg 
            viewBox="0 0 24 24" 
            fill="currentColor" 
            stroke="none"
            className={cn(isHorizontal ? "h-6 w-6 sm:h-8 sm:w-8" : "h-12 w-12")}
          >
            <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
          </svg>
        </motion.div>
      </div>

      <div className="flex flex-col items-start overflow-hidden">
        <motion.span 
          initial={isHorizontal ? { x: -15, opacity: 0 } : { y: 10, opacity: 0 }}
          animate={{ x: 0, y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className={cn(
            "font-black tracking-tighter text-foreground font-sans uppercase leading-none",
            isHorizontal ? "text-lg sm:text-2xl" : "text-3xl"
          )}
        >
          Exu Play<motion.span 
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 2.5, repeat: Infinity }}
            className="text-primary"
          >.</motion.span>
        </motion.span>
      </div>
    </div>
  );
}
