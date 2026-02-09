'use server';

/**
 * @fileOverview Oracle de la Destinée Sportive v2.0.
 * Génère des rencontres internationales avec une chronologie de buts déterministe
 * pour une mise à jour en temps réel absolue.
 */

export interface GeneratedMatch {
  id: string;
  homeTeam: { name: string; emoji: string; code: string };
  awayTeam: { name: string; emoji: string; code: string };
  startTime: string;
  endTime?: string;
  odds: { "1": number; "X": number; "2": number };
  status: "scheduled" | "live" | "finished";
  score: { home: number; away: number };
  liveInfo?: {
    minute: number;
    phase: "1H" | "HT" | "2H" | "ET" | "TA";
    display: string;
  };
}

const COUNTRIES = [
  { name: "Côte d'Ivoire", emoji: "🇨🇮", code: "ci" },
  { name: "France", emoji: "🇫🇷", code: "fr" },
  { name: "Brésil", emoji: "🇧🇷", code: "br" },
  { name: "Argentine", emoji: "🇦🇷", code: "ar" },
  { name: "Maroc", emoji: "🇲🇦", code: "ma" },
  { name: "Sénégal", emoji: "🇸🇳", code: "sn" },
  { name: "Japon", emoji: "🇯🇵", code: "jp" },
  { name: "Allemagne", emoji: "🇩🇪", code: "de" },
  { name: "Espagne", emoji: "🇪🇸", code: "es" },
  { name: "Italie", emoji: "🇮🇹", code: "it" },
  { name: "Portugal", emoji: "🇵🇹", code: "pt" },
  { name: "Nigeria", emoji: "🇳🇬", code: "ng" },
  { name: "Cameroun", emoji: "🇨🇲", code: "cm" },
  { name: "Égypte", emoji: "🇪🇬", code: "eg" },
  { name: "USA", emoji: "🇺🇸", code: "us" },
  { name: "Mexique", emoji: "🇲🇽", code: "mx" },
  { name: "Angleterre", emoji: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", code: "gb-eng" },
  { name: "Belgique", emoji: "🇧🇪", code: "be" },
  { name: "Croatie", emoji: "🇭🇷", code: "hr" },
  { name: "Pays-Bas", emoji: "🇳🇱", code: "nl" },
  { name: "Suisse", emoji: "🇨🇭", code: "ch" },
  { name: "Uruguay", emoji: "🇺🇾", code: "uy" },
  { name: "Corée du Sud", emoji: "🇰🇷", code: "kr" },
  { name: "Algérie", emoji: "🇩🇿", code: "dz" },
  { name: "Mali", emoji: "🇲🇱", code: "ml" },
  { name: "Ghana", emoji: "🇬🇭", code: "gh" },
  { name: "Colombie", emoji: "🇨🇴", code: "co" },
  { name: "Suède", emoji: "🇸🇪", code: "se" },
  { name: "Danemark", emoji: "🇩🇰", code: "dk" },
  { name: "Tunisie", emoji: "🇹🇳", code: "tn" },
  { name: "Canada", emoji: "🇨🇦", code: "ca" },
  { name: "Australie", emoji: "🇦🇺", code: "au" }
];

function seededRandom(seed: number) {
  const x = Math.sin(seed++) * 10000;
  return x - Math.floor(x);
}

export async function getDailyMatches(): Promise<GeneratedMatch[]> {
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const dateSeed = dateStr.split('-').reduce((acc, val) => acc + parseInt(val), 0);
  
  const matches: GeneratedMatch[] = [];
  // Heures de coup d'envoi réparties sur la journée
  const hours = [0, 8, 10, 12, 14, 16, 18, 20, 21, 22];

  for (let i = 0; i < 10; i++) {
    const matchSeed = dateSeed + i * 100;
    
    const homeIdx = Math.floor(seededRandom(matchSeed) * COUNTRIES.length);
    let awayIdx = Math.floor(seededRandom(matchSeed + 1) * COUNTRIES.length);
    if (awayIdx === homeIdx) awayIdx = (homeIdx + 1) % COUNTRIES.length;

    const home = COUNTRIES[homeIdx];
    const away = COUNTRIES[awayIdx];

    const matchDate = new Date(now);
    matchDate.setHours(hours[i], 0, 0, 0);
    const startTimeStr = matchDate.toISOString();

    const currentTime = now.getTime();
    const startTimeTime = matchDate.getTime();
    
    // Définition des durées (en ms)
    const FIRST_HALF = 45 * 60 * 1000;
    const HALFTIME = 15 * 60 * 1000;
    const SECOND_HALF = 45 * 60 * 1000;
    const STOPPAGE = 5 * 60 * 1000;
    const TOTAL_DURATION = FIRST_HALF + HALFTIME + SECOND_HALF + STOPPAGE * 2;

    let status: "scheduled" | "live" | "finished" = "scheduled";
    let score = { home: 0, away: 0 };
    let liveInfo: GeneratedMatch["liveInfo"];
    let endTime: string | undefined;

    const elapsed = currentTime - startTimeTime;

    // Prédétermination déterministe des buts
    const maxGoals = Math.floor(seededRandom(matchSeed + 2) * 6); // 0 à 5 buts
    const goalEvents: { min: number, side: 'home' | 'away' }[] = [];
    for(let g = 0; g < maxGoals; g++) {
      const min = Math.floor(seededRandom(matchSeed + 10 + g) * 90);
      const side = seededRandom(matchSeed + 20 + g) > 0.5 ? 'home' : 'away';
      goalEvents.push({ min, side });
    }

    if (elapsed > 0) {
      if (elapsed < FIRST_HALF) {
        status = "live";
        const currentMin = Math.floor(elapsed / 60000);
        liveInfo = { minute: currentMin, phase: "1H", display: `${currentMin}'` };
        // Calcul du score live
        goalEvents.filter(e => e.min <= currentMin).forEach(e => score[e.side]++);
      } else if (elapsed < FIRST_HALF + STOPPAGE) {
        status = "live";
        const extraMin = Math.floor((elapsed - FIRST_HALF) / 60000);
        liveInfo = { minute: 45, phase: "TA", display: `45'+${extraMin}` };
        goalEvents.filter(e => e.min <= 45).forEach(e => score[e.side]++);
      } else if (elapsed < FIRST_HALF + STOPPAGE + HALFTIME) {
        status = "live";
        liveInfo = { minute: 45, phase: "HT", display: "MT" };
        goalEvents.filter(e => e.min <= 45).forEach(e => score[e.side]++);
      } else if (elapsed < FIRST_HALF + STOPPAGE + HALFTIME + SECOND_HALF) {
        status = "live";
        const currentMin = 45 + Math.floor((elapsed - (FIRST_HALF + STOPPAGE + HALFTIME)) / 60000);
        liveInfo = { minute: currentMin, phase: "2H", display: `${currentMin}'` };
        goalEvents.filter(e => e.min <= currentMin).forEach(e => score[e.side]++);
      } else if (elapsed < TOTAL_DURATION) {
        status = "live";
        const extraMin = Math.floor((elapsed - (FIRST_HALF + STOPPAGE + HALFTIME + SECOND_HALF)) / 60000);
        liveInfo = { minute: 90, phase: "TA", display: `90'+${extraMin}` };
        goalEvents.forEach(e => score[e.side]++);
      } else {
        status = "finished";
        goalEvents.forEach(e => score[e.side]++);
        const end = new Date(matchDate.getTime() + TOTAL_DURATION);
        endTime = end.toISOString();
      }
    }

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
      endTime,
      odds,
      status,
      score,
      liveInfo
    });
  }

  return matches;
}
