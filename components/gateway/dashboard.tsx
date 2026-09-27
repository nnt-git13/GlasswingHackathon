'use client';
import { useState } from 'react';
import Link from 'next/link';
import {
  Activity,
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  FileSearch,
  Globe2,
  Layers3,
  RefreshCw,
  ShieldAlert,
  ShoppingBag,
  UsersRound,
} from 'lucide-react';
import { QuantitativeOverview } from './quantitative-overview';
import { runReport, reportDuration } from '@/lib/gateway/run-report';
import { PageHeading } from '@/components/ui/page-heading';
import { Button, Card, CardHeader, EmptyState, StatusBadge } from '@/components/ui/primitives';
import { formatTime } from '@/lib/gateway/client';
import type { Scan } from '@/lib/gateway/schemas';
import { useGateway } from './provider';
import { ErrorNotice, FixtureBadge, OutcomeBadge, useGatewayData } from './shared';
import styles from './overview.module.css';

export function GatewayDashboard() {
  const { dashboard, loading, error, refresh, activeScan } = useGateway();
  const [filter, setFilter] = useState('all');
  const latestId = dashboard?.readiness.scanId;
  const detail = useGatewayData<Scan>(latestId ? `/scans/${latestId}` : null, dashboard);
  const scan =
    activeScan?.id === latestId ? activeScan : detail.data?.id === latestId ? detail.data : null;
  const readiness = dashboard?.readiness;
  const report = scan ? runReport(scan) : null;
  const running =
    activeScan && ['running', 'queued'].includes(activeScan.status) ? activeScan : null;
  const findings = [...(scan?.findings || [])].sort(
    (a, b) =>
      ({ high: 0, medium: 1, info: 2 })[a.severity] - { high: 0, medium: 1, info: 2 }[b.severity],
  );
  const sessions = scan?.sessions || [];
  const troubled = sessions.find((s) => s.error || s.evaluation?.outcome === 'failed');
  const uncertain = sessions.find((s) => s.evaluation?.outcome === 'inconclusive');
  const target = troubled || uncertain;
  const nextStep = running
    ? {
        title: 'Watch your shoppers in the store',
        body: 'A scan is still running. Follow its recorded actions before assessing the final outcomes.',
        label: 'Observe live run',
        href: `/scan?scanId=${running.id}`,
      }
    : troubled?.error
      ? {
          title: 'Recover the interrupted shopping test',
          body: troubled.error.message,
          label: 'Review plan & rerun',
          href: `/discover?draft=${scan?.draft.id}`,
        }
      : troubled
        ? {
            title: 'Inspect the goal that failed',
            body:
              troubled.evaluation?.semantic.reason ||
              'Review the recorded shopper evidence and the constraints it could not satisfy.',
            label: 'Inspect shopper evidence',
            href: `/replays/${troubled.id}`,
          }
        : uncertain
          ? {
              title: 'Resolve the missing evidence',
              body:
                uncertain.evaluation?.semantic.reason ||
                'Some shopping outcomes could not be verified. Check the observations before treating them as successes or failures.',
              label: 'Review uncertain outcome',
              href: `/replays/${uncertain.id}`,
            }
          : latestId && !scan
            ? {
                title: 'Inspect the latest recorded run',
                body: 'Open the saved scan to review its shopper decisions, observations, and independently evaluated results.',
                label: 'Open latest run',
                href: `/scan?scanId=${latestId}`,
              }
            : {
                title: sessions.length ? 'Broaden your next test' : 'Build your first test plan',
                body: sessions.length
                  ? 'Review what this run covered, then add new shopping goals or constraints to test a wider range of journeys.'
                  : 'Inspect your storefront, review the suggested shoppers and goals, and approve a run.',
                label: sessions.length ? 'Review plan & rerun' : 'Inspect a storefront',
                href: scan ? `/discover?draft=${scan.draft.id}` : '/discover',
              };
  const visibleSessions = sessions.filter(
    (s) => filter === 'all' || (s.evaluation?.outcome || s.status) === filter,
  );
  const measured = (readiness?.passed || 0) + (readiness?.failed || 0);
  const confidence = readiness?.sessionCount
    ? Math.round((measured / readiness.sessionCount) * 100)
    : 0;
  return (
    <>
      <PageHeading
        title="Storefront testing overview"
        subtitle="Understand the latest run, inspect shopper decisions, and decide what to improve next."
        action={
          <div className="gateway-toolbar">
            <Button variant="outline" onClick={() => void refresh()}>
              <RefreshCw size={14} />
              Refresh
            </Button>
            <Button asChild>
              <Link href="/discover">
                New storefront scan <ArrowUpRight size={14} />
              </Link>
            </Button>
          </div>
        }
      />
      <ErrorNotice message={error} retry={() => void refresh()} />
      {loading && !dashboard && (
        <div className={styles.loading} role="status">
          Loading your recorded storefront results…
        </div>
      )}
      {dashboard && readiness && (
        <div className={styles.overview}>
          {running && (
            <Link className={styles.liveBanner} href={`/scan?scanId=${running.id}`}>
              <Activity size={18} />
              <div>
                <strong>Shopper scan in progress</strong>
                <span>
                  {new URL(running.draft.merchantUrl).hostname} ·{' '}
                  {running.sessions.filter((s) => !['queued', 'running'].includes(s.status)).length}{' '}
                  of {running.sessions.length} shoppers finished
                </span>
              </div>
              <span>
                Observe live run <ArrowUpRight size={14} />
              </span>
            </Link>
          )}
          <div className={styles.topGrid}>
            <Card className={`readiness-overview ${styles.hero}`}>
              <div className={styles.heroHeading}>
                <div>
                  <span className={styles.eyebrow}>LATEST STOREFRONT RESULTS</span>
                  <h2>Agent readiness overview</h2>
                </div>
                {readiness.scanId && <FixtureBadge fixture={readiness.fixture} />}
              </div>
              <div className={styles.heroBody}>
                <div>
                  <h3>
                    {!readiness.scanId
                      ? 'Ready for your first scan'
                      : !measured
                        ? 'More evidence needed'
                        : readiness.failed
                          ? `${readiness.failed} shopping ${readiness.failed === 1 ? 'goal needs' : 'goals need'} attention`
                          : readiness.inconclusive
                            ? 'Passing goals, with evidence gaps'
                            : report
                              ? `${report.recommendations.length} products recommended · ${report.declines.length} requests declined`
                              : 'Tested shopping goals passed'}
                  </h3>
                  <p>
                    {readiness.scanId
                      ? `${readiness.passed} of ${measured} conclusive goals passed. ${readiness.inconclusive} inconclusive and ${readiness.unevaluated} unevaluated outcomes remain separate.`
                      : 'Turn a storefront into a reviewed test plan, then watch shoppers attempt real goals.'}
                  </p>
                  <div className={styles.outcomes}>
                    <span data-tone="green">
                      <CheckCircle2 size={13} />
                      {readiness.passed} passed
                    </span>
                    <span data-tone="red">
                      <ShieldAlert size={13} />
                      {readiness.failed} failed
                    </span>
                    <span>
                      <Clock3 size={13} />
                      {readiness.inconclusive} inconclusive
                    </span>
                  </div>
                </div>
              </div>
              {report && (
                <>
                  <div className={styles.runMetrics}>
                    {[
                      {
                        label: 'Median time to decision',
                        value: reportDuration(report.medianDecisionMs),
                        detail: `${report.decisionCount} recorded decisions · excludes evaluation`,
                      },
                      {
                        label: 'Pages per decision',
                        value: report.medianPages ?? '—',
                        detail: 'Median recorded page observations',
                      },
                      {
                        label: 'Browser actions',
                        value: report.browsingActions,
                        detail: `${report.blockedActions} blocked attempts · excludes stop actions`,
                      },
                      {
                        label: 'Recommendations within budget',
                        value: report.budgetChecks
                          ? `${report.budgetsMet} / ${report.budgetChecks}`
                          : '—',
                        detail: 'Known prices with matching budget currency',
                      },
                    ].map((metric) => (
                      <div key={metric.label}>
                        <span>{metric.label}</span>
                        <strong>{metric.value}</strong>
                        <small>{metric.detail}</small>
                      </div>
                    ))}
                  </div>
                  {report.recommendations.some((j) => j.product) && (
                    <div className={styles.selections}>
                      <h3>Products shoppers selected</h3>
                      {report.recommendations
                        .filter((j) => j.product)
                        .map((j) => {
                          const money = (value: number) => {
                            try {
                              return new Intl.NumberFormat('en-US', {
                                style: 'currency',
                                currency: j.product!.currency || 'USD',
                                maximumFractionDigits: 2,
                              }).format(value);
                            } catch {
                              return `${value.toFixed(2)} ${j.product!.currency || ''}`;
                            }
                          };
                          return (
                            <Link
                              key={j.session.id}
                              href={`/replays/${j.session.id}`}
                              className={styles.selection}
                            >
                              <ShoppingBag size={18} />
                              <div>
                                <strong>{j.product!.name}</strong>
                                <span>
                                  {j.session.archetype.name} ·{' '}
                                  {j.session.evaluation?.outcome || 'Awaiting evaluation'}
                                </span>
                              </div>
                              <div>
                                {j.product!.price !== null && (
                                  <strong>
                                    {j.product!.currency
                                      ? money(j.product!.price)
                                      : `${j.product!.price} (currency unknown)`}
                                  </strong>
                                )}
                                <span>
                                  {j.budgetHeadroom !== null
                                    ? `${money(Math.abs(j.budgetHeadroom))} ${j.budgetHeadroom >= 0 ? 'under' : 'over'} budget`
                                    : 'Budget comparison unavailable'}
                                </span>
                              </div>
                              <ArrowUpRight size={14} />
                            </Link>
                          );
                        })}
                    </div>
                  )}
                </>
              )}
              <div className={styles.evaluationCoverage}>
                <div>
                  <span>Conclusive evaluation coverage</span>
                  <strong>
                    {measured} / {readiness.sessionCount} goals · {confidence}%
                  </strong>
                </div>
                <div className={styles.coverageTrack}>
                  <span style={{ width: `${confidence}%` }} />
                </div>
                <p>
                  Passed goals include valid recommendations and correct declines. These are tested
                  outcomes, not purchases or a storefront-wide score.
                </p>
              </div>
              <div className={styles.heroFooter}>
                <span>
                  <Globe2 size={13} />
                  {readiness.merchantUrl
                    ? new URL(readiness.merchantUrl).hostname
                    : 'No storefront tested'}
                  <small>{readiness.environmentId}</small>
                </span>
                {readiness.scanId && (
                  <Link href={`/scan?scanId=${readiness.scanId}`}>
                    View supporting scan <ArrowUpRight size={13} />
                  </Link>
                )}
              </div>
            </Card>
            <Card className={styles.nextStep}>
              <span className={styles.nextIcon}>
                <FileSearch size={22} />
              </span>
              <span className={styles.eyebrow}>RECOMMENDED NEXT STEP</span>
              <h2>{nextStep.title}</h2>
              <p>{nextStep.body}</p>
              {target && <span className={styles.targetShopper}>{target.archetype.name}</span>}
              <Button asChild>
                <Link href={nextStep.href}>
                  {nextStep.label}
                  <ArrowUpRight size={14} />
                </Link>
              </Button>
            </Card>
          </div>
          <div className={styles.scopeStats}>
            {[
              {
                icon: UsersRound,
                label: 'Shopper sessions',
                value: readiness.sessionCount,
                detail: `${readiness.archetypes} behavioral archetypes`,
              },
              {
                icon: Layers3,
                label: 'Pages observed',
                value: readiness.pagesObserved,
                detail: 'Unique sampled page URLs',
              },
              {
                icon: ShoppingBag,
                label: 'Product records',
                value: readiness.productsObserved,
                detail: 'Distinct observed products & variants',
              },
              {
                icon: ShieldAlert,
                label: 'Recorded findings',
                value: scan
                  ? findings.length
                  : dashboard.scans.find((s) => s.id === latestId)?.findingCount || 0,
                detail: 'Linked to shopper evidence',
              },
            ].map(({ icon: Icon, label, value, detail }) => (
              <div key={label}>
                <Icon size={18} />
                <span>{label}</span>
                <strong>{value}</strong>
                <small>{detail}</small>
              </div>
            ))}
          </div>
          <ErrorNotice message={detail.error} retry={detail.reload} />
          <div className={styles.workGrid}>
            <Card className={styles.sessionPanel}>
              <CardHeader
                title="Shopper outcomes"
                subtitle="Latest run · goals, decisions, and the evidence behind each result."
                action={
                  <Link className="text-link" href="/sessions">
                    Browse sessions →
                  </Link>
                }
              />
              <div className={styles.filters} role="group" aria-label="Filter shopper outcomes">
                {[
                  ['all', 'All'],
                  ['passed', 'Passed'],
                  ['failed', 'Failed'],
                  ['inconclusive', 'Inconclusive'],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    aria-pressed={filter === value}
                    onClick={() => setFilter(value)}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {detail.loading && !scan ? (
                <p className="gateway-panel" role="status">
                  Loading shopper evidence…
                </p>
              ) : visibleSessions.length ? (
                <div className={styles.shoppers}>
                  {visibleSessions.map((session) => (
                    <article key={session.id}>
                      <div className={styles.shopperTitle}>
                        <span className={styles.avatar}>
                          <UsersRound size={17} />
                        </span>
                        <div>
                          <strong>{session.archetype.name}</strong>
                          <small>
                            {session.scenario.mode === 'red_team'
                              ? 'Boundary check'
                              : session.scenario.mode === 'constraint'
                                ? 'Constraint check'
                                : 'Everyday shopping'}
                          </small>
                        </div>
                        <OutcomeBadge session={session} />
                      </div>
                      <p className={styles.goal}>{session.scenario.goal}</p>
                      <p className={styles.shopperReason}>
                        {session.error?.message ||
                          session.evaluation?.semantic.reason ||
                          session.trace.at(-1)?.detail ||
                          'Waiting for this shopper to run.'}
                      </p>
                      <div className={styles.shopperFooter}>
                        <span>
                          {session.trace.length} recorded events ·{' '}
                          {session.trace.filter((e) => e.observation).length} observations
                        </span>
                        <Link href={`/replays/${session.id}`}>
                          Inspect shopper <ArrowUpRight size={12} />
                        </Link>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <EmptyState
                  title={scan ? 'No shoppers match this filter' : 'No shopper results yet'}
                  description={
                    scan
                      ? 'Choose another outcome to inspect the run.'
                      : 'Approve and run a test plan to see shopper journeys here.'
                  }
                />
              )}
            </Card>
            <Card className={styles.attention}>
              <CardHeader
                title="Needs attention"
                subtitle="Latest run · recorded failures and evidence gaps."
                action={
                  <Link className="text-link" href="/recommendations">
                    All findings →
                  </Link>
                }
              />
              {findings.length ? (
                findings.slice(0, 5).map((finding) => (
                  <article className={styles.finding} key={finding.id}>
                    <div>
                      <StatusBadge tone={finding.severity === 'high' ? 'red' : 'amber'}>
                        {finding.severity}
                      </StatusBadge>
                      <span>
                        {finding.category === 'uncertainty'
                          ? 'Evidence gap'
                          : finding.category === 'boundary'
                            ? 'Action boundary'
                            : finding.category === 'execution'
                              ? 'Execution issue'
                              : 'Goal satisfaction'}
                      </span>
                    </div>
                    <h3>{finding.title}</h3>
                    <p>{finding.summary}</p>
                    <Link
                      href={`/replays/${finding.sessionId}${finding.evidenceIds[0] ? `?evidence=${encodeURIComponent(finding.evidenceIds[0])}` : ''}`}
                    >
                      Open supporting evidence <ArrowUpRight size={12} />
                    </Link>
                  </article>
                ))
              ) : (
                <div className={styles.clearState}>
                  <CheckCircle2 size={27} />
                  <h3>
                    {!scan
                      ? 'Findings appear after evaluation'
                      : scan.status === 'running' || scan.status === 'queued'
                        ? 'Evaluations are still in progress'
                        : 'No findings recorded in this run'}
                  </h3>
                  <p>
                    {scan
                      ? 'Review the outcome and coverage of each shopper before drawing conclusions about the whole store.'
                      : 'Issues will link directly to the shopper and page observation that support them.'}
                  </p>
                </div>
              )}
            </Card>
          </div>
          <QuantitativeOverview data={readiness} hideSummary />
          <Card className={styles.history}>
            <CardHeader
              title="Scan history"
              subtitle={`${dashboard.totalScans} saved runs · open a run to inspect its shoppers and findings.`}
            />
            {dashboard.scans.length ? (
              <div className="gateway-table-wrap">
                <table className="gateway-table">
                  <thead>
                    <tr>
                      <th>Storefront / environment</th>
                      <th>Recorded</th>
                      <th>Execution</th>
                      <th>Shopper outcomes</th>
                      <th>Findings</th>
                      <th>Results</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboard.scans.map((run) => (
                      <tr key={run.id}>
                        <td>
                          <strong>{new URL(run.merchantUrl).hostname}</strong>
                          <small>
                            {run.environmentId}
                            {run.fixture ? ' · Fixture' : ''}
                          </small>
                        </td>
                        <td>{formatTime(run.createdAt)}</td>
                        <td>
                          <StatusBadge>{run.status}</StatusBadge>
                        </td>
                        <td>
                          <div className={styles.historyOutcomes}>
                            <span>{run.passed} passed</span>
                            <span>{run.failed} failed</span>
                            <span>{run.inconclusive} inconclusive</span>
                          </div>
                        </td>
                        <td>{run.findingCount}</td>
                        <td>
                          <Link className="text-link" href={`/scan?scanId=${run.id}`}>
                            View scan
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState
                title="No scans yet"
                description="Inspect a configured storefront and approve its test plan to begin."
                action={
                  <Button asChild>
                    <Link href="/discover">Inspect a storefront</Link>
                  </Button>
                }
              />
            )}
          </Card>
          <p className={styles.scopeNote}>
            Results describe sampled shopping journeys. Optional checkout tests stop before payment.
            These metrics do not measure completed purchases or prove whole-catalog coverage.{' '}
            {readiness.fixture ? 'This selected run uses development fixtures.' : ''}
          </p>
        </div>
      )}
    </>
  );
}
