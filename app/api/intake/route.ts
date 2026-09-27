import { NextResponse } from 'next/server';
import { buildIntakeContext } from '@/lib/agent/intake';
import type { ScanConfig } from '@/lib/agent/contracts';

// Intake stage. Replace the body of buildIntakeContext with an intake LLM
// later; the response contract (IntakeContext) stays identical.
export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    query?: string;
    config?: ScanConfig;
  };
  const context = await buildIntakeContext(String(body.query ?? ''), body.config);
  return NextResponse.json(context);
}