/**
 * @fileOverview Oracle de l'Orthographe v1.0.
 * Bibliothèque logique pour la correction et la suggestion de mots.
 */

import { SACRED_DICTIONARY } from "./dictionary";

/**
 * Calcule la distance de Levenshtein entre deux chaînes.
 * Mesure le nombre minimum de modifications pour passer d'un mot à l'autre.
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix = Array.from({ length: a.length + 1 }, () => 
    Array.from({ length: b.length + 1 }, (_, i) => i)
  );

  for (let i = 0; i <= a.length; i++) matrix[i][0] = i;

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  return matrix[a.length][b.length];
}

/**
 * Fournit les meilleures suggestions basées sur le dictionnaire.
 * Combine recherche par préfixe et correction orthographique.
 */
export function getSmartSuggestions(input: string, limit: number = 3): string[] {
  const word = input.toLowerCase().trim();
  if (word.length === 0) return [];

  // 1. Recherche par préfixe (Priorité haute)
  const prefixMatches = SACRED_DICTIONARY.filter(w => 
    w.startsWith(word) && w !== word
  ).slice(0, limit);

  if (prefixMatches.length >= limit) return prefixMatches;

  // 2. Recherche par correction (Levenshtein) si pas assez de préfixes
  const remainingSlots = limit - prefixMatches.length;
  const corrections = SACRED_DICTIONARY
    .filter(w => !prefixMatches.includes(w) && w !== word)
    .map(w => ({ word: w, distance: levenshteinDistance(word, w) }))
    .filter(item => item.distance <= 2) // Seulement les mots très proches
    .sort((a, b) => a.distance - b.distance)
    .slice(0, remainingSlots)
    .map(item => item.word);

  return [...prefixMatches, ...corrections];
}

/**
 * Vérifie si un mot existe dans le dictionnaire.
 */
export function isWordCorrect(word: string): boolean {
  return SACRED_DICTIONARY.includes(word.toLowerCase().trim());
}
