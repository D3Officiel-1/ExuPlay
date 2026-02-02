import { BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LogoProps {
  className?: string;
}

export function Logo({ className }: LogoProps) {
  return (
    <div className={cn("flex items-center gap-2 font-bold text-2xl tracking-tighter transition-all hover:opacity-90", className)}>
      <div className="bg-primary text-primary-foreground p-2 rounded-xl shadow-md rotate-3 group-hover:rotate-0 transition-transform">
        <BookOpen className="h-6 w-6" />
      </div>
      <span className="text-primary font-serif">Philo.</span>
    </div>
  );
}
