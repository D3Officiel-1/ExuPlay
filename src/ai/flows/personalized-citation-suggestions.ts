'use server';

/**
 * @fileOverview A flow to suggest relevant philosopher quotes based on user browsing history and favorite quotes.
 *
 * - personalizedCitationSuggestions - A function that suggests relevant philosopher quotes.
 * - PersonalizedCitationSuggestionsInput - The input type for the personalizedCitationSuggestions function.
 * - PersonalizedCitationSuggestionsOutput - The return type for the personalizedCitationSuggestions function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const PersonalizedCitationSuggestionsInputSchema = z.object({
  browsingHistory: z
    .string()
    .describe(
      'The user browsing history as a string, including viewed philosophers and themes'
    ),
  favoriteQuotes: z
    .string()
    .describe('The user favorite quotes as a string'),
});

export type PersonalizedCitationSuggestionsInput =
  z.infer<typeof PersonalizedCitationSuggestionsInputSchema>;

const PersonalizedCitationSuggestionsOutputSchema = z.object({
  suggestedQuotes: z
    .string()
    .describe('A list of suggested philosopher quotes based on user data.'),
});

export type PersonalizedCitationSuggestionsOutput =
  z.infer<typeof PersonalizedCitationSuggestionsOutputSchema>;

export async function personalizedCitationSuggestions(
  input: PersonalizedCitationSuggestionsInput
): Promise<PersonalizedCitationSuggestionsOutput> {
  return personalizedCitationSuggestionsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'personalizedCitationSuggestionsPrompt',
  input: {schema: PersonalizedCitationSuggestionsInputSchema},
  output: {schema: PersonalizedCitationSuggestionsOutputSchema},
  prompt: `You are an AI assistant designed to suggest philosopher quotes based on user preferences.

  The user has the following browsing history: {{{browsingHistory}}}
  The user has the following favorite quotes: {{{favoriteQuotes}}}

  Suggest philosopher quotes that the user might find interesting, remember that all quotes must be in French.
  Output the suggested quotes in a string format.
  `,
});

const personalizedCitationSuggestionsFlow = ai.defineFlow(
  {
    name: 'personalizedCitationSuggestionsFlow',
    inputSchema: PersonalizedCitationSuggestionsInputSchema,
    outputSchema: PersonalizedCitationSuggestionsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);

