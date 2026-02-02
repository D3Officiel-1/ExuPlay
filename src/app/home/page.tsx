"use client";

import { motion } from "framer-motion";
import { Navigation } from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { QUOTES, THEMES } from "@/app/lib/quotes-data";
import { ArrowRight, BookOpen, Heart, Sparkles, Zap } from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/Logo";

export default function HomePage() {
  const featuredQuote = QUOTES[Math.floor(Math.random() * QUOTES.length)];

  return (
    <div className="min-h-screen bg-background text-foreground pb-20">
      <header className="p-6 md:p-12 flex justify-between items-center">
        <Logo className="scale-75 origin-left" />
        <Navigation />
      </header>

      <main className="px-6 md:px-12 max-w-7xl mx-auto space-y-16">
        {/* Hero Section */}
        <section className="relative py-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="space-y-6"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-foreground/5 border border-foreground/10 text-[10px] font-bold uppercase tracking-widest">
              <Sparkles className="h-3 w-3" />
              Inspiration
            </div>
            <h2 className="text-4xl md:text-7xl font-bold leading-[1.1] tracking-tight max-w-4xl">
              "{featuredQuote.text}"
            </h2>
            <div className="flex flex-col gap-1">
              <span className="text-xl font-bold">— {featuredQuote.author}</span>
              {featuredQuote.work && (
                <span className="text-sm opacity-50 italic">{featuredQuote.work}</span>
              )}
            </div>
            <div className="flex gap-4 pt-4">
              <Link href="/random">
                <Button size="lg" className="rounded-full h-14 px-8 font-bold gap-2">
                  <Zap className="h-4 w-4 fill-current" />
                  Aléatoire
                </Button>
              </Link>
              <Button variant="outline" size="lg" className="rounded-full h-14 px-8 font-bold gap-2">
                <Heart className="h-4 w-4" />
                Sauvegarder
              </Button>
            </div>
          </motion.div>
        </section>

        {/* Categories Grid */}
        <section className="space-y-8">
          <div className="flex justify-between items-end">
            <h3 className="text-2xl font-black tracking-tighter uppercase">Thématiques</h3>
            <Link href="/themes" className="text-xs font-bold uppercase tracking-widest opacity-50 hover:opacity-100 transition-opacity flex items-center gap-2">
              Tout voir <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {THEMES.slice(0, 4).map((theme, i) => (
              <motion.div
                key={theme}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 * i }}
              >
                <Link href={`/themes?search=${theme}`}>
                  <Card className="group hover:border-foreground/50 transition-colors cursor-pointer aspect-square flex items-center justify-center text-center overflow-hidden relative">
                    <CardContent className="p-0 flex flex-col items-center gap-3">
                      <span className="text-lg font-bold tracking-tight">{theme}</span>
                      <div className="w-8 h-px bg-foreground/10 group-hover:w-12 transition-all" />
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Featured Section */}
        <section className="grid md:grid-cols-2 gap-8">
          <Card className="bg-foreground text-background border-none overflow-hidden relative group">
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
              <BookOpen className="h-32 w-32" />
            </div>
            <CardContent className="p-10 space-y-6 relative z-10">
              <h3 className="text-3xl font-black tracking-tighter leading-tight uppercase">Les Auteurs</h3>
              <p className="opacity-70 text-sm max-w-xs">Découvrez les pensées des esprits les plus brillants.</p>
              <Link href="/philosophes">
                <Button variant="secondary" className="rounded-full font-bold">Explorer</Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="border-2 border-foreground/5 overflow-hidden relative group">
             <CardContent className="p-10 space-y-6">
              <h3 className="text-3xl font-black tracking-tighter leading-tight uppercase">Collection</h3>
              <p className="opacity-70 text-sm max-w-xs">Vos citations favorites réunies en un seul endroit.</p>
              <Link href="/favoris">
                <Button variant="outline" className="rounded-full font-bold">Ma Bibliothèque</Button>
              </Link>
            </CardContent>
          </Card>
        </section>
      </main>

      <footer className="mt-20 py-12 border-t border-foreground/5 text-center px-6">
        <p className="text-[10px] font-bold uppercase tracking-[0.5em] opacity-30">
          Citation — L'art de la pensée © 2024
        </p>
      </footer>
    </div>
  );
}
