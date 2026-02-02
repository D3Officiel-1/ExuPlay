
"use client"

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Quote, User, Grid, Heart, Home, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Navigation() {
  const pathname = usePathname();

  const navItems = [
    { name: 'Accueil', path: '/', icon: Home },
    { name: 'Aléatoire', path: '/random', icon: RefreshCw },
    { name: 'Philosophes', path: '/philosophes', icon: User },
    { name: 'Thèmes', path: '/themes', icon: Grid },
    { name: 'Favoris', path: '/favoris', icon: Heart },
  ];

  return (
    <nav className="sticky top-0 z-50 w-full bg-primary text-primary-foreground shadow-md">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2 text-xl font-headline font-bold">
            <span className="text-accent">Philo</span>Pensées
          </Link>
          
          <div className="hidden md:flex space-x-8">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  className={cn(
                    "flex items-center gap-2 transition-colors hover:text-accent",
                    pathname === item.path ? "text-accent font-semibold" : "text-primary-foreground/80"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </div>

          <div className="md:hidden flex items-center gap-4">
             {/* Simple mobile menu fallback or keeping icons only */}
             <Link href="/random" title="Aléatoire">
                <RefreshCw className="w-5 h-5 text-accent" />
             </Link>
             <Link href="/favoris" title="Favoris">
                <Heart className="w-5 h-5" />
             </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
