"use client";

import { motion } from "framer-motion";
import { User as UserIcon } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { getHonorTitle } from "@/lib/titles";

interface ProfileAvatarProps {
  imageUrl?: string | null;
  points?: number;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

/**
 * @fileOverview Composant Avatar avec bordure honorifique dynamique.
 */
export function ProfileAvatar({ imageUrl, points = 0, size = "md", className }: ProfileAvatarProps) {
  const title = getHonorTitle(points);
  
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

  return (
    <div className={cn("relative inline-block", className)}>
      {/* Aura de prestige */}
      <div className={cn(
        "absolute inset-[-15%] rounded-full transition-all duration-1000",
        title.auraClass
      )} />
      
      {/* Bordure de rang */}
      <div className={cn(
        "relative overflow-hidden flex items-center justify-center border-2 transition-colors duration-500 bg-card shadow-xl",
        sizeClasses[size],
        title.borderColor
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

        {/* Effet de brillance pour l'Oracle */}
        {title.name === "Oracle" && (
          <motion.div 
            animate={{ x: ["-100%", "200%"] }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            className="absolute inset-0 bg-gradient-to-r from-transparent via-yellow-500/10 to-transparent skew-x-12 pointer-events-none"
          />
        )}
      </div>
    </div>
  );
}
