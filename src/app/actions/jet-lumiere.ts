'use server';

/**
 * @fileOverview Oracle du Jet de Lumière v1.0.
 * Gère la logique de génération des multiplicateurs et l'arbitrage des rounds.
 */

export interface JetRound {
  id: string;
  crashPoint: number;
  startTime: string;
  history: number[];
}

/**
 * Génère un point de rupture (crash point) basé sur une distribution de probabilité.
 * La maison garde un léger avantage (edge) mais permet des multiplicateurs extrêmes.
 */
export async function generateJetResult(): Promise<number> {
  const r = Math.random();
  
  // 3% de chance de crash instantané à 1.00x (Instastase)
  if (r < 0.03) return 1.00;
  
  // Logique de distribution : plus le multiplicateur est haut, plus il est rare
  // Formule simplifiée pour le prototype
  const crashPoint = 0.99 / (1 - Math.random());
  
  // Plafond de sécurité pour l'équilibre du Sanctuaire
  return parseFloat(Math.min(crashPoint, 1000).toFixed(2));
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
