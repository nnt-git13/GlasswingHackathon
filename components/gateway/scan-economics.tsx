'use client';
import { Card, CardHeader, StatusBadge } from '@/components/ui/primitives';
import { formatCost } from '@/lib/gateway/client';
import type { ModelCall, Scan } from '@/lib/gateway/schemas';

// TODO(human): set the manual-QA baseline this comparison is measured against.
// Leave both at 0 to hide the comparison until you have numbers you can source.
const MANUAL_QA_BASELINE = {
  minutesPerScenario: 0,
  loadedHourlyRateUsd: 0,
};

// scan.modelCalls already holds the draft's planning calls plus every session
// call (service.ts seeds it from the draft, then pushes each session call to
// both). Summing session.modelCalls on top of it would double count.
function tokenTotals(calls: ModelCall[]) {
  return {
    inputTokens: calls.reduce((sum, call) => sum + call.inputTokens, 0),
    outputTokens: calls.reduce((sum, call) => sum + call.outputTokens, 0),
    estimatedCostUsd:
      calls.length && calls.every((call) => call.estimatedCostUsd !== null)
        ? calls.reduce((sum, call) => sum + call.estimatedCostUsd!, 0)
        : null,
  };
}

function costBasis(calls: ModelCall[]): ModelCall['costBasis'] | 'none' {
  if (!calls.length) return 'none';
  const bases = new Set(calls.map((call) => call.costBasis));
  if (bases.has('unavailable_usage')) return 'unavailable_usage';
  if (bases.has('not_configured')) return 'not_configured';
  if (bases.has('configured_rates')) return 'configured_rates';
  return 'fixture';
}

const basisLabel: Record<ModelCall['costBasis'] | 'none', string> = {
  configured_rates: 'Measured · configured rates',
  not_configured: 'Rates not configured',
  unavailable_usage: 'Provider did not report usage',
  fixture: 'Fixture run · no spend',
  none: 'No model calls recorded',
};

function formatDuration(ms: number) {
  if (!Number.isFinite(ms) || ms < 0) return '—';
  const seconds = Math.round(ms / 1000);
  return seconds < 60 ? `${seconds}s` : `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}

export function ScanEconomics({ scan }: { scan: Scan }) {
  const totals = tokenTotals(scan.modelCalls);
  const basis = costBasis(scan.modelCalls);
  const finished = scan.sessions.filter(
    (session) => !['queued', 'running'].includes(session.status),
  ).length;
  const elapsedMs = scan.startedAt
    ? new Date(scan.completedAt || Date.now()).getTime() - new Date(scan.startedAt).getTime()
    : 0;
  const costPerSession =
    totals.estimatedCostUsd !== null && finished > 0 ? totals.estimatedCostUsd / finished : null;

  const baselineSet =
    MANUAL_QA_BASELINE.minutesPerScenario > 0 && MANUAL_QA_BASELINE.loadedHourlyRateUsd > 0;
  const baselineMinutes = scan.sessions.length * MANUAL_QA_BASELINE.minutesPerScenario;
  const baselineCost = (baselineMinutes / 60) * MANUAL_QA_BASELINE.loadedHourlyRateUsd;

  return (
    <Card>
      <CardHeader
        title="Scan economics"
        subtitle="Session progress, elapsed time, and model usage for this run."
        action={
          <StatusBadge
            tone={
              basis === 'configured_rates' ? 'green' : basis === 'fixture' ? 'amber' : 'neutral'
            }
          >
            {basisLabel[basis]}
          </StatusBadge>
        }
      />
      <div className="gateway-panel">
        <div className="economics-grid">
          <div className="economics-stat">
            <span>Sessions run</span>
            <strong>
              {finished}
              <small> / {scan.sessions.length}</small>
            </strong>
          </div>
          <div className="economics-stat">
            <span>Wall clock</span>
            <strong>{formatDuration(elapsedMs)}</strong>
          </div>
          <div className="economics-stat">
            <span>Tokens in / out</span>
            <strong>
              {totals.inputTokens.toLocaleString()}
              <small> / {totals.outputTokens.toLocaleString()}</small>
            </strong>
          </div>
          <div className="economics-stat">
            <span>Model calls</span>
            <strong>{scan.modelCalls.length}</strong>
          </div>
          {totals.estimatedCostUsd !== null && (
            <div className="economics-stat highlight">
              <span>Total cost</span>
              <strong>{formatCost(totals.estimatedCostUsd)}</strong>
            </div>
          )}
          {costPerSession !== null && (
            <div className="economics-stat highlight">
              <span>Cost per session</span>
              <strong>{formatCost(costPerSession)}</strong>
            </div>
          )}
        </div>
        {baselineSet && (
          <div className="economics-baseline">
            <h3>Compared with a manual QA pass</h3>
            <div className="economics-compare">
              <div>
                <span>Manual</span>
                <strong>
                  {formatDuration(baselineMinutes * 60_000)} · ${baselineCost.toFixed(2)}
                </strong>
                <small>
                  {scan.sessions.length} scenarios × {MANUAL_QA_BASELINE.minutesPerScenario} min at
                  ${MANUAL_QA_BASELINE.loadedHourlyRateUsd}/hr loaded
                </small>
              </div>
              <div>
                <span>Gateway</span>
                <strong>
                  {formatDuration(elapsedMs)} · {formatCost(totals.estimatedCostUsd)}
                </strong>
                <small>Runs per deploy rather than per quarter.</small>
              </div>
            </div>
          </div>
        )}
        <p className="economics-note">
          {totals.estimatedCostUsd === null
            ? 'Cost metrics appear when model pricing and token usage are available.'
            : 'Cost is calculated from recorded token usage and configured model rates.'}
        </p>
      </div>
    </Card>
  );
}
