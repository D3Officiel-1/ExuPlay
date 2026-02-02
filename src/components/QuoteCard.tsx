
"use client"

import { Quote as QuoteType } from '@/app/lib/quotes-data';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Heart, Share2, Quote } from 'lucide-react';
import { useFavorites } from '@/hooks/use-favorites';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface QuoteCardProps {
  quote: QuoteType;
}

export function QuoteCard({ quote }: QuoteCardProps) {
  const { toggleFavorite, isFavorite, addToHistory } = useFavorites();
  const { toast } = useToast();
  const fav = isFavorite(quote.id);

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: 'Citation PhiloPensées',
        text: `"${quote.text}" - ${quote.author}`,
        url: window.location.href,
      }).catch(console.error);
    } else {
      navigator.clipboard.writeText(`"${quote.text}" - ${quote.author}`);
      toast({
        title: "Lien copié !",
        description: "La citation a été copiée dans votre presse-papiers.",
      });
    }
  };

  const onQuoteClick = () => {
    addToHistory(`${quote.author} ${quote.theme}`);
  };

  return (
    <Card className="group relative overflow-hidden transition-all duration-300 hover:shadow-xl bg-card border-primary/10">
      <div className="absolute top-4 right-4 text-primary/5 group-hover:text-primary/10 transition-colors">
        <Quote size={64} />
      </div>
      
      <CardContent className="pt-10 pb-6 px-8 relative z-10" onClick={onQuoteClick}>
        <p className="text-xl md:text-2xl font-headline italic leading-relaxed text-primary mb-6">
          "{quote.text}"
        </p>
        <div className="flex flex-col">
          <span className="font-bold text-lg text-primary/90">{quote.author}</span>
          {quote.work && <span className="text-sm italic text-muted-foreground">{quote.work}</span>}
        </div>
      </CardContent>

      <CardFooter className="flex justify-between items-center px-8 py-4 bg-muted/30">
        <div className="flex gap-2">
          <span className="text-xs font-semibold tracking-wider uppercase bg-primary/10 text-primary px-2 py-1 rounded">
            {quote.theme}
          </span>
        </div>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => toggleFavorite(quote)}
            className={cn("hover:text-accent", fav && "text-accent fill-accent")}
          >
            <Heart className={cn("w-5 h-5", fav && "fill-accent")} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleShare}
            className="hover:text-accent"
          >
            <Share2 className="w-5 h-5" />
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
