
'use server';

/**
 * @fileOverview This file defines a Genkit flow for suggesting tab groups.
 * It considers ungrouped tabs and existing tab groups to provide organizational suggestions.
 *
 * - suggestTabGroups - A function that handles the tab group suggestion process.
 * - SuggestTabGroupsInput - The input type for the suggestTabGroups function.
 * - SuggestTabGroupsOutput - The return type for the suggestTabGroups function.
 */

import {ai} from '@/ai/genkit';
import {z}from 'genkit';

const ExistingGroupSchema = z.object({
  groupName: z.string().describe('The name of the existing tab group.'),
  tabUrls: z.array(z.string()).describe('The URLs of the tabs currently in this group. These URLs provide strong contextual clues about the group\'s theme.'),
  isCustom: z.boolean().optional().describe('Whether this group was manually created by the user. AI should be cautious about modifying custom groups unless explicitly adding relevant ungrouped tabs.'),
});

const SuggestTabGroupsInputSchema = z.object({
  ungroupedUrls: z.array(z.string()).describe('A list of URLs of the currently ungrouped tabs that need organization. Analyze each URL for its content and context.'),
  existingGroups: z.array(ExistingGroupSchema).optional().describe('A list of already existing tab groups, for context and potential additions. Analyze these groups to understand their themes based on their names and, critically, the collective content of their current tabs.'),
  targetLanguage: z.string().optional().describe('The target language for suggested group names (e.g., "en", "es"). If provided, new group names should be in this language.'),
});
export type SuggestTabGroupsInput = z.infer<typeof SuggestTabGroupsInputSchema>;

const SuggestedGroupSchema = z.object({
  groupName: z.string().describe('The suggested name for the tab group. If adding to an existing group, this will be the name of that existing group. If creating a new group, this name should be in the targetLanguage if specified.'),
  tabUrls: z.array(z.string()).describe('The URLs of the tabs to include in this group. If updating an existing group, this includes its original tabs plus any newly added ones. If creating a new group, this includes the relevant ungrouped URLs.'),
});

const SuggestTabGroupsOutputSchema = z.array(SuggestedGroupSchema);
export type SuggestTabGroupsOutput = z.infer<typeof SuggestTabGroupsOutputSchema>;

export async function suggestTabGroups(input: SuggestTabGroupsInput): Promise<SuggestTabGroupsOutput> {
  // Filter out empty existingGroups before sending to AI to reduce token usage and noise
  const filteredInput = {
    ...input,
    existingGroups: input.existingGroups?.filter(g => g.tabUrls.length > 0),
  };
  return suggestTabGroupsFlow(filteredInput);
}

