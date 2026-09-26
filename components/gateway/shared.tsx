'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button, Card, CardHeader, EmptyState, StatusBadge } from '@/components/ui/primitives';
import {
  gatewayRequest,
  GatewayApiError,
  formatTime,
  type FindingResult,
} from '@/lib/gateway/client';
import type { Scan, Session } from '@/lib/gateway/schemas';

export function useGatewayData<T>(path: string | null, version: unknown = 0) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!path) {
      setLoading(false);
      setData(null);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    setError('');
    void gatewayRequest<T>(path, { signal: controller.signal })
      .then((value) => {
        if (!controller.signal.aborted) setData(value);
      })
      .catch((error) => {
        if (!controller.signal.aborted) {
          setData(null);
          setError(error instanceof Error ? error.message : 'Unable to load results.');
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [path, version, retry]);
  return { data, error, loading, reload: () => setRetry((value) => value + 1) };
}
export function ErrorNotice({ message, retry }: { message: string; retry?: () => void }) {
  if (!message) return null;
  return (
    <div className="portal-error gateway-error" role="alert">
      <span>{message}</span>
      {retry && (
        <Button size="sm" variant="outline" onClick={retry}>
          Retry
        </Button>
      )}
    </div>
  );
}
export function errorMessage(error: unknown) {
  if (error instanceof GatewayApiError && error.status === 401)
    return 'Sign in to inspect a storefront and save your scans.';
  return error instanceof Error ? error.message : 'The request failed. Please retry.';
}
export function FixtureBadge({ fixture }: { fixture: boolean }) {
  return (
    <StatusBadge tone={fixture ? 'amber' : 'blue'}>
      {fixture ? 'Fixture · development only' : 'OpenAI run'}
    </StatusBadge>
  );
}
export function OutcomeBadge({ session }: { session: Pick<Session, 'status' | 'evaluation'> }) {
  const label = session.evaluation?.outcome || session.status;
  return (
    <StatusBadge
      tone={
        label === 'passed' ? 'green' : ['failed', 'interrupted'].includes(label) ? 'red' : 'amber'
      }
    >
      {label}
    </StatusBadge>
  );
}
export function FindingsList({ findings }: { findings: FindingResult[] }) {
  return (
    <Card>
      <CardHeader
        title="Findings"
        subtitle="Each finding links to the recorded session and supporting observations."
      />
      {findings.length ? (
        findings.map((finding) => (
          <article className="gateway-finding" data-severity={finding.severity} key={finding.id}>
            <div className="gateway-toolbar">
              <StatusBadge tone={finding.severity === 'high' ? 'red' : 'amber'}>
                {finding.severity}
              </StatusBadge>
              <FixtureBadge fixture={finding.fixture} />
              <span>{finding.category}</span>
            </div>
            <h3>{finding.title}</h3>
            <p>{finding.summary}</p>
            <Link
              className="text-link"
              href={`/replays/${finding.sessionId}?evidence=${encodeURIComponent(finding.evidenceIds[0] || '')}`}
            >
              Inspect supporting session →
            </Link>
          </article>
        ))
      ) : (
        <EmptyState
          title="No findings recorded"
          description="Completed evaluations will appear here when a goal fails or cannot be verified."
        />
      )}
    </Card>
  );
}
export function ScanResults({ scan }: { scan: Scan }) {
  const done = scan.sessions.filter(
    (session) => !['queued', 'running'].includes(session.status),
  ).length;
  return (
    <div className="gateway-stack">
      <Card>
        <CardHeader
          title={`Scan ${scan.id.slice(0, 8)}`}
          subtitle={`${scan.draft.merchantUrl} · ${scan.draft.environmentId}`}
          action={<FixtureBadge fixture={scan.fixture} />}
        />
        <div className="gateway-panel">
          <div className="gateway-toolbar">
            <StatusBadge
              tone={
                scan.status === 'completed' ? 'green' : scan.status === 'failed' ? 'red' : 'blue'
              }
            >
              {scan.status}
            </StatusBadge>
            <span>
              {done} / {scan.sessions.length} sessions finished
            </span>
            <span>{formatTime(scan.createdAt)}</span>
          </div>
          <progress
            aria-label="Shopping session progress"
            value={done}
            max={scan.sessions.length}
          />
          <p>
            Authorized stopping point: recommend a product or decline. Sessions are evaluated
            independently.
          </p>
          <div className="gateway-toolbar">
            <Button asChild variant="outline" size="sm">
              <Link href={`/sessions?scanId=${scan.id}`}>View sessions</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href={`/discover?draft=${scan.draft.id}`}>Review test plan</Link>
            </Button>
          </div>
        </div>
      </Card>
      <Card>
        <CardHeader title="Shopper sessions" />
        <div className="gateway-table-wrap">
          <table className="gateway-table">
            <thead>
              <tr>
                <th>Shopping goal</th>
                <th>Archetype / mode</th>
                <th>Execution</th>
                <th>Outcome</th>
                <th>Trace</th>
              </tr>
            </thead>
            <tbody>
              {scan.sessions.map((session) => (
                <tr key={session.id}>
                  <td>{session.scenario.goal}</td>
                  <td>
                    {session.archetype.name}
                    <small>{session.scenario.mode}</small>
                  </td>
                  <td>{session.status}</td>
                  <td>
                    <OutcomeBadge session={session} />
                  </td>
                  <td>
                    <Link className="text-link" href={`/replays/${session.id}`}>
                      Replay ({session.trace.length})
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <FindingsList
        findings={scan.findings.map((finding) => ({
          ...finding,
          scanId: scan.id,
          fixture: scan.fixture,
        }))}
      />
    </div>
  );
}
