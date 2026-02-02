"use client"

import { useState, useEffect } from 'react';
import { Quote } from '@/app/lib/quotes-data';

export function useFavorites() {
  const [favorites, setFavorites] = useState<Quote[]>([]);
  const [history, setHistory] = useState<string[]>([]);

  useEffect(() => {
    const savedFavs = localStorage.getItem('citation_favorites');
    const savedHistory = localStorage.getItem('citation_history');
    if (savedFavs) setFavorites(JSON.parse(savedFavs));
    if (savedHistory) setHistory(JSON.parse(savedHistory));
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

  const addToHistory = (entry: string) => {
    const newHistory = Array.from(new Set([entry, ...history])).slice(0, 10);
    setHistory(newHistory);
    localStorage.setItem('citation_history', JSON.stringify(newHistory));
  };

  const isFavorite = (quoteId: string) => {
    return favorites.some(f => f.id === quoteId);
  };

  return { favorites, toggleFavorite, isFavorite, history, addToHistory };
}
