
"use client"

import { useState, useEffect } from 'react';
import { Quote } from '@/app/lib/quotes-data';

export function useFavorites() {
  const [favorites, setFavorites] = useState<Quote[]>([]);

  useEffect(() => {
    const savedFavs = localStorage.getItem('citation_favorites');
    if (savedFavs) setFavorites(JSON.parse(savedFavs));
  }, []);

  const toggleFavorite = (quote: Quote) => {
    const isFav = favorites.some(f => f.id === quote.id);
    let newFavs: Quote[];
    if (isFav) {
      newFavs = favorites.filter(f => f.id !== quote.id);
    } else {
      newFavs = [...favorites, quote];
    }
    setFavorites(newFavs);
    localStorage.setItem('citation_favorites', JSON.stringify(newFavs));
  };

  const isFavorite = (quoteId: string) => {
    return favorites.some(f => f.id === quoteId);
  };

  return { favorites, toggleFavorite, isFavorite };
}
