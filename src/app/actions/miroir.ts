'use server';

/**
 * @fileOverview Oracle du Miroir de l'Âme v1.0.
 * Gère l'arbitrage du destin pour le jeu de sélection de miroirs.
 */

export interface MiroirRound {
  id: string;
  winningIndex: number; // 0 à 5
  timestamp: string;
}

/**
 * Invoque le verdict du Miroir.
 * Probabilité : 1/6 (Très difficile).
 */
export async function triggerMiroirRound(): Promise<MiroirRound> {
  const winningIndex = Math.floor(Math.random() * 6);
  
  return {
    id: `MIR-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    winningIndex,
    timestamp: new Date().toISOString()
  };
}

/**
 * Valide le gain. Multiplicateur x5.5 pour refléter la difficulté.
 */
export async function validateMiroirWin(
  betAmount: number,
  selectedIndex: number,
  winningIndex: number
): Promise<{ success: boolean; winAmount: number }> {
  if (selectedIndex === winningIndex) {
    return {
      success: true,
      winAmount: Math.floor(betAmount * 5.5)
    };
  }
  return { success: false, winAmount: 0 };
}
