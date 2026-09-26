'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { PageHeading } from '@/components/ui/page-heading';
import {
  Button,
  Card,
  CardHeader,
  EmptyState,
  StatusBadge,
  Tabs,
} from '@/components/ui/primitives';
import { formatCost, formatTime } from '@/lib/gateway/client';
import type { Session } from '@/lib/gateway/schemas';
import { ErrorNotice, FixtureBadge, OutcomeBadge, useGatewayData } from './shared';
export function GatewayReplay({ id }: { id: string }) {
  const {
    data: session,
    error,
    loading,
    reload,
  } = useGatewayData<Session>(`/sessions/${encodeURIComponent(id)}`);
  const [selected, setSelected] = useState(0);
  const [tab, setTab] = useState('Trace');
  useEffect(() => {
    if (!session || !['queued', 'running'].includes(session.status)) return;
    const timer = setInterval(reload, 2000);
    return () => clearInterval(timer);
  }, [session?.id, session?.status]);
  useEffect(() => {
    if (!session) return;
    const evidence = new URLSearchParams(window.location.search).get('evidence');
    const index = session.trace.findIndex(
      (event) => event.id === evidence || event.observation?.id === evidence,
    );
    if (index >= 0) setSelected(index);
  }, [session?.id]);
  const event = session?.trace[selected];
  const download = () => {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(session, null, 2)], { type: 'application/json' }),
    );
    const link = document.createElement('a');
    link.href = url;
    link.download = `gateway-session-${id}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };
  return (
    <>
      <PageHeading
        title="Session replay"
        subtitle={
          session?.scenario.goal ||
          'Load recorded actions, storefront observations, and independent evaluation.'
        }
        action={
          session && (
            <Button variant="outline" onClick={download}>
              Export session JSON
            </Button>
          )
        }
      />
      <ErrorNotice message={error} retry={reload} />
      {loading && !session && <p role="status">Loading session…</p>}
      {session && (
        <div className="gateway-stack">
          <div className="gateway-toolbar">
            <FixtureBadge fixture={session.fixture} />
            <StatusBadge>{session.status}</StatusBadge>
            <OutcomeBadge session={session} />
            <span>
              {session.archetype.name} · {session.scenario.mode}
            </span>
            <Link className="text-link" href={`/scan?scanId=${session.scanId}`}>
              View parent scan →
            </Link>
          </div>
          <ErrorNotice message={session.error?.message || ''} />
          <Card className="gateway-panel">
            <Tabs
              tabs={['Trace', 'Goal & constraints', 'Evaluation', 'Model usage']}
              active={tab}
              onChange={setTab}
            />
          </Card>
          {tab === 'Trace' && (
            <div className="gateway-replay-layout">
              <Card>
                <CardHeader
                  title="Recorded events"
                  subtitle="Actions and observations in execution order."
                />
                {session.trace.length ? (
                  <ol className="gateway-timeline">
                    {session.trace.map((item, index) => (
                      <li key={item.id}>
                        <button
                          className={selected === index ? 'selected' : ''}
                          onClick={() => setSelected(index)}
                          aria-pressed={selected === index}
                        >
                          <strong>
                            {index + 1}.{' '}
                            {item.action?.type.replaceAll('_', ' ') || 'Observe storefront'}
                          </strong>
                          <span>
                            {item.status} · {formatTime(item.timestamp)}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <EmptyState
                    title="No events recorded yet"
                    description={
                      session.status === 'queued'
                        ? 'This session is waiting to run.'
                        : 'The session has not captured a browser observation.'
                    }
                  />
                )}
              </Card>
              <Card>
                <CardHeader
                  title={event?.observation?.title || event?.action?.type || 'Observation'}
                />
                {event && (
                  <div className="gateway-panel gateway-stack">
                    <StatusBadge>{event.status}</StatusBadge>
                    <p>{event.detail}</p>
                    {event.action && (
                      <dl className="gateway-details">
                        <dt>Action</dt>
                        <dd>{event.action.type}</dd>
                        {event.action.url && (
                          <>
                            <dt>URL</dt>
                            <dd>{event.action.url}</dd>
                          </>
                        )}
                        {event.action.query && (
                          <>
                            <dt>Search query</dt>
                            <dd>{event.action.query}</dd>
                          </>
                        )}
                        {event.action.disposition && (
                          <>
                            <dt>Disposition</dt>
                            <dd>{event.action.disposition}</dd>
                          </>
                        )}
                      </dl>
                    )}
                    {event.observation && (
                      <>
                        <a href={event.observation.url} target="_blank" rel="noreferrer">
                          {event.observation.url}
                        </a>
                        <p>Captured {formatTime(event.observation.timestamp)}</p>
                        <pre className="gateway-observation">{event.observation.text}</pre>
                        {event.observation.products.map((product, index) => (
                          <p key={index}>
                            <strong>{product.name}</strong> · {product.price ?? 'Price unknown'}{' '}
                            {product.currency || ''}
                          </p>
                        ))}
                        <details>
                          <summary>Discovered links ({event.observation.links.length})</summary>
                          {event.observation.links.map((link, index) => (
                            <p key={index}>
                              {link.text} — {link.url}
                            </p>
                          ))}
                        </details>
                      </>
                    )}
                    <small>Evidence ID: {event.observation?.id || event.id}</small>
                  </div>
                )}
              </Card>
            </div>
          )}
          {tab === 'Goal & constraints' && (
            <Card className="gateway-panel gateway-stack">
              <h2>{session.scenario.goal}</h2>
              <p>
                Archetype: {session.archetype.name} — {session.archetype.hypothesis}
              </p>
              <p>
                Mode: {session.scenario.mode} · Expected outcome: {session.scenario.expectedOutcome}
              </p>
              <h3>Hard constraints</h3>
              {session.scenario.hardConstraints.length ? (
                session.scenario.hardConstraints.map((constraint, i) => (
                  <p key={i}>
                    {constraint.description} ({constraint.kind}: {constraint.value})
                  </p>
                ))
              ) : (
                <p>No additional hard constraints.</p>
              )}
              <h3>Soft preferences</h3>
              {session.scenario.softPreferences.map((preference, i) => (
                <p key={i}>{preference}</p>
              ))}
              <p>Permitted actions: {session.scenario.permittedActions.join(', ')}</p>
              <p>Authorized stop: recommend or decline.</p>
              <p>Source: {session.scenario.provenance.rationale}</p>
            </Card>
          )}
          {tab === 'Evaluation' && (
            <Card>
              <CardHeader title="Independent outcome evaluation" />
              {session.evaluation ? (
                <div className="gateway-panel gateway-stack">
                  <OutcomeBadge session={session} />
                  <h3>Deterministic checks</h3>
                  {session.evaluation.deterministic.map((check) => (
                    <div key={check.name}>
                      <StatusBadge
                        tone={
                          check.result === 'pass'
                            ? 'green'
                            : check.result === 'fail'
                              ? 'red'
                              : 'amber'
                        }
                      >
                        {check.result}
                      </StatusBadge>{' '}
                      <strong>{check.name.replaceAll('_', ' ')}</strong>
                      <p>{check.detail}</p>
                    </div>
                  ))}
                  <h3>Independent semantic verdict: {session.evaluation.semantic.verdict}</h3>
                  <p>{session.evaluation.semantic.reason}</p>
                  {session.evaluation.semantic.constraintAssessments.map((assessment) => (
                    <p key={assessment.constraintIndex}>
                      Constraint {assessment.constraintIndex + 1}: {assessment.verdict} —{' '}
                      {assessment.reason}
                    </p>
                  ))}
                  <div className="gateway-toolbar">
                    {session.evaluation.semantic.evidenceIds.map((evidenceId) => (
                      <Button
                        key={evidenceId}
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelected(
                            session.trace.findIndex((item) => item.observation?.id === evidenceId),
                          );
                          setTab('Trace');
                        }}
                      >
                        View cited observation
                      </Button>
                    ))}
                  </div>
                </div>
              ) : (
                <EmptyState
                  title="No evaluation available"
                  description={
                    session.error
                      ? 'Execution failed before an evaluation could be completed. Inspect the error and recorded trace.'
                      : 'Evaluation appears after the shopper finishes.'
                  }
                />
              )}
            </Card>
          )}
          {tab === 'Model usage' && (
            <Card>
              <CardHeader title="Recorded model calls" />
              <div className="gateway-table-wrap">
                <table className="gateway-table">
                  <thead>
                    <tr>
                      <th>Purpose</th>
                      <th>Model / prompt</th>
                      <th>Status</th>
                      <th>Attempts</th>
                      <th>Tokens in / out</th>
                      <th>Estimated cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {session.modelCalls.map((call) => (
                      <tr key={call.id}>
                        <td>{call.purpose}</td>
                        <td>
                          {call.model}
                          <small>{call.promptVersion}</small>
                        </td>
                        <td>
                          {call.status}
                          <small>{call.errorCode}</small>
                        </td>
                        <td>{call.attempts}</td>
                        <td>
                          {call.inputTokens} / {call.outputTokens}
                        </td>
                        <td>{formatCost(call.estimatedCostUsd)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      )}
    </>
  );
}
