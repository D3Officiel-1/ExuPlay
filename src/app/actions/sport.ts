
'use server';

/**
 * @fileOverview Oracle de la Destinée Sportive.
 * Génère des rencontres internationales de manière autonome et déterministe.
 */

export interface GeneratedMatch {
  id: string;
  homeTeam: { name: string; emoji: string };
  awayTeam: { name: string; emoji: string };
  startTime: string;
  odds: { "1": number; "X": number; "2": number };
  status: "scheduled" | "live" | "finished";
  score: { home: number; away: number };
}

const COUNTRIES = [
  { name: "Côte d'Ivoire", emoji: "🇨🇮" },
  { name: "France", emoji: "🇫🇷" },
  { name: "Brésil", emoji: "🇧🇷" },
  { name: "Argentine", emoji: "🇦🇷" },
  { name: "Maroc", emoji: "🇲🇦" },
  { name: "Sénégal", emoji: "🇸🇳" },
  { name: "Japon", emoji: "🇯🇵" },
  { name: "Allemagne", emoji: "🇩🇪" },
  { name: "Espagne", emoji: "🇪🇸" },
  { name: "Italie", emoji: "🇮🇹" },
  { name: "Portugal", emoji: "🇵🇹" },
  { name: "Nigeria", emoji: "🇳🇬" },
  { name: "Cameroun", emoji: "🇨🇲" },
  { name: "Égypte", emoji: "🇪🇬" },
  { name: "USA", emoji: "🇺🇸" },
  { name: "Mexique", emoji: "🇲🇽" },
  { name: "Angleterre", emoji: "🏴󠁧󠁢󠁥󠁮󠁧󠁿" },
  { name: "Belgique", emoji: "🇧🇪" },
  { name: "Croatie", emoji: "🇭🇷" },
  { name: "Pays-Bas", emoji: "🇳🇱" },
  { name: "Suisse", emoji: "🇨🇭" },
  { name: "Uruguay", emoji: "🇺🇾" },
  { name: "Corée du Sud", emoji: "🇰🇷" },
  { name: "Algérie", emoji: "🇩🇿" },
  { name: "Mali", emoji: "🇲🇱" },
  { name: "Ghana", emoji: "🇬🇭" },
  { name: "Colombie", emoji: "🇨🇴" },
  { name: "Suède", emoji: "🇸🇪" },
  { name: "Danemark", emoji: "🇩🇰" },
  { name: "Tunisie", emoji: "🇹🇳" },
  { name: "Canada", emoji: "🇨🇦" },
  { name: "Australie", emoji: "🇦🇺" }
];

// Fonction de hasard déterministe basée sur une graine
function seededRandom(seed: number) {
  const x = Math.sin(seed++) * 10000;
  return x - Math.floor(x);
}

export async function getDailyMatches(): Promise<GeneratedMatch[]> {
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0]; // Format YYYY-MM-DD
  const dateSeed = dateStr.split('-').reduce((acc, val) => acc + parseInt(val), 0);
  
  const matches: GeneratedMatch[] = [];
  const hours = [10, 13, 15, 16, 18, 19, 20, 21, 22, 23];

  for (let i = 0; i < 10; i++) {
    const matchSeed = dateSeed + i * 100;
    
    // Sélection des équipes
    const homeIdx = Math.floor(seededRandom(matchSeed) * COUNTRIES.length);
    let awayIdx = Math.floor(seededRandom(matchSeed + 1) * COUNTRIES.length);
    if (awayIdx === homeIdx) awayIdx = (homeIdx + 1) % COUNTRIES.length;

    const home = COUNTRIES[homeIdx];
    const away = COUNTRIES[awayIdx];

    // Génération de l'heure
    const matchDate = new Date(now);
    matchDate.setHours(hours[i], 0, 0, 0);
    const startTimeStr = matchDate.toISOString();

    // Détermination du statut et du score
    const currentTime = now.getTime();
    const startTimeTime = matchDate.getTime();
    const duration = 105 * 60 * 1000; // 105 minutes (match + mi-temps + arrêts)

    let status: "scheduled" | "live" | "finished" = "scheduled";
    let score = { home: 0, away: 0 };

    if (currentTime > startTimeTime + duration) {
      status = "finished";
      // Score déterministe
      score.home = Math.floor(seededRandom(matchSeed + 2) * 5);
      score.away = Math.floor(seededRandom(matchSeed + 3) * 4);
    } else if (currentTime > startTimeTime) {
      status = "live";
      score.home = Math.floor(seededRandom(matchSeed + 2) * 2);
      score.away = Math.floor(seededRandom(matchSeed + 3) * 2);
    }

    // Cotes déterministes (entre 1.10 et 12.00)
    const odds = {
      "1": parseFloat((1.1 + seededRandom(matchSeed + 4) * 4).toFixed(2)),
      "X": parseFloat((2.5 + seededRandom(matchSeed + 5) * 3).toFixed(2)),
      "2": parseFloat((1.1 + seededRandom(matchSeed + 6) * 4).toFixed(2))
    };

    matches.push({
      id: `EXU-${dateStr}-${i}`,
      homeTeam: home,
      awayTeam: away,
      startTime: startTimeStr,
      odds,
      status,
      score
    });
  }

  return matches;
}
