
"use client"

import { useState, useEffect } from 'react';
import { Navigation } from '@/components/Navigation';
import { QUOTES, Quote } from '@/app/lib/quotes-data';
import { QuoteCard } from '@/components/QuoteCard';
import { Button } from '@/components/ui/button';
import { RefreshCw, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function RandomPage() {
  const [currentQuote, setCurrentQuote] = useState<Quote | null>(null);

  const getRandom = () => {
    const randomIndex = Math.floor(Math.random() * QUOTES.length);
    setCurrentQuote(QUOTES[randomIndex]);
  };

  useEffect(() => {
    getRandom();
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />
      
      <main className="flex-grow flex flex-col items-center justify-center p-6 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-background via-background to-accent/5">
        <div className="max-w-2xl w-full">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-headline font-bold text-primary mb-4 flex items-center justify-center gap-2">
              <Sparkles className="text-accent w-8 h-8" />
              Inspiration Aléatoire
            </h1>
            <p className="text-muted-foreground">Laissez le hasard guider votre réflexion du moment.</p>
          </div>

          <AnimatePresence mode="wait">
            {currentQuote && (
              <motion.div
                key={currentQuote.id}
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.95 }}
                transition={{ duration: 0.4 }}
              >
                <QuoteCard quote={currentQuote} />
              </motion.div>
            )}
          </AnimatePresence>

          <div className="mt-12 text-center">
            <Button 
              size="lg" 
              onClick={getRandom}
              className="bg-primary hover:bg-primary/90 text-white rounded-full px-10 h-14 text-lg font-headline gap-3 shadow-lg"
            >
              <RefreshCw className="w-5 h-5" />
              Une autre citation
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
