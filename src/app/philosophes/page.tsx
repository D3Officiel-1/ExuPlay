
"use client"

import { useState } from 'react';
import { Navigation } from '@/components/Navigation';
import { QUOTES, PHILOSOPHERS } from '@/app/lib/quotes-data';
import { QuoteCard } from '@/components/QuoteCard';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { User, Library } from 'lucide-react';

export default function PhilosophesPage() {
  const [selected, setSelected] = useState(PHILOSOPHERS[0]);

  const filteredQuotes = QUOTES.filter(q => q.author === selected);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navigation />
      
      <main className="container mx-auto px-4 py-16">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
            <div>
              <h1 className="text-4xl font-headline font-bold text-primary mb-2 flex items-center gap-3">
                <Library className="text-accent" />
                Les Penseurs
              </h1>
              <p className="text-muted-foreground">Explorez la sagesse à travers les esprits qui ont marqué l'histoire.</p>
            </div>
          </div>

          <Tabs defaultValue={selected} onValueChange={setSelected} className="w-full">
            <div className="flex justify-center mb-10 overflow-x-auto pb-2">
              <TabsList className="bg-muted p-1 rounded-xl h-auto flex flex-nowrap md:flex-wrap">
                {PHILOSOPHERS.map((phil) => (
                  <TabsTrigger 
                    key={phil} 
                    value={phil}
                    className="data-[state=active]:bg-primary data-[state=active]:text-white rounded-lg px-4 py-2 text-sm whitespace-nowrap"
                  >
                    {phil}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {filteredQuotes.map((quote) => (
                <QuoteCard key={quote.id} quote={quote} />
              ))}
            </div>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
