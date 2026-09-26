import { NextResponse } from 'next/server';
import { defaultProviderId, listProviders } from '@/lib/ai/providers';
import { runAgentScan } from '@/lib/agent/loop';
import { agentTools } from '@/lib/agent/tools';
import { STOREFRONT_ORIGIN } from '@/lib/agent/storefront';

const defaultGoals = [
  'Find a hiking backpack under $250 and buy the best-rated option',
  'Order the Summit Trail 45L backpack in Forest, 45L capacity',
  'Buy an insulated jacket under $180',
];

export async function GET() {
  return NextResponse.json({
    providers: listProviders(),
    defaultProvider: defaultProviderId,
    storefront: STOREFRONT_ORIGIN,
    tools: agentTools.map((tool) => tool.function.name),
    defaultGoals,
  });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    goals?: string[];
    agentName?: string;
    provider?: string;
    storefrontUrl?: string;
  };
  const goals = Array.isArray(body.goals) && body.goals.length ? body.goals.slice(0, 6) : defaultGoals;
  const agentName = body.agentName || 'Gateway Test Agent';
  const provider = body.provider || defaultProviderId;
  const storefrontUrl = body.storefrontUrl || STOREFRONT_ORIGIN;
  const results = [];
  for (const goal of goals) {
    results.push(await runAgentScan(goal, agentName, provider, storefrontUrl));
  }
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
    results,
  });
}