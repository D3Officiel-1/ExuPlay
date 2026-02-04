
'use server';

/**
 * @fileOverview Un flux Genkit pour générer des questions de quiz ultra-difficiles, variées et concises.
 *
 * - generateQuiz - Fonction principale pour générer un défi complexe et aléatoire.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateQuizInputSchema = z.object({
  theme: z.string().optional().describe('Un thème optionnel pour orienter la question (ex: Sport, Cuisine, Entreprises)'),
});

export type GenerateQuizInput = z.infer<typeof GenerateQuizInputSchema>;

const GenerateQuizOutputSchema = z.object({
  question: z.string().describe('La question concise et complexe générée'),
  options: z.array(z.string()).length(4).describe('Quatre options de réponse précises et trompeuses'),
  correctIndex: z.number().min(0).max(3).describe('L\'index de la réponse exacte (0-3)'),
  points: z.number().default(100).describe('Le nombre de points attribués'),
});

export type GenerateQuizOutput = z.infer<typeof GenerateQuizOutputSchema>;

const prompt = ai.definePrompt({
  name: 'generateQuizPrompt',
  input: {schema: GenerateQuizInputSchema},
  output: {schema: GenerateQuizOutputSchema},
  prompt: `Tu es l'Oracle de l'Inconnu, un expert universel doté d'une culture immense et d'une précision chirurgicale. 
  Ta mission est de générer une question de quiz ultra-difficile, percutante et très courte.
  
  {{#if theme}}Le thème imposé est : {{{theme}}}.{{else}}Si aucun thème n'est fourni, tu es TOTALEMENT LIBRE. Invente ton propre sujet en explorant les zones les plus obscures du savoir. Ne te limite à aucune catégorie. Choisis une donnée technique, un fait historique occulte, ou une statistique si précise qu'elle semble incroyable.{{/if}}
  
  Instructions impératives :
  1. La question doit être en Français et extrêmement CONCISE (maximum 12-15 mots).
  2. La difficulté doit être maximale : cherche le détail technique ou factuel que seul un expert absolu connaîtrait.
  3. Varie les thématiques de manière totalement imprévisible et aléatoire : 
     - "Quelle est la capacité nominale exacte en mAh de la batterie du premier iPhone de 2007 ?"
     - "Quel est le nom précis du gaz rare utilisé dans les propulseurs à effet Hall ?"
     - "En quel mois et année précis la société Orange a-t-elle officiellement racheté France Télécom ?"
     - "Quel est le poids exact en grammes d'une balle de tennis de compétition ATP ?"
  4. Les 4 options de réponse doivent être extrêmement plausibles, précises et proches (souvent des chiffres ou des noms très similaires) pour induire en erreur.
  5. Définis l'index correct (0 pour la première option, 3 pour la dernière).
  6. Ton froid, direct et chirurgical.`,
});

export async function generateQuiz(input: GenerateQuizInput): Promise<GenerateQuizOutput> {
  const {output} = await prompt(input);
  if (!output) throw new Error('Échec de la génération du défi');
  return output;
}
