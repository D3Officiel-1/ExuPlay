
"use client"

import { useState, useEffect } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useFavorites } from '@/hooks/use-favorites';
import { personalizedCitationSuggestions } from '@/ai/flows/personalized-citation-suggestions';

export function AiSuggestions() {
  const { favorites, history } = useFavorites();
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchSuggestion() {
      if (history.length === 0 && favorites.length === 0) return;
      
      setLoading(true);
      try {
        const result = await personalizedCitationSuggestions({
          browsingHistory: history.join(', '),
          favoriteQuotes: favorites.map(f => `"${f.text}" - ${f.author}`).join('; '),
        });
        setSuggestion(result.suggestedQuotes);
      } catch (error) {
        console.error("AI flow error:", error);
      } finally {
        setLoading(false);
      }
    }

    if (history.length > 2 || favorites.length > 1) {
      fetchSuggestion();
    }
  }, [favorites.length, history.length]);

  if (!suggestion && !loading) return null;

  return (
    <Card className="border-accent/40 bg-accent/5 overflow-hidden">
      <CardHeader className="bg-accent/10 py-3">
        <CardTitle className="text-sm font-headline flex items-center gap-2 text-primary uppercase tracking-widest">
          <Sparkles className="w-4 h-4 text-accent fill-accent" />
          Suggestions personnalisées
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        {loading ? (
          <div className="flex items-center gap-3 text-muted-foreground italic">
            <Loader2 className="w-4 h-4 animate-spin" />
            L'IA philosophe réfléchit...
          </div>
        ) : (
          <div className="prose prose-sm font-body italic text-primary/80">
            {suggestion?.split('\n').map((line, i) => (
              <p key={i} className="mb-2">{line}</p>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
