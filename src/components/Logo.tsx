
"use client"

import { cn } from '@/lib/utils';

interface LogoProps {
  className?: string;
}

export function Logo({ className }: LogoProps) {
  return (
    <div className={cn("group relative flex items-center gap-4 select-none cursor-default", className)}>
      <div className="absolute -inset-6 bg-foreground/5 blur-3xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
      
      <div className="relative">
        <div className="absolute inset-0 bg-foreground/10 rounded-xl rotate-6 group-hover:rotate-12 transition-transform duration-500" />
        <div className="relative bg-foreground text-background p-3 rounded-xl shadow-2xl transition-all duration-500 group-hover:-translate-y-2 group-hover:scale-110">
          <svg 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            className="h-9 w-9"
          >
            <path d="M17.8 19.2L16 11l3.5-2.5c.8-.6.8-1.8 0-2.4l-3.5-2.5" />
            <path d="M3 21c3-3 7-1 10-4" opacity="0.3" />
            <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" fill="currentColor" />
          </svg>
        </div>
      </div>

      <div className="flex flex-col justify-center">
        <span className="text-4xl font-black tracking-tighter text-foreground font-sans uppercase">
          Exu Play<span className="text-foreground/30 group-hover:text-foreground transition-colors duration-500">.</span>
        </span>
      </div>
    </div>
  );
}
