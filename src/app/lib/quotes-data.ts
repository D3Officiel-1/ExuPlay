
export interface Quote {
  id: string;
  text: string;
  author: string;
  theme: string;
  work?: string;
}

export const QUOTES: Quote[] = [
  {
    id: "1",
    text: "Je pense, donc je suis.",
    author: "René Descartes",
    theme: "Existence",
    work: "Discours de la méthode"
  },
  {
    id: "2",
    text: "Le bonheur est le seul but de la vie.",
    author: "Aristote",
    theme: "Bonheur",
    work: "Éthique à Nicomaque"
  },
  {
    id: "3",
    text: "L'homme est condamné à être libre.",
    author: "Jean-Paul Sartre",
    theme: "Liberté",
    work: "L'Existentialisme est un humanisme"
  },
  {
    id: "4",
    text: "Ce qui ne me tue pas me rend plus fort.",
    author: "Friedrich Nietzsche",
    theme: "Force",
    work: "Crépuscule des idoles"
  },
  {
    id: "5",
    text: "Agis de telle sorte que la maxime de ta volonté puisse toujours valoir en même temps comme principe d'une législation universelle.",
    author: "Emmanuel Kant",
    theme: "Morale",
    work: "Critique de la raison pratique"
  },
  {
    id: "6",
    text: "Connais-toi toi-même.",
    author: "Socrate",
    theme: "Sagesse"
  },
  {
    id: "7",
    text: "La vie sans examen ne vaut pas la peine d'être vécue.",
    author: "Socrate",
    theme: "Sagesse"
  },
  {
    id: "8",
    text: "Il n'y a qu'un problème philosophique vraiment sérieux : c'est le suicide.",
    author: "Albert Camus",
    theme: "Absurde",
    work: "Le Mythe de Sisyphe"
  },
  {
    id: "9",
    text: "Le cœur a ses raisons que la raison ne connaît point.",
    author: "Blaise Pascal",
    theme: "Raison",
    work: "Pensées"
  },
  {
    id: "10",
    text: "L'enfer, c'est les autres.",
    author: "Jean-Paul Sartre",
    theme: "Existence",
    work: "Huis clos"
  },
  {
    id: "11",
    text: "Dieu est mort.",
    author: "Friedrich Nietzsche",
    theme: "Religion",
    work: "Ainsi parlait Zarathoustra"
  },
  {
    id: "12",
    text: "La liberté consiste à ne dépendre que des lois.",
    author: "Voltaire",
    theme: "Liberté"
  },
  {
    id: "13",
    text: "Tout ce que je sais, c'est que je ne sais rien.",
    author: "Socrate",
    theme: "Sagesse"
  },
  {
    id: "14",
    text: "Vivre, c'est apprendre à mourir.",
    author: "Platon",
    theme: "Existence"
  },
  {
    id: "15",
    text: "Le désir est l'essence même de l'homme.",
    author: "Baruch Spinoza",
    theme: "Désir",
    work: "Éthique"
  }
];

export const PHILOSOPHERS = Array.from(new Set(QUOTES.map(q => q.author))).sort();
export const THEMES = Array.from(new Set(QUOTES.map(q => q.theme))).sort();
