import type { Scan } from './schemas';

function median(values: number[]) {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (!sorted.length) return null;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}
export function runReport(scan: Scan) {
  const journeys = scan.sessions.map((session) => {
    const stop = session.trace.findLast(
      (event) => event.status === 'executed' && event.action?.type === 'stop',
    );
    const observation = session.trace.find(
      (event) => event.observation?.id === stop?.action?.productObservationId,
    )?.observation;
    const product =
      observation?.kind === 'product' && observation.products.length === 1
        ? observation.products[0]
        : null;
    const budgets = session.scenario.hardConstraints
      .filter((c) => c.kind === 'max_price' && c.value.trim() !== '')
      .map((c) => Number(c.value))
      .filter((n) => Number.isFinite(n) && n >= 0);
    const budget = budgets.length ? Math.min(...budgets) : null;
    const currencies = session.scenario.hardConstraints
      .filter((c) => c.kind === 'currency')
      .map((c) => c.value.toUpperCase());
    const priceComparable =
      !!product?.currency &&
      currencies.length > 0 &&
      currencies.every((c) => c === product.currency?.toUpperCase());
    const decisionMs =
      stop && session.startedAt ? Date.parse(stop.timestamp) - Date.parse(session.startedAt) : null;
    return {
      session,
      disposition: stop?.action?.disposition || null,
      product,
      productUrl: observation?.url || null,
      budget,
      budgetHeadroom:
        product?.price != null && budget !== null && priceComparable
          ? budget - product.price
          : null,
      decisionMs:
        decisionMs !== null && Number.isFinite(decisionMs) && decisionMs >= 0 ? decisionMs : null,
      pages: session.trace.filter((event) => event.observation).length,
      actions: session.trace.filter(
        (event) => event.status === 'executed' && event.action && event.action.type !== 'stop',
      ).length,
      blocked: session.trace.filter((event) => event.status === 'blocked').length,
    };
  });
  const recommendations = journeys.filter((j) => j.disposition === 'recommend');
  const declines = journeys.filter((j) => j.disposition === 'decline');
  const budgetChecks = recommendations.filter((j) => j.budgetHeadroom !== null);
  return {
    journeys,
    recommendations,
    declines,
    verifiedRecommendations: recommendations.filter(
      (j) => j.session.evaluation?.outcome === 'passed',
    ).length,
    verifiedDeclines: declines.filter((j) => j.session.evaluation?.outcome === 'passed').length,
    decisionCount: journeys.filter((j) => j.decisionMs !== null).length,
    medianDecisionMs: median(
      journeys.flatMap((j) => (j.decisionMs === null ? [] : [j.decisionMs])),
    ),
    medianPages: median(journeys.filter((j) => j.disposition).map((j) => j.pages)),
    browsingActions: journeys.reduce((sum, j) => sum + j.actions, 0),
    blockedActions: journeys.reduce((sum, j) => sum + j.blocked, 0),
    budgetChecks: budgetChecks.length,
    budgetsMet: budgetChecks.filter((j) => j.budgetHeadroom! >= 0).length,
  };
}
export function reportDuration(ms: number | null) {
  if (ms === null) return '—';
  const seconds = Math.round(ms / 1000);
  return seconds < 60 ? `${seconds}s` : `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}
