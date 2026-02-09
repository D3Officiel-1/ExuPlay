
'use server';

/**
 * @fileOverview Oracle de Transmission Sportive Intégrale.
 * Récupère les matchs et les cotes réelles de l'API-Sports.
 */

import { format } from 'date-fns';

const API_KEY = '06a5036900f514316ebbf46a1f9f933e';
const BASE_URL = 'https://v3.football.api-sports.io';

export async function getDailyMatches() {
  const today = format(new Date(), 'yyyy-MM-dd');
  const headers = {
    'x-apisports-key': API_KEY,
    'x-apisports-host': 'v3.football.api-sports.io'
  };
  
  try {
    // On récupère les fixtures et les odds en parallèle pour optimiser le flux
    const [fixturesRes, oddsRes] = await Promise.all([
      fetch(`${BASE_URL}/fixtures?date=${today}&status=NS`, {
        method: 'GET',
        headers,
        next: { revalidate: 3600 } // Mise à jour toutes les heures
      }),
      fetch(`${BASE_URL}/odds?date=${today}`, {
        method: 'GET',
        headers,
        next: { revalidate: 3600 }
      })
    ]);

    if (!fixturesRes.ok) {
      console.error("[Oracle Sport] Dissonance API Fixtures:", fixturesRes.statusText);
      return null;
    }

    const fixturesData = await fixturesRes.json();
    const oddsData = await oddsRes.json();

    const fixtures = fixturesData.response || [];
    const allOdds = oddsData.response || [];

    // On fusionne les cotes réelles avec les fixtures
    return fixtures.slice(0, 30).map((f: any) => {
      // Recherche des cotes pour cette fixture spécifique
      const matchOdds = allOdds.find((o: any) => o.fixture.id === f.fixture.id);
      let apiOdds = null;

      if (matchOdds && matchOdds.bookmakers?.length > 0) {
        // On prend le premier bookmaker disponible (souvent 1xBet ou Bet365 dans l'API)
        const bookie = matchOdds.bookmakers[0];
        const market = bookie.bets.find((b: any) => b.name === "Match Winner");
        
        if (market) {
          apiOdds = {
            "1": market.values.find((v: any) => v.value === "Home")?.odd || "1.00",
            "X": market.values.find((v: any) => v.value === "Draw")?.odd || "1.00",
            "2": market.values.find((v: any) => v.value === "Away")?.odd || "1.00"
          };
        }
      }

      return {
        ...f,
        displayTime: format(new Date(f.fixture.date), 'HH:mm'),
        // Si les cotes API manquent, on utilise une simulation réaliste
        odds: apiOdds || {
          "1": (1.4 + Math.random() * 1.5).toFixed(2),
          "X": (2.8 + Math.random() * 1.2).toFixed(2),
          "2": (1.8 + Math.random() * 2.5).toFixed(2)
        },
        isReal: !!apiOdds
      };
    });
  } catch (error) {
    console.error('[Oracle Sport] Échec de la transmission intégrale:', error);
    return null;
  }
}
