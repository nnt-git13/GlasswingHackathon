'use client';
import { useApp } from '@/components/layout/app-provider';
import { MetricCard } from '@/components/ui/metric-card';
import { PageHeading } from '@/components/ui/page-heading';
import { Button, Card, Tabs } from '@/components/ui/primitives';
import { getSessionsReport, mockSessionsResult } from '@/lib/sessions-report';
import type { SessionsScanResult } from '@/lib/types';
import { Download, Play, ScanLine } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { defaultFilters, FilterBar, type SessionFilters } from './filter-bar';
import { SessionTable } from './session-table';
export function SessionsPage({ replays = false }: { replays?: boolean }) {
  const [filters, setFilters] = useState<SessionFilters>(defaultFilters);
  const [tab, setTab] = useState('All sessions');
  const [report, setReport] = useState<SessionsScanResult>(mockSessionsResult);
  const { notify, runScan, scanning } = useApp();
  useEffect(() => {
    let cancelled = false;
    getSessionsReport().then((result) => {
      if (!cancelled) setReport(result);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  const { sessions, summary: sessionSummary, agents } = report;
  const visible = useMemo(
    () =>
      sessions.filter(
        (s) =>
          (!filters.search ||
            `${s.id} ${s.goal} ${s.agent}`.toLowerCase().includes(filters.search.toLowerCase())) &&
          (filters.status === 'All statuses' || s.status === filters.status) &&
          (filters.goal === 'All goals' || s.goalType === filters.goal) &&
          (filters.agent === 'All agents' || s.agent === filters.agent) &&
          (filters.environment === 'All environments' || s.environment === filters.environment) &&
          (filters.severity === 'All severities' ||
            (filters.severity === 'No issues'
              ? s.issues === 0
              : s.severity === filters.severity)) &&
          (filters.date === 'Last 7 days' ||
            s.date === (filters.date === 'Today' ? '2026-09-26' : '2026-09-25')) &&
          (tab === 'All sessions' ||
            (tab === 'With issues' ? s.issues > 0 : s.status === 'Blocked')),
      ),
    [sessions, filters, tab],
  );
  const exportCSV = () => {
    const rows = [
      ['Session', 'Goal', 'Agent', 'Status', 'Steps', 'Duration', 'Issues', 'Date'],
      ...visible.map((s) => [
        s.id,
        s.goal,
        s.agent,
        s.status,
        s.steps,
        s.duration,
        s.issues,
        s.date,
      ]),
    ];
    const blob = new Blob(
      [rows.map((r) => r.map((v) => `"${String(v).replaceAll('"', '""')}"`).join(',')).join('\n')],
      { type: 'text/csv' },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'gateway-shopping-sessions.csv';
    a.click();
    URL.revokeObjectURL(url);
    notify(`Exported ${visible.length} shopping sessions.`);
  };
  return (
    <>
      <PageHeading
        title={replays ? 'Session Replays' : 'Shopping Sessions'}
        subtitle={
          replays
            ? 'Inspect agent decisions, storefront interactions, and policy enforcement.'
            : 'Observe how autonomous shoppers complete real customer goals.'
        }
        action={
          <>
            <Button variant="outline" onClick={exportCSV}>
              <Download size={14} />
              Export
            </Button>
            <Button onClick={runScan} disabled={scanning}>
              <Play size={14} />
              {scanning ? 'Running tests…' : 'Run shopping tests'}
            </Button>
          </>
        }
      />
      <div className="metrics-grid five">
        {sessionSummary.map((m) => (
          <MetricCard key={m.label} {...m} />
        ))}
      </div>
      <Card className="sessions-card">
        <div className="session-tabs">
          <Tabs
            tabs={['All sessions', 'With issues', 'Blocked actions']}
            active={tab}
            onChange={setTab}
          />
          <span>
            <span className="live-dot" />
            Updated just now
          </span>
        </div>
        <FilterBar filters={filters} onChange={setFilters} agents={agents.map((a) => a.name)} />
        <SessionTable sessions={visible} />
        <div className="table-footer">
          <span>
            Showing <strong>{visible.length}</strong> of {sessions.length} demo sessions
            <span className="footer-separator">·</span>1,248 total in workspace
          </span>
          <span className="mono">Sep 20 – 26, 2026</span>
        </div>
      </Card>
      <div className="info-panel session-info">
        <ScanLine size={16} />
        <span>
          Every session is a synthetic shopping test. Explore a replay to see what the agent
          observed, selected, and attempted.
        </span>
      </div>
    </>
  );
}
