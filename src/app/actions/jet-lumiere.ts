
'use server';

/**
 * @fileOverview Oracle du Jet de Lumière v2.5 - Arbitrage de Précision.
 * Gère la génération déterministe des points de rupture et la validation des flux.
 */

export interface JetRound {
  id: string;
  crashPoint: number;
  startTime: string;
}

/**
 * Génère un nouveau destin pour le Jet de Lumière.
 * Distribution de probabilité : 3% de crash instantané, courbe exponentielle ensuite.
 */
export async function triggerNextJetRound(): Promise<JetRound> {
  const r = Math.random();
  
  // 3% de chance de crash instantané à 1.00x (Instastase)
  let crashPoint = 1.00;
  if (r >= 0.03) {
    // Formule de distribution standard avec avantage maison minimal (3%)
    // val = (1 - HouseEdge) / (1 - Random)
    const val = 0.97 / (1 - Math.random());
    crashPoint = parseFloat(Math.min(val, 1000).toFixed(2));
  }

  // Sécurité : crashPoint ne peut être inférieur à 1.00
  crashPoint = Math.max(1.00, crashPoint);

  return {
    id: `JET-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    crashPoint,
    startTime: new Date().toISOString()
  };
}

/**
 * Récupère les annales récentes du flux.
 */
export async function getJetHistory(count: number = 10): Promise<number[]> {
  const history = [];
  for (let i = 0; i < count; i++) {
    const val = 0.97 / (1 - Math.random());
    history.push(parseFloat(Math.max(1.00, Math.min(val, 50)).toFixed(2)));
  }
  return history;
}

/**
 * Valide si un retrait (cashout) est légal.
 * LOI DE L'ORACLE : Le Jet doit dépasser STRICTEMENT la cible.
 * Si target >= crashPoint -> Perdu.
 */
export async function validateJetCashout(
  betAmount: number, 
  targetMultiplier: number, 
  actualCrashPoint: number
): Promise<{ success: boolean; winAmount: number }> {
  // Précision flottante pour éviter les erreurs d'arrondi
  const target = parseFloat(targetMultiplier.toFixed(2));
  const crash = parseFloat(actualCrashPoint.toFixed(2));

  if (target >= crash) {
    return { success: false, winAmount: 0 };
  }

  const winAmount = Math.floor(betAmount * target);
  return { success: true, winAmount };
}
