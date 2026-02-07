"use client";

import { motion, AnimatePresence } from "framer-motion";
import { User as UserIcon, ShieldCheck } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { getHonorTitle, getVisualTheme } from "@/lib/titles";

interface ProfileAvatarProps {
  imageUrl?: string | null;
  points?: number;
  activeTheme?: string;
  isTrusted?: boolean;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

/**
 * @fileOverview Composant Avatar avec aura thématique et Sceau de Confiance.
 */
export function ProfileAvatar({ 
  imageUrl, 
  points = 0, 
  activeTheme = "default",
  isTrusted = false, 
  size = "md", 
  className 
}: ProfileAvatarProps) {
  const visualTheme = getVisualTheme(activeTheme);
  
  const sizeClasses = {
    sm: "h-10 w-10 rounded-xl",
    md: "h-16 w-16 rounded-2xl",
    lg: "h-24 w-24 rounded-[2rem]",
    xl: "h-32 w-32 rounded-[2.5rem]"
  };

  const iconSizes = {
    sm: "h-5 w-5",
    md: "h-8 w-8",
    lg: "h-12 w-12",
    xl: "h-16 w-16"
  };

  const badgeSizes = {
    sm: "h-4 w-4 -bottom-1 -right-1",
    md: "h-6 w-6 -bottom-1.5 -right-1.5",
    lg: "h-8 w-8 -bottom-2 -right-2",
    xl: "h-10 w-10 -bottom-2.5 -right-2.5"
  };

  return (
    <div className={cn("relative inline-block", className)}>
      <AnimatePresence mode="wait">
        <motion.div 
          key={activeTheme}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1.1 }}
          exit={{ opacity: 0, scale: 1.2 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className={cn(
            "absolute inset-[-25%] rounded-full z-0 pointer-events-none",
            visualTheme.auraClass
          )} 
        />
      </AnimatePresence>
      
      <div className={cn(
        "relative overflow-hidden flex items-center justify-center border-2 transition-all duration-700 bg-card shadow-2xl z-10",
        sizeClasses[size],
        visualTheme.borderColor
      )}>
        {imageUrl ? (
          <Image 
            src={imageUrl} 
            alt="Avatar" 
            fill 
            className="object-cover" 
          />
        ) : (
          <UserIcon className={cn("text-primary opacity-20", iconSizes[size])} />
        )}

        {(activeTheme === 'theme_gold' || activeTheme === 'theme_obsidian') && (
          <motion.div 
            animate={{ x: ["-100%", "200%"] }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-12 pointer-events-none"
          />
        )}
      </div>

      {isTrusted && (
        <motion.div 
          initial={{ scale: 0, rotate: -45 }}
          animate={{ scale: 1, rotate: 0 }}
          className={cn(
            "absolute z-20 flex items-center justify-center bg-primary text-primary-foreground rounded-full border-2 border-background shadow-xl",
            badgeSizes[size]
          )}
        >
          <ShieldCheck className="h-[60%] w-[60%]" />
          <motion.div 
            animate={{ opacity: [0, 1, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute inset-0 bg-white/30 rounded-full blur-[3px]"
          />
        </motion.div>
      )}
    </div>
  );
}
