
'use server';

/**
 * @fileOverview Oracle du Jet de Lumière v2.0 - Synchronisation Universelle.
 * Gère la logique de génération des multiplicateurs et l'arbitrage centralisé.
 */

export interface JetRound {
  id: string;
  crashPoint: number;
  startTime: string;
}

/**
 * Génère un nouveau destin pour le Jet de Lumière.
 * Utilisé par le "leader" pour mettre à jour l'état global dans Firestore.
 */
export async function triggerNextJetRound(): Promise<JetRound> {
  const r = Math.random();
  
  // 3% de chance de crash instantané à 1.00x (Instastase)
  let crashPoint = 1.00;
  if (r >= 0.03) {
    // Logique de distribution : plus le multiplicateur est haut, plus il est rare
    const val = 0.99 / (1 - Math.random());
    crashPoint = parseFloat(Math.min(val, 1000).toFixed(2));
  }

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
    const val = 0.99 / (1 - Math.random());
    history.push(parseFloat(Math.min(val, 50).toFixed(2)));
  }
  return history;
}

/**
 * Valide si un retrait (cashout) est légal selon le multiplicateur actuel.
 */
export async function validateJetCashout(
  betAmount: number, 
  multiplierAtCashout: number, 
  actualCrashPoint: number
): Promise<{ success: boolean; winAmount: number }> {
  if (multiplierAtCashout >= actualCrashPoint) {
    return { success: false, winAmount: 0 };
  }

  const winAmount = Math.floor(betAmount * multiplierAtCashout);
  return { success: true, winAmount };
}
