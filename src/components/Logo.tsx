import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LogoProps {
  className?: string;
}

export function Logo({ className }: LogoProps) {
  return (
    <div className={cn("group relative flex items-center gap-3 select-none cursor-default", className)}>
      {/* Background Glow Effect */}
      <div className="absolute -inset-4 bg-secondary/20 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      {/* Icon Container */}
      <div className="relative">
        <div className="absolute inset-0 bg-primary/20 rounded-2xl rotate-6 group-hover:rotate-12 transition-transform duration-300" />
        <div className="relative bg-primary text-primary-foreground p-3 rounded-2xl shadow-[0_8px_30px_rgb(74,20,75,0.3)] group-hover:shadow-[0_8px_40px_rgb(74,20,75,0.5)] transition-all duration-300 group-hover:-translate-y-1">
          <Sparkles className="h-7 w-7 animate-pulse" />
        </div>
      </div>

      {/* Text Container */}
      <div className="flex flex-col -space-y-1">
        <span className="text-3xl font-black tracking-tight text-primary font-serif italic">
          Philo<span className="text-secondary group-hover:text-primary transition-colors duration-300">.</span>
        </span>
        <span className="text-[10px] uppercase tracking-[0.3em] font-bold text-muted-foreground/60 ml-1 group-hover:text-primary/60 transition-colors">
          Modern Wisdom
        </span>
      </div>
    </div>
  );
}
