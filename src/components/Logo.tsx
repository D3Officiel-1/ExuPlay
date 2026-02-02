
"use client"

import { BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LogoProps {
  className?: string;
}

export function Logo({ className }: LogoProps) {
  return (
    <div className={cn("group relative flex items-center gap-4 select-none cursor-default", className)}>
      {/* Dynamic Background Glow */}
      <div className="absolute -inset-6 bg-foreground/5 blur-3xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
      
      {/* Icon Container */}
      <div className="relative">
        <div className="absolute inset-0 bg-foreground/10 rounded-xl rotate-6 group-hover:rotate-12 transition-transform duration-500" />
        <div className="relative bg-foreground text-background p-4 rounded-xl shadow-2xl transition-all duration-500 group-hover:-translate-y-2 group-hover:scale-110">
          <BookOpen className="h-8 w-8" />
        </div>
      </div>

      {/* Text Container */}
      <div className="flex flex-col -space-y-1">
        <span className="text-4xl font-black tracking-tighter text-foreground font-serif italic">
          Philo<span className="text-foreground/30 group-hover:text-foreground transition-colors duration-500">.</span>
        </span>
        <span className="text-[11px] uppercase tracking-[0.4em] font-bold text-foreground/40 ml-1 group-hover:text-foreground/70 transition-colors">
          Modern Wisdom
        </span>
      </div>
    </div>
  );
}
