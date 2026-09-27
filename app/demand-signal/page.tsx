'use client';
import Link from 'next/link';
import { useState } from 'react';
import { PageHeading } from '@/components/ui/page-heading';
import { Button, Card, CardHeader, EmptyState, StatusBadge } from '@/components/ui/primitives';
import { useGateway, useStorefrontContext } from '@/components/gateway/provider';
import {
  ErrorNotice,
  FixtureBadge,
  OutcomeBadge,
  useGatewayData,
} from '@/components/gateway/shared';
import type { Scan } from '@/lib/gateway/schemas';
import { runReport, reportDuration } from '@/lib/gateway/run-report';
import { ArrowUpRight, Globe2, RefreshCw, ShoppingBag, UsersRound } from 'lucide-react';
import styles from './demand.module.css';
import { NewProductAssessment } from '@/components/demand-signal/new-product';

export default function DemandSignalPage() {
  const { dashboard, activeScan, loading, error, refresh } = useGateway();
  const { hostname, environmentId, scanId } = useStorefrontContext();
  const detail = useGatewayData<Scan>(scanId ? `/scans/${scanId}` : null, dashboard);
  const scan =
    activeScan?.id === scanId && ['running', 'queued'].includes(activeScan.status)
      ? activeScan
      : detail.data?.id === scanId
        ? detail.data
        : activeScan?.id === scanId
          ? activeScan
          : null;
  const report = scan ? runReport(scan) : null;
  const [filter, setFilter] = useState('all');
  const visible =
    report?.journeys.filter(
      (j) => filter === 'all' || (j.disposition || 'unresolved') === filter,
    ) || [];
  const products = new Map<
    string,
    {
      name: string;
      price: number | null;
      currency: string | null;
      shoppers: string[];
      sessionId: string;
    }
  >();
  for (const journey of report?.recommendations || []) {
    if (!journey.product) continue;
    const key = `${journey.productUrl}|${journey.product.name}|${journey.product.currency}|${journey.product.price}`;
    const current = products.get(key);
    if (current) current.shoppers.push(journey.session.archetype.name);
    else
      products.set(key, {
        ...journey.product,
        shoppers: [journey.session.archetype.name],
        sessionId: journey.session.id,
      });
  }
  const priceLabel = (price: number | null, currency: string | null) => {
    if (price === null) return 'Price not recorded';
    if (!currency) return `${price} · currency not recorded`;
    try {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(price);
    } catch {
      return `${price} ${currency}`;
    }
  };
  return (
    <>
      <PageHeading
        title="Demand Signal"
        subtitle="Test product appeal and pricing using your current storefront’s shopper context."
        action={
          <div className="gateway-toolbar">
            <Button
              variant="outline"
              onClick={() => {
                void refresh();
                detail.reload();
              }}
            >
              <RefreshCw size={14} />
              Refresh
            </Button>
            <Button asChild>
              <Link href="/discover">
                Test more shoppers <ArrowUpRight size={14} />
              </Link>
            </Button>
          </div>
        }
      />
      <ErrorNotice
        message={error || detail.error}
        retry={() => {
          void refresh();
          detail.reload();
        }}
      />
      <div className={styles.page}>
        <div className={styles.context}>
          <Globe2 size={18} />
          <div>
            <strong>{hostname || 'Choose a storefront'}</strong>
            <p>
              {environmentId || 'No test environment selected'}
              {scan ? ` · ${scan.sessions.length} shopper scenarios · ${scan.status} run` : ''}
            </p>
          </div>
          {scan && <FixtureBadge fixture={scan.fixture} />}
        </div>
        {(loading || detail.loading) && !scan ? (
          <p role="status">Loading storefront shopper evidence…</p>
        ) : !scan || !report ? (
          <Card>
            <EmptyState
              title="No storefront demand evidence yet"
              description="Inspect your website and run an approved shopping plan to see product selections and shopper decisions here."
              action={
                <Button asChild>
                  <Link href="/discover">Inspect a storefront</Link>
                </Button>
              }
            />
          </Card>
        ) : (
          <>
            <NewProductAssessment key={scan.id} scan={scan} onSaved={detail.reload} />
            <h2 className={styles.baselineHeading}>Existing storefront evidence</h2>
            <div className={styles.metrics}>
              {[
                {
                  label: 'Product recommendations',
                  value: report.recommendations.length,
                  detail: `${report.verifiedRecommendations} independently passed their goal`,
                },
                {
                  label: 'Requests declined',
                  value: report.declines.length,
                  detail: `${report.verifiedDeclines} independently passed their goal`,
                },
                {
                  label: 'No recorded decision',
                  value:
                    report.journeys.length - report.recommendations.length - report.declines.length,
                  detail: 'Pending or interrupted journeys',
                },
                {
                  label: 'Distinct products selected',
                  value: products.size,
                  detail: 'Recorded recommendation evidence',
                },
              ].map((metric) => (
                <Card className={styles.metric} key={metric.label}>
                  <span>{metric.label}</span>
                  <strong>{metric.value}</strong>
                  <small>{metric.detail}</small>
                </Card>
              ))}
            </div>
            <div className={styles.topGrid}>
              <Card className={styles.concept}>
                <span className={styles.icon}>
                  <ShoppingBag size={24} />
                </span>
                <span className={styles.eyebrow}>OBSERVED PRODUCT INTEREST</span>
                <h2>What shoppers selected</h2>
                <p>
                  Products recommended after shopping your storefront under the reviewed scenario
                  constraints.
                </p>
                <div className={styles.productList}>
                  {[...products.values()].map((product, index) => (
                    <Link
                      href={`/replays/${product.sessionId}`}
                      key={index}
                      className={styles.product}
                    >
                      <strong>{product.name}</strong>
                      <span>
                        {priceLabel(product.price, product.currency)} · {product.shoppers.length}{' '}
                        {product.shoppers.length === 1 ? 'recommendation' : 'recommendations'}
                      </span>
                      <small>{product.shoppers.join(' · ')}</small>
                      <ArrowUpRight size={14} />
                    </Link>
                  ))}
                </div>
                {!products.size && (
                  <small>
                    No recommendation includes a uniquely identified product yet. Inspect the
                    shopper decisions for recorded evidence.
                  </small>
                )}
              </Card>
              <Card className={styles.intent}>
                <CardHeader
                  title="Decision distribution"
                  subtitle="Recorded decisions across this run's shopping scenarios"
                />
                <div className={styles.distribution} aria-label="Shopper decision distribution">
                  {[
                    { count: report.recommendations.length, tone: 'recommend' },
                    { count: report.declines.length, tone: 'decline' },
                    {
                      count:
                        report.journeys.length -
                        report.declines.length -
                        report.recommendations.length,
                      tone: 'unresolved',
                    },
                  ].map((part) => (
                    <span key={part.tone} data-tone={part.tone} style={{ flex: part.count }} />
                  ))}
                </div>
                <div className={styles.legend}>
                  <span>
                    <i data-tone="recommend" />
                    Recommended <strong>{report.recommendations.length}</strong>
                  </span>
                  <span>
                    <i data-tone="decline" />
                    Declined <strong>{report.declines.length}</strong>
                  </span>
                  <span>
                    <i data-tone="unresolved" />
                    Unresolved{' '}
                    <strong>
                      {report.journeys.length -
                        report.declines.length -
                        report.recommendations.length}
                    </strong>
                  </span>
                </div>
                <div className={styles.scope}>
                  <span>
                    <strong>{reportDuration(report.medianDecisionMs)}</strong>median time to
                    decision
                  </span>
                  <span>
                    <strong>
                      {report.budgetChecks ? `${report.budgetsMet} / ${report.budgetChecks}` : '—'}
                    </strong>
                    recommendations within tested budget
                  </span>
                </div>
                <p className={styles.note}>
                  A correct decline can pass a test. These decisions reflect the sampled goals and
                  constraints, not purchase intent or customer conversion rates.
                </p>
              </Card>
            </div>
            <Card className={styles.journeys}>
              <CardHeader
                title="Shopper decisions & constraints"
                subtitle="Real goals, selected products, and reasons recorded in this storefront run."
                action={
                  <StatusBadge tone="blue">
                    {scan.draft.archetypes.length} reviewed profiles
                  </StatusBadge>
                }
              />
              <div role="group" aria-label="Filter demand decisions" className={styles.filters}>
                {[
                  ['all', 'All'],
                  ['recommend', 'Recommended'],
                  ['decline', 'Declined'],
                  ['unresolved', 'Unresolved'],
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
              <div className={styles.journeyGrid}>
                {visible.map((journey) => {
                  const session = journey.session;
                  const stop = session.trace.findLast(
                    (event) => event.status === 'executed' && event.action?.type === 'stop',
                  );
                  return (
                    <article key={session.id} className={styles.journey}>
                      <div className={styles.journeyHeader}>
                        <span className={styles.avatar}>
                          <UsersRound size={18} />
                        </span>
                        <div>
                          <strong>{session.archetype.name}</strong>
                          <small>{session.scenario.mode} scenario</small>
                        </div>
                        <StatusBadge
                          tone={
                            journey.disposition === 'recommend'
                              ? 'green'
                              : journey.disposition === 'decline'
                                ? 'amber'
                                : 'neutral'
                          }
                        >
                          {journey.disposition === 'recommend'
                            ? 'Recommended'
                            : journey.disposition === 'decline'
                              ? 'Declined'
                              : 'No decision'}
                        </StatusBadge>
                      </div>
                      <p className={styles.goal}>{session.scenario.goal}</p>
                      {journey.product && (
                        <div className={styles.selected}>
                          <ShoppingBag size={15} />
                          <span>
                            {journey.product.name}
                            <strong>
                              {priceLabel(journey.product.price, journey.product.currency)}
                            </strong>
                          </span>
                        </div>
                      )}
                      <blockquote>
                        {stop?.action?.reason ||
                          session.error?.message ||
                          'This shopper has not recorded a final recommendation or decline yet.'}
                      </blockquote>
                      <div className={styles.constraints}>
                        {session.scenario.hardConstraints.map((constraint, index) => (
                          <span key={index}>
                            {constraint.description || `${constraint.kind}: ${constraint.value}`}
                          </span>
                        ))}
                      </div>
                      <footer>
                        <OutcomeBadge session={session} />
                        <Link href={`/replays/${session.id}`}>
                          Inspect evidence <ArrowUpRight size={13} />
                        </Link>
                      </footer>
                    </article>
                  );
                })}
              </div>
              {!visible.length && (
                <EmptyState
                  title="No matching shopper decisions"
                  description="Choose another filter to review the recorded journeys."
                />
              )}
            </Card>
            <p className={styles.note}>
              Evidence is limited to this run's tested scenarios. Archetypes are hypotheses inferred
              from storefront evidence, not measured audience segments.{' '}
              {scan.fixture ? 'This run uses development fixtures.' : ''}
            </p>
          </>
        )}
      </div>
    </>
  );
}
