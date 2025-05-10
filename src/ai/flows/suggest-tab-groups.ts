
'use server';

/**
 * @fileOverview This file defines a Genkit flow for suggesting tab groups based on the content of open tabs.
 *
 * The flow takes a list of tab URLs as input and returns a list of suggested tab groups.
 * - suggestTabGroups - A function that handles the tab group suggestion process.
 * - SuggestTabGroupsInput - The input type for the suggestTabGroups function.
 * - SuggestTabGroupsOutput - The return type for the suggestTabGroups function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestTabGroupsInputSchema = z.object({
  urls: z.array(z.string().url()).describe('A list of URLs of the open tabs.'),
});
export type SuggestTabGroupsInput = z.infer<typeof SuggestTabGroupsInputSchema>;

const SuggestTabGroupsOutputSchema = z.array(
  z.object({
    groupName: z.string().describe('The suggested name for the tab group.'),
    tabUrls: z.array(z.string()).describe('The URLs of the tabs to include in the group.'), // Removed .url() here
  })
);
export type SuggestTabGroupsOutput = z.infer<typeof SuggestTabGroupsOutputSchema>;

export async function suggestTabGroups(input: SuggestTabGroupsInput): Promise<SuggestTabGroupsOutput> {
  return suggestTabGroupsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestTabGroupsPrompt',
  input: {schema: SuggestTabGroupsInputSchema},
  output: {schema: SuggestTabGroupsOutputSchema},
  prompt: `You are a tab grouping assistant. Given a list of URLs, suggest relevant tab groups based on the content of the tabs.

URLs:
{{#each urls}}- {{{this}}}
{{/each}}

Respond with a JSON array of objects, where each object has a groupName and a tabUrls field. The tabUrls field should be an array of URLs that belong to the group.
`,
});

const suggestTabGroupsFlow = ai.defineFlow(
  {
    name: 'suggestTabGroupsFlow',
    inputSchema: SuggestTabGroupsInputSchema,
    outputSchema: SuggestTabGroupsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);

