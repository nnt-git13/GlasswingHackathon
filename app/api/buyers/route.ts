import { NextResponse } from 'next/server';
import { aggregateFindings } from '@/lib/agent/aggregate';
import { buyerPersonas, defaultGoals } from '@/lib/agent/personas';
import type { BuyerPersona, IntakeContext } from '@/lib/agent/contracts';
import { runAgentScan } from '@/lib/agent/loop';
import { STOREFRONT_ORIGIN } from '@/lib/agent/storefront';
import { defaultProviderId, listProviders } from '@/lib/ai/providers';

const depthCaps: Record<string, number> = { Quick: 3, Standard: 6, Deep: 12 };

// Buyer-swarm orchestrator. Fans a shared context out to multiple buyer
// personas running concurrently, then aggregates their results. Each persona
// is one buyer agent; wire them to distinct LLMs without changing this shape.
export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    context?: IntakeContext;
    provider?: string;
  };
  const provider = body.provider || defaultProviderId;
  const context = body.context;
  const personas = context?.personas?.length ? context.personas : buyerPersonas;
  const goals = context?.goals?.length ? context.goals : defaultGoals;
  const storefrontUrl = context?.storefrontUrl || STOREFRONT_ORIGIN;
  const maxJobs = depthCaps[context?.depth ?? 'Standard'] ?? 6;

  const jobs: { persona: BuyerPersona; goal: string }[] = [];
  outer: for (const persona of personas) {
    for (const goal of goals) {
      jobs.push({ persona, goal });
      if (jobs.length >= maxJobs) break outer;
    }
  }

  const results = await Promise.all(
    jobs.map((job) => runAgentScan(job.goal, job.persona.name, provider, storefrontUrl)),
  );
  const succeeded = results.filter((result) => result.success).length;
  const providerInfo = listProviders().find((item) => item.id === provider);

  return NextResponse.json({
    provider,
    configured: Boolean(providerInfo?.configured),
    storefront: results[0]?.storefront ?? storefrontUrl,
    mode: results[0]?.mode ?? 'scripted',
    model: results[0]?.model ?? null,
    goalCount: results.length,
    succeeded,
    failed: results.length - succeeded,
    personas,
    results,
    findings: aggregateFindings(results),
  });
}