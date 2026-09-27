import { test, expect } from '@playwright/test';
import { runReport, reportDuration } from '../../lib/gateway/run-report';
import type { Scan } from '../../lib/gateway/schemas';

function journey(disposition: string, currency = 'USD', price = 779, duration = 20000) {
  return {
    startedAt: '2026-09-27T15:00:00Z',
    scenario: {
      hardConstraints: [
        { kind: 'max_price', value: '800' },
        { kind: 'currency', value: 'USD' },
      ],
    },
    evaluation: { outcome: 'passed' },
    trace: [
      {
        status: 'observed',
        observation: {
          id: 'product',
          kind: 'product',
          url: 'https://example.com/ski',
          products: [{ name: 'Ski', price, currency }],
        },
      },
      { status: 'executed', action: { type: 'inspect_product' } },
      { status: 'blocked', action: { type: 'add_to_cart' } },
      {
        status: 'executed',
        timestamp: new Date(Date.parse('2026-09-27T15:00:00Z') + duration).toISOString(),
        action: {
          type: 'stop',
          disposition,
          productObservationId: disposition === 'recommend' ? 'product' : null,
        },
      },
    ],
  };
}
test('reports decisions and comparable budgets without treating declines as purchases', () => {
  const report = runReport({
    sessions: [
      journey('recommend'),
      journey('decline', 'USD', 779, 10000),
      journey('recommend', 'CAD', 700, 30000),
    ],
  } as unknown as Scan);
  expect(report.recommendations).toHaveLength(2);
  expect(report.verifiedDeclines).toBe(1);
  expect(report.medianDecisionMs).toBe(20000);
  expect(report.medianPages).toBe(1);
  expect(report.browsingActions).toBe(3);
  expect(report.blockedActions).toBe(3);
  expect(report.budgetChecks).toBe(1);
  expect(report.budgetsMet).toBe(1);
  expect(report.recommendations[0].budgetHeadroom).toBe(21);
  expect(report.recommendations[1].budgetHeadroom).toBeNull();
});
test('keeps missing decisions and failed budget constraints visible', () => {
  const unfinished = journey('recommend');
  unfinished.trace.pop();
  const report = runReport({
    sessions: [unfinished, journey('recommend', 'USD', 850)],
  } as unknown as Scan);
  expect(report.decisionCount).toBe(1);
  expect(report.budgetChecks).toBe(1);
  expect(report.budgetsMet).toBe(0);
  expect(report.recommendations[0].budgetHeadroom).toBe(-50);
  expect(runReport({ sessions: [] } as unknown as Scan).medianDecisionMs).toBeNull();
  expect(reportDuration(null)).toBe('—');
  expect(reportDuration(65000)).toBe('1m 5s');
});
