
import { Navigation } from '@/components/Navigation';
import { QUOTES } from '@/app/lib/quotes-data';
import { QuoteCard } from '@/components/QuoteCard';
import { AiSuggestions } from '@/components/AiSuggestions';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Search, Compass } from 'lucide-react';
import Image from 'next/image';

export default function Home() {
  const featuredQuotes = QUOTES.slice(0, 3);

  return (
    <div className="min-h-screen flex flex-col font-body">
      <Navigation />
      
      <main className="flex-grow">
        {/* Hero Section */}
        <section className="relative h-[450px] flex items-center justify-center text-center px-4 overflow-hidden">
          <Image 
            src="https://picsum.photos/seed/philosophy/1200/600" 
            alt="Philosophie" 
            fill 
            className="object-cover opacity-20"
            data-ai-hint="ancient library marble"
          />
          <div className="relative z-10 max-w-3xl mx-auto">
            <h1 className="text-5xl md:text-7xl font-headline font-bold text-primary mb-6 leading-tight">
              Éclairez votre <span className="text-accent">Esprit</span>
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground mb-10 max-w-2xl mx-auto">
              Découvrez la sagesse intemporelle des plus grands penseurs à travers une collection de citations soigneusement sélectionnées.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Button asChild size="lg" className="bg-primary hover:bg-primary/90 text-white rounded-full px-8 h-12">
                <Link href="/random">
                  Commencer l'exploration
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="border-primary text-primary hover:bg-primary/10 rounded-full px-8 h-12">
                <Link href="/philosophes" className="flex items-center gap-2">
                  <Search className="w-4 h-4" />
                  Par Philosophe
                </Link>
              </Button>
            </div>
          </div>
        </section>

        <section className="container mx-auto px-4 py-20">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            <div className="lg:col-span-2 space-y-12">
              <div className="flex items-center justify-between">
                <h2 className="text-3xl font-headline font-bold text-primary flex items-center gap-3">
                  <Compass className="text-accent" />
                  Citations à la une
                </h2>
                <Link href="/themes" className="text-sm font-semibold text-accent hover:underline">
                  Tout voir →
                </Link>
              </div>
              <div className="grid gap-8">
                {featuredQuotes.map(quote => (
                  <QuoteCard key={quote.id} quote={quote} />
                ))}
              </div>
            </div>

            <div className="space-y-8">
              <AiSuggestions />
              
              <div className="bg-primary p-8 rounded-2xl text-white shadow-xl">
                <h3 className="text-xl font-headline font-bold mb-4">Le saviez-vous ?</h3>
                <p className="text-primary-foreground/80 leading-relaxed italic mb-6">
                  "Philo" signifie amour et "Sophia" signifie sagesse. La philosophie est donc littéralement l'amour de la sagesse.
                </p>
                <div className="h-1 w-12 bg-accent" />
              </div>

              <div className="border border-border p-6 rounded-2xl">
                <h3 className="text-lg font-headline font-bold mb-4 text-primary">Thèmes populaires</h3>
                <div className="flex flex-wrap gap-2">
                  {['Existence', 'Morale', 'Liberté', 'Sagesse', 'Bonheur'].map(t => (
                    <Link key={t} href={`/themes?q=${t}`} className="px-3 py-1 bg-muted rounded-full text-sm text-primary hover:bg-accent hover:text-white transition-colors">
                      {t}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-primary text-primary-foreground py-12 mt-20">
        <div className="container mx-auto px-4 text-center">
          <p className="font-headline text-2xl mb-4"><span className="text-accent">Philo</span>Pensées</p>
          <p className="text-primary-foreground/60 max-w-md mx-auto mb-8">
            Une application dédiée à la réflexion et à l'inspiration.
          </p>
          <div className="flex justify-center gap-8 text-sm opacity-60">
            <Link href="/" className="hover:text-accent">À propos</Link>
            <Link href="/" className="hover:text-accent">Contact</Link>
            <Link href="/" className="hover:text-accent">Mentions Légales</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
