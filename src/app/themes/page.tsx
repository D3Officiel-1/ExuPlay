
"use client"

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Navigation } from '@/components/Navigation';
import { QUOTES, THEMES } from '@/app/lib/quotes-data';
import { QuoteCard } from '@/components/QuoteCard';
import { Grid } from 'lucide-react';
import { cn } from '@/lib/utils';

function ThemesContent() {
  const searchParams = useSearchParams();
  const initialTheme = searchParams.get('q') || THEMES[0];
  const [selectedTheme, setSelectedTheme] = useState(initialTheme);

  const filteredQuotes = QUOTES.filter(q => q.theme === selectedTheme);

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-12 text-center">
        <h1 className="text-4xl font-headline font-bold text-primary mb-4 flex items-center justify-center gap-3">
          <Grid className="text-accent" />
          Explorer par Thème
        </h1>
        <p className="text-muted-foreground">Sélectionnez un sujet pour approfondir votre réflexion.</p>
      </div>

      <div className="flex flex-wrap justify-center gap-3 mb-12">
        {THEMES.map((theme) => (
          <button
            key={theme}
            onClick={() => setSelectedTheme(theme)}
            className={cn(
              "px-6 py-2 rounded-full border transition-all duration-300 font-headline",
              selectedTheme === theme 
                ? "bg-primary text-white border-primary shadow-lg scale-105" 
                : "bg-white text-primary border-primary/20 hover:border-accent hover:bg-accent/5"
            )}
          >
            {theme}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {filteredQuotes.length > 0 ? (
          filteredQuotes.map((quote) => (
            <QuoteCard key={quote.id} quote={quote} />
          ))
        ) : (
          <div className="col-span-full py-20 text-center text-muted-foreground italic">
            Aucune citation pour ce thème pour le moment.
          </div>
        )}
      </div>
    </div>
  );
}

export default function ThemesPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navigation />
      <main className="container mx-auto px-4 py-16">
        <Suspense fallback={<div className="text-center py-20">Chargement...</div>}>
          <ThemesContent />
        </Suspense>
      </main>
    </div>
  );
}
