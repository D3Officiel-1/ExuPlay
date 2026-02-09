'use server';

/**
 * @fileOverview Oracle de la Destinée Sportive v3.1.
 * Génère des rencontres internationales avec événements, buteurs, stats et marchés de paris.
 */

export interface MatchEvent {
  minute: number;
  type: "goal" | "yellow_card" | "red_goal";
  player: string;
  team: 'home' | 'away';
}

export interface MatchStats {
  possession: { home: number; away: number };
  shots: { home: number; away: number };
  corners: { home: number; away: number };
}

export interface BettingMarket {
  id: string;
  name: string;
  options: { label: string; odd: number; type: string }[];
}

export interface GeneratedMatch {
  id: string;
  homeTeam: { name: string; emoji: string; code: string; players: string[] };
  awayTeam: { name: string; emoji: string; code: string; players: string[] };
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
  events: MatchEvent[];
  stats: MatchStats;
  markets: BettingMarket[];
}

const COUNTRIES = [
  { name: "Côte d'Ivoire", emoji: "🇨🇮", code: "ci", players: ["S. Haller", "F. Kessié", "S. Adingra", "N. Pépé", "I. Sangaré"] },
  { name: "France", emoji: "🇫🇷", code: "fr", players: ["K. Mbappé", "A. Griezmann", "O. Dembélé", "M. Thuram", "B. Barcola"] },
  { name: "Brésil", emoji: "🇧🇷", code: "br", players: ["Vinícius Jr", "Rodrygo", "Raphinha", "Endrick", "Paquetá"] },
  { name: "Argentine", emoji: "🇦🇷", code: "ar", players: ["L. Messi", "J. Álvarez", "L. Martínez", "R. De Paul", "E. Fernández"] },
  { name: "Maroc", emoji: "🇲🇦", code: "ma", players: ["Y. En-Nesyri", "A. Hakimi", "H. Ziyech", "B. Díaz", "S. Amrabat"] },
  { name: "Sénégal", emoji: "🇸🇳", code: "sn", players: ["S. Mané", "N. Jackson", "I. Sarr", "P. Gueye", "K. Diatta"] },
  { name: "Espagne", emoji: "🇪🇸", code: "es", players: ["L. Yamal", "N. Williams", "Á. Morata", "Dani Olmo", "Pedri"] },
  { name: "Portugal", emoji: "🇵🇹", code: "pt", players: ["C. Ronaldo", "Rafael Leão", "B. Fernandes", "João Félix", "Diogo Jota"] },
  { name: "Angleterre", emoji: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", code: "gb-eng", players: ["H. Kane", "J. Bellingham", "P. Foden", "B. Saka", "C. Palmer"] },
  { name: "Allemagne", emoji: "🇩🇪", code: "de", players: ["F. Wirtz", "J. Musiala", "K. Havertz", "N. Füllkrug", "L. Sané"] }
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
    const startTimeTime = matchDate.getTime();
    
    const FIRST_HALF = 45 * 60 * 1000;
    const HALFTIME = 15 * 60 * 1000;
    const SECOND_HALF = 45 * 60 * 1000;
    const STOPPAGE = 5 * 60 * 1000;
    const TOTAL_DURATION = FIRST_HALF + HALFTIME + SECOND_HALF + STOPPAGE * 2;

    const elapsed = now.getTime() - startTimeTime;
    let status: GeneratedMatch["status"] = "scheduled";
    let liveInfo: GeneratedMatch["liveInfo"];
    let currentMin = 0;

    if (elapsed > 0) {
      if (elapsed < FIRST_HALF) {
        status = "live";
        currentMin = Math.floor(elapsed / 60000);
        liveInfo = { minute: currentMin, phase: "1H", display: `${currentMin}'` };
      } else if (elapsed < FIRST_HALF + STOPPAGE) {
        status = "live";
        currentMin = 45;
        const extra = Math.floor((elapsed - FIRST_HALF) / 60000);
        liveInfo = { minute: 45, phase: "TA", display: `45'+${extra}` };
      } else if (elapsed < FIRST_HALF + STOPPAGE + HALFTIME) {
        status = "live";
        currentMin = 45;
        liveInfo = { minute: 45, phase: "HT", display: "MT" };
      } else if (elapsed < TOTAL_DURATION) {
        status = "live";
        currentMin = 45 + Math.floor((elapsed - (FIRST_HALF + STOPPAGE + HALFTIME)) / 60000);
        liveInfo = { minute: currentMin, phase: "2H", display: `${currentMin}'` };
      } else {
        status = "finished";
        currentMin = 100;
      }
    }

    const maxGoals = Math.floor(seededRandom(matchSeed + 2) * 5);
    const events: MatchEvent[] = [];
    const score = { home: 0, away: 0 };

    for(let g = 0; g < maxGoals; g++) {
      const min = Math.floor(seededRandom(matchSeed + 10 + g) * 90);
      const side = seededRandom(matchSeed + 20 + g) > 0.5 ? 'home' : 'away';
      const playerPool = side === 'home' ? home.players : away.players;
      const player = playerPool[Math.floor(seededRandom(matchSeed + 30 + g) * playerPool.length)];
      
      const event: MatchEvent = { minute: min, type: "goal", player, team: side };
      events.push(event);
      
      if (status === "finished" || (status === "live" && min <= currentMin)) {
        score[side]++;
      }
    }
    events.sort((a, b) => a.minute - b.minute);

    const stats: MatchStats = {
      possession: { 
        home: Math.floor(40 + seededRandom(matchSeed + 40) * 20),
        away: 0 
      },
      shots: {
        home: Math.floor(seededRandom(matchSeed + 41) * 15),
        away: Math.floor(seededRandom(matchSeed + 42) * 12)
      },
      corners: {
        home: Math.floor(seededRandom(matchSeed + 43) * 8),
        away: Math.floor(seededRandom(matchSeed + 44) * 6)
      }
    };
    stats.possession.away = 100 - stats.possession.home;

    const baseOdd = 1.1 + seededRandom(matchSeed + 50) * 3;
    const markets: BettingMarket[] = [
      {
        id: "double_chance",
        name: "Double Chance",
        options: [
          { label: "1X", odd: parseFloat((1 + seededRandom(matchSeed + 51) * 0.5).toFixed(2)), type: "DC1X" },
          { label: "12", odd: parseFloat((1 + seededRandom(matchSeed + 52) * 0.4).toFixed(2)), type: "DC12" },
          { label: "X2", odd: parseFloat((1 + seededRandom(matchSeed + 53) * 0.6).toFixed(2)), type: "DCX2" }
        ]
      },
      {
        id: "over_under",
        name: "Total Buts (2.5)",
        options: [
          { label: "Plus de 2.5", odd: parseFloat((1.5 + seededRandom(matchSeed + 54) * 1.5).toFixed(2)), type: "O2.5" },
          { label: "Moins de 2.5", odd: parseFloat((1.5 + seededRandom(matchSeed + 55) * 1.5).toFixed(2)), type: "U2.5" }
        ]
      },
      {
        id: "btts",
        name: "Les deux marquent",
        options: [
          { label: "Oui", odd: parseFloat((1.4 + seededRandom(matchSeed + 56) * 1.2).toFixed(2)), type: "BTTS_Y" },
          { label: "Non", odd: parseFloat((1.4 + seededRandom(matchSeed + 57) * 1.2).toFixed(2)), type: "BTTS_N" }
        ]
      }
    ];

    matches.push({
      id: `EXU-${dateStr}-${i}`,
      homeTeam: home,
      awayTeam: away,
      startTime: matchDate.toISOString(),
      endTime: status === "finished" ? new Date(startTimeTime + TOTAL_DURATION).toISOString() : undefined,
      odds: {
        "1": parseFloat((baseOdd).toFixed(2)),
        "X": parseFloat((2.5 + seededRandom(matchSeed + 60) * 2).toFixed(2)),
        "2": parseFloat((1.1 + seededRandom(matchSeed + 61) * 4).toFixed(2))
      },
      status,
      score,
      liveInfo,
      events,
      stats,
      markets
    });
  }

  return matches;
}

export async function getMatchById(id: string): Promise<GeneratedMatch | null> {
  const matches = await getDailyMatches();
  return matches.find(m => m.id === id) || null;
}
