
'use server';

/**
 * @fileOverview Oracle de Transmission Sportive Intégrale.
 * Récupère l'intégralité des données de l'API Football mondiale.
 */

import { format } from 'date-fns';

const API_KEY = '06a5036900f514316ebbf46a1f9f933e';
const API_URL = 'https://v3.football.api-sports.io/fixtures';

export async function getDailyMatches() {
  const today = format(new Date(), 'yyyy-MM-dd');
  
  try {
    const response = await fetch(`${API_URL}?date=${today}&status=NS`, {
      method: 'GET',
      headers: {
        'x-apisports-key': API_KEY,
        'x-apisports-host': 'v3.football.api-sports.io'
      },
      next: { revalidate: 86400 } 
    });

    if (!response.ok) {
      console.error("[Oracle Sport] Dissonance API:", response.statusText);
      return null;
    }

    const result = await response.json();
    const fixtures = result.response || [];

    // On renvoie l'objet complet de l'API, en ajoutant simplement les cotes générées
    return fixtures.slice(0, 20).map((f: any) => ({
      ...f,
      // On conserve ces champs pour une lecture simplifiée dans l'interface si besoin
      displayTime: format(new Date(f.fixture.date), 'HH:mm'),
      odds: {
        "1": (1.4 + Math.random() * 2.5).toFixed(2),
        "X": (2.8 + Math.random() * 1.5).toFixed(2),
        "2": (1.8 + Math.random() * 3.5).toFixed(2)
      }
    }));
  } catch (error) {
    console.error('[Oracle Sport] Échec de la transmission:', error);
    return null;
  }
}
