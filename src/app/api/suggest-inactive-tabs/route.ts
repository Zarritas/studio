// src/app/api/suggest-inactive-tabs/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { suggestInactiveTabsClosure, type SuggestInactiveTabsClosureInput, type SuggestInactiveTabsClosureOutput } from '@/ai/flows/suggest-inactive-tabs-closure';

export async function POST(request: NextRequest) {
  try {
    const input = (await request.json()) as SuggestInactiveTabsClosureInput;
    const output: SuggestInactiveTabsClosureOutput = await suggestInactiveTabsClosure(input);
    return NextResponse.json(output);
  } catch (error: any) {
    console.error("Error in /api/suggest-inactive-tabs:", error.message, error.stack);
    return NextResponse.json(
      { error: error.message || 'Failed to suggest inactive tabs closure', details: error.details || error.stack },
      { status: 500 }
    );
  }
}
