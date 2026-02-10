'use server';

/**
 * @fileOverview Oracle de la Dualité v1.2 - Arbitrage des Gains.
 * Gère la logique serveur asynchrone pour le jeu Double avec multiplicateurs certifiés.
 */

import { getTileColorSync, type DoubleColor } from '@/lib/games/double';

export interface DoubleRound {
  id: string;
  resultNumber: number;
  resultColor: DoubleColor;
  timestamp: string;
}

/**
 * Invoque le prochain destin pour le Double.
 * Probabilité pure : 1/15 pour chaque numéro.
 */
export async function triggerNextDoubleRound(): Promise<DoubleRound> {
  // Génération du nombre sacré (0 à 14)
  const resultNumber = Math.floor(Math.random() * 15);
  const resultColor = getTileColorSync(resultNumber);
  
  return {
    id: `DBL-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    resultNumber,
    resultColor,
    timestamp: new Date().toISOString()
  };
}

/**
 * Récupère l'historique récent du flux chromatique.
 */
export async function getDoubleHistory(count: number = 15): Promise<DoubleColor[]> {
  const history: DoubleColor[] = [];
  for (let i = 0; i < count; i++) {
    history.push(getTileColorSync(Math.floor(Math.random() * 15)));
  }
  return history;
}

/**
 * Oracle de Rétribution : Valide le gain potentiel d'un pari selon les lois sacrées.
 * 
 * RÈGLES :
 * - Si pari sur ROUGE et résultat ROUGE -> MISE x2
 * - Si pari sur VERT et résultat VERT -> MISE x2
 * - Si pari sur BLEU et résultat BLEU -> MISE x14
 */
export async function validateDoubleWin(
  betAmount: number,
  betColor: DoubleColor,
  resultColor: DoubleColor
): Promise<{ success: boolean; winAmount: number }> {
  // Vérification de la correspondance chromatique
  if (betColor === resultColor) {
    // Calcul du multiplicateur céleste
    const multiplier = resultColor === 'blue' ? 14 : 2;
    
    return { 
      success: true, 
      winAmount: Math.floor(betAmount * multiplier) 
    };
  }
  
  // En cas de dissonance (couleur différente), l'énergie est perdue
  return { success: false, winAmount: 0 };
}
