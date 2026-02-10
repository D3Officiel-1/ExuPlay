'use server';

/**
 * @fileOverview Oracle de l'Exu Loto v1.0 - Arbitrage des Sphères.
 * Gère la génération des tirages (5/90) et la validation des gains.
 */

export interface LotoDraw {
  id: string;
  numbers: number[];
  timestamp: string;
}

/**
 * Invoque un nouveau tirage de 5 numéros parmi 90.
 */
export async function triggerLotoDraw(): Promise<LotoDraw> {
  const numbers: number[] = [];
  while (numbers.length < 5) {
    const n = Math.floor(Math.random() * 90) + 1;
    if (!numbers.includes(n)) {
      numbers.push(n);
    }
  }
  
  // Tri pour la clarté visuelle
  numbers.sort((a, b) => a - b);

  return {
    id: `LOTO-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    numbers,
    timestamp: new Date().toISOString()
  };
}

/**
 * Récupère l'historique des tirages récents.
 */
export async function getLotoHistory(count: number = 5): Promise<number[][]> {
  const history = [];
  for (let i = 0; i < count; i++) {
    const draw = [];
    while (draw.length < 5) {
      const n = Math.floor(Math.random() * 90) + 1;
      if (!draw.includes(n)) draw.push(n);
    }
    history.push(draw.sort((a, b) => a - b));
  }
  return history;
}

/**
 * Valide le gain d'un ticket de loto.
 * RÈGLES DE RÉTRIBUTION :
 * - 2 numéros corrects : x25
 * - 3 numéros corrects : x200
 * - 4 numéros corrects : x1500
 * - 5 numéros corrects : x10000
 */
export async function validateLotoWin(
  stake: number,
  picks: number[],
  draw: number[]
): Promise<{ success: boolean; matchedCount: number; winAmount: number }> {
  const matches = picks.filter(n => draw.includes(n));
  const count = matches.length;

  let multiplier = 0;
  if (count === 2) multiplier = 25;
  else if (count === 3) multiplier = 200;
  else if (count === 4) multiplier = 1500;
  else if (count === 5) multiplier = 10000;

  const winAmount = Math.floor(stake * multiplier);

  return {
    success: count >= 2,
    matchedCount: count,
    winAmount
  };
}