const prompt = ai.definePrompt({
  name: 'suggestTabGroupsPrompt',
  input: {schema: SuggestTabGroupsInputSchema},
  output: {schema: SuggestTabGroupsOutputSchema},
  prompt: `You are a tab grouping assistant. Your primary task is to organize the provided UNGROUPED TABS by analyzing the content and context derived from each ungrouped URL to determine logical groupings.
You will receive:
1. \`ungroupedUrls\`: A list of URLs for tabs that are currently not in any group. Analyze these to understand their individual topics and relevance.
2. \`existingGroups\` (optional): A list of tab groups that already exist, with their names, current tabs (URLs), and whether they are custom groups.
3. \`targetLanguage\` (optional): The preferred language for any NEWLY CREATED group names (e.g., "en" for English, "es" for Spanish).

Your primary goal is to decide the best placement for EACH of the \`ungroupedUrls\`, considering their individual content and context.
Your STRONG PREFERENCE should be to add ungrouped tabs to one of the \`existingGroups\` if a thematic fit exists.
A thematic fit is determined by comparing the content and context of an ungrouped tab with the \`groupName\` AND, CRUCIALLY, the content and URLs of tabs already present in an \`existingGroup\`. The collective theme of tabs within an existing group is often more indicative than its name alone.

Only create a NEW tab group for \`ungroupedUrls\` if:
1. No \`existingGroup\` is a suitable thematic match, based on a thorough analysis of both its name and its current tabs' collective content.
2. The \`ungroupedUrls\` form a distinct new theme not covered by any existing group.

CRITICAL: AVOID CREATING A NEW GROUP IF AN EXISTING GROUP HAS A VERY SIMILAR NAME OR ALREADY COVERS THE SAME TOPIC/THEME (as determined by its name AND its current tabs). In such cases, you MUST add the relevant \`ungroupedUrls\` to that existing group instead of creating a duplicate or near-duplicate group.

Output Instructions:
- Respond with a JSON array of group objects.
- Each object in the array represents EITHER a NEWLY CREATED group (only if absolutely necessary, as per the guidelines above) OR an EXISTING group that has had UNGROUPED tabs ADDED to it.
- Each group object MUST have:
    - \`groupName\`:
        - For a NEW group, this is the name you suggest. If \`targetLanguage\` is provided, this name MUST be in that language (e.g., if targetLanguage is "es", a new group for work could be "Trabajo"). If you cannot provide a name in the targetLanguage, use English.
        - For an EXISTING group you're adding to, this is the EXACT name of that existing group (do not translate existing group names).
    - \`tabUrls\`:
        - For a NEW group, this array contains ONLY the \`ungroupedUrls\` you've assigned to this new group. All entries must be valid URLs.
        - For an EXISTING group you're adding to, this array MUST contain ALL its ORIGINAL tabs (URLs) PLUS the \`ungroupedUrls\` (URLs) you've added to it. Do NOT omit original tabs. All entries must be valid URLs.

- If an \`existingGroup\` is NOT modified (i.e., no \`ungroupedUrls\` are added to it), DO NOT include it in your output array.
- Prefer adding to non-custom (\`isCustom: false\`) existing groups if a thematic fit exists.
- If adding to a CUSTOM (\`isCustom: true\`) existing group, ensure the thematic fit (based on its existing tabs and name) is very strong and the addition is clearly beneficial.
- When considering adding to an \`existingGroup\`, deeply analyze its \`groupName\` and, CRUCIALLY, its current \`tabUrls\` to accurately understand its theme or purpose. The collective content of these tabs (URLs) defines the group's scope. Be flexible: an ungrouped tab might belong to an existing group even if its title doesn't perfectly match the group's name, as long as it aligns with the group's overall topic and content as indicated by its existing tabs.
- DO NOT create a new group if an existing group with a very similar name or theme (judged by its name AND its current tabs) already exists. Instead, add the relevant ungrouped tabs to that existing group. This is critical for avoiding redundant groups.
- If some \`ungroupedUrls\` cannot be reasonably grouped or added to existing groups, you can omit them from your suggestions (they will remain ungrouped).
- If no \`ungroupedUrls\` are provided, or no actions are taken (no new groups created, no tabs added to existing groups), return an empty array.

Ungrouped URLs to organize:
{{#if ungroupedUrls.length}}
{{#each ungroupedUrls}}- {{{this}}}
{{/each}}
{{else}}
- No ungrouped URLs to organize.
{{/if}}

Existing Tab Groups (for context and potential additions):
{{#if existingGroups.length}}
{{#each existingGroups}}
- Group Name: {{{groupName}}}{{#if isCustom}} (Custom Group){{/if}}
  Tabs (URLs):
  {{#each tabUrls}}  - {{{this}}}
  {{/each}}
{{/each}}
{{else}}
- No existing groups provided.
{{/if}}

{{#if targetLanguage}}
Target language for new group names: {{{targetLanguage}}}
{{/if}}
`,
});

const suggestTabGroupsFlow = ai.defineFlow(
  {
    name: 'suggestTabGroupsFlow',
    inputSchema: SuggestTabGroupsInputSchema,
    outputSchema: SuggestTabGroupsOutputSchema,
  },
  async input => {
    if (!input.ungroupedUrls || input.ungroupedUrls.length === 0) {
      return []; // No ungrouped tabs to process
    }
    const {output} = await prompt(input);
    return output!;
  }
);

