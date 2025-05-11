// src/app/api/suggest-tab-groups/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { suggestTabGroups, type SuggestTabGroupsInput, type SuggestTabGroupsOutput } from '@/ai/flows/suggest-tab-groups';

export async function POST(request: NextRequest) {
  try {
    const input = (await request.json()) as SuggestTabGroupsInput;
    // Ensure that the AI flow itself handles potential errors gracefully or this try-catch will catch them.
    const output: SuggestTabGroupsOutput = await suggestTabGroups(input);
    return NextResponse.json(output);
  } catch (error: any) {
    console.error("Error in /api/suggest-tab-groups:", error.message, error.stack);
    return NextResponse.json(
      { error: error.message || 'Failed to suggest tab groups', details: error.details || error.stack },
      { status: 500 }
    );
  }
}
