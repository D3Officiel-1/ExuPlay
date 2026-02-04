'use server';

/**
 * @fileOverview Un flux Genkit pour générer des questions de quiz philosophiques.
 *
 * - generateQuiz - Fonction principale pour générer un défi.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateQuizInputSchema = z.object({
  theme: z.string().optional().describe('Un thème optionnel pour orienter la question (ex: La Liberté, Le Temps)'),
});

export type GenerateQuizInput = z.infer<typeof GenerateQuizInputSchema>;

const GenerateQuizOutputSchema = z.object({
  question: z.string().describe('La question philosophique générée'),
  options: z.array(z.string()).length(4).describe('Quatre options de réponse plausibles'),
  correctIndex: z.number().min(0).max(3).describe('L\'index de la réponse correcte (0-3)'),
  points: z.number().default(100).describe('Le nombre de points attribués'),
});

export type GenerateQuizOutput = z.infer<typeof GenerateQuizOutputSchema>;

const prompt = ai.definePrompt({
  name: 'generateQuizPrompt',
  input: {schema: GenerateQuizInputSchema},
  output: {schema: GenerateQuizOutputSchema},
  prompt: `Tu es un Maître de l'Éveil, un expert en philosophie et en pédagogie. 
  Ta mission est de générer une question de quiz stimulante et profonde pour aider les esprits à s'éveiller.
  
  {{#if theme}}Le thème imposé est : {{{theme}}}.{{/if}}
  
  Instructions :
  1. La question doit être en Français.
  2. La question doit porter sur un concept, un auteur ou un dilemme philosophique sérieux.
  3. Propose 4 options de réponse qui semblent toutes intelligentes, mais une seule doit être rigoureusement exacte d'un point de vue philosophique ou historique.
  4. Définis l'index correct (0 pour la première option, 3 pour la dernière).
  5. Rends le ton inspirant et mystique.`,
});

export async function generateQuiz(input: GenerateQuizInput): Promise<GenerateQuizOutput> {
  const {output} = await prompt(input);
  if (!output) throw new Error('Échec de la génération du défi');
  return output;
}
