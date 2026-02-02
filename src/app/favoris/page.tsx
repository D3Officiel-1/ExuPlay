
"use client"

import { Navigation } from '@/components/Navigation';
import { QuoteCard } from '@/components/QuoteCard';
import { useFavorites } from '@/hooks/use-favorites';
import { Heart, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function FavorisPage() {
  const { favorites } = useFavorites();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navigation />
      
      <main className="container mx-auto px-4 py-16">
        <div className="max-w-5xl mx-auto">
          <div className="mb-12">
            <h1 className="text-4xl font-headline font-bold text-primary mb-2 flex items-center gap-3">
              <Heart className="text-accent fill-accent" />
              Mes Favoris
            </h1>
            <p className="text-muted-foreground">Votre bibliothèque personnelle de sagesse.</p>
          </div>

          {favorites.length === 0 ? (
            <div className="py-24 text-center border-2 border-dashed border-muted rounded-3xl">
              <BookOpen className="w-16 h-16 text-muted mx-auto mb-6" />
              <h2 className="text-2xl font-headline font-bold text-primary mb-4">Votre collection est vide</h2>
              <p className="text-muted-foreground mb-8 max-w-xs mx-auto">
                Explorez les citations et cliquez sur le cœur pour les enregistrer ici.
              </p>
              <Button asChild className="bg-primary hover:bg-primary/90 text-white rounded-full px-8">
                <Link href="/random">
                  Commencer à explorer
                </Link>
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {favorites.map((quote) => (
                <QuoteCard key={quote.id} quote={quote} />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
