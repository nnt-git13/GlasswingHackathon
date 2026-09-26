'use client';
import { ScoreRing } from '@/components/dashboard/score-ring';
import { useApp } from '@/components/layout/app-provider';
import { BrowserPreview } from '@/components/scans/browser-preview';
import { ScanPhaseStepper } from '@/components/scans/scan-phase-stepper';
import { PageHeading } from '@/components/ui/page-heading';
import { Button, Card, CardHeader, SeverityBadge, StatusBadge } from '@/components/ui/primitives';
import { latestScan, scanFixes, scanIssues } from '@/lib/mock-data/scans';
import { cn } from '@/lib/utils';
import { ArrowRight, CheckCircle2, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
export default function ScanPage() {
  const [selected, setSelected] = useState(1);
  const [phase, setPhase] = useState<string | null>(null);
  const { environment, scanNumber } = useApp();
  return (
    <>
      <PageHeading
        title="Agent Test Run"
        subtitle="Observe how autonomous shoppers move through the storefront, where they break, and what to fix next."
      />
      <div className="scan-run-meta">
        <StatusBadge>Completed</StatusBadge>
        <span className="mono">SCN-{String(scanNumber).padStart(4, '0')}</span>
        <span>
          <GlobeSmall />
          {environment}
        </span>
      </div>
      <Card className="agent-test-run">
        <div className="agent-test-summary">
          <span className="eyebrow">RUN OUTCOME</span>
          <div className="agent-test-value">
            <strong>{latestScan.sessions}</strong>
            <span>shopping sessions tested</span>
          </div>
          <p>
            5 agent profiles exercised {latestScan.pages} storefront pages in {latestScan.duration}.
          </p>
          <div className="agent-test-metrics">
            <span>
              <strong>{scanIssues.length}</strong>
              prioritized findings
            </span>
            <span>
              <strong>{scanIssues.filter((issue) => issue.severity === 'Critical').length}</strong>
              critical
            </span>
            <span>
              <strong>{latestScan.phases.reduce((sum, item) => sum + item.issues, 0)}</strong>
              surface checks need attention
            </span>
          </div>
        </div>
        <div className="agent-test-stages" aria-label="Completed test run stages">
          {[
            'Generate shopper goals',
            'Launch agent profiles',
            'Exercise storefront',
            'Evaluate outcomes',
            'Generate findings',
          ].map((stage, index) => (
            <div key={stage}>
              <span>
                <CheckCircle2 size={14} />
              </span>
              <div>
                <small>STEP {index + 1}</small>
                <strong>{stage}</strong>
              </div>
            </div>
          ))}
        </div>
      </Card>
      <div className="section-label scan-evidence-label">
        <h2>Readiness evidence by surface</h2>
        <span>Click a surface to inspect what needs attention</span>
      </div>
      <ScanPhaseStepper selected={phase} onSelect={setPhase} />
      {phase && (
        <div className="phase-detail">
          <CheckCircle2 size={16} />
          <span>
            <strong>{phase}:</strong>{' '}
            {phase === 'Checkout Flow'
              ? 'All 8 checkout checks passed. Cart state, payment sandbox, and order simulation are consistent.'
              : `${latestScan.phases.find((p) => p.name === phase)?.issues} checks need attention. Review the annotations and suggested fixes below.`}
          </span>
          <button onClick={() => setPhase(null)}>Dismiss</button>
        </div>
      )}
      <div className="scan-layout">
        <BrowserPreview selected={selected} onSelect={setSelected} />
        <div className="scan-right-column">
          <Card className="issues-card">
            <CardHeader
              title="Issues detected"
              action={
                <StatusBadge tone="red" dot={false}>
                  3 critical
                </StatusBadge>
              }
            />
            <div className="issues-table-header">
              <span>ISSUE</span>
              <span>SEVERITY</span>
            </div>
            {scanIssues.map((issue) => (
              <button
                key={issue.id}
                className={cn('scan-issue-row', selected === issue.id && 'selected')}
                onClick={() => setSelected(issue.id)}
                aria-pressed={selected === issue.id}
              >
                <span className="issue-number">{issue.id}</span>
                <span>
                  <strong>{issue.title}</strong>
                  <small>{issue.category}</small>
                </span>
                <SeverityBadge severity={issue.severity} />
                <ChevronRight size={13} />
              </button>
            ))}
          </Card>
          <Card className="scan-score-card">
            <CardHeader
              title="Merchant readiness"
              action={<span className="subtle-badge">Scan #{scanNumber}</span>}
            />
            <div className="scan-score-body">
              <ScoreRing score={74} compact />
              <div>
                <h3>
                  Supporting signal
                </h3>
                <p>Readiness summarizes the merchant-side friction surfaced by this run.</p>
                <span className="positive">↗ +4 since previous scan</span>
              </div>
            </div>
          </Card>
          <Card className="scan-fixes">
            <CardHeader
              title="Suggested fixes"
              action={<span className="subtle-badge">4 fixes</span>}
            />
            {scanFixes.map((fix, i) => (
              <Link href={`/recommendations#REC-00${i + 1}`} className="suggested-fix" key={fix.title}>
                <span>{i + 1}</span>
                <div>
                  <strong>{fix.title}</strong>
                  <small className={fix.impact === 'High' ? 'impact-text' : ''}>
                    {fix.impact} impact
                  </small>
                </div>
                <ChevronRight size={14} />
              </Link>
            ))}
            <div className="scan-fixes-footer">
              <Button asChild variant="outline" className="w-full">
                <Link href="/recommendations">
                  View all recommendations
                  <ArrowRight size={14} />
                </Link>
              </Button>
            </div>
          </Card>
        </div>
      </div>
      <div className="scan-bottom-note">
        <ShieldNote />
        Production-safe simulation. No live purchases or customer data were used during this scan.
      </div>
    </>
  );
}
function GlobeSmall() {
  return <span className="live-dot" />;
}
function ShieldNote() {
  return <CheckCircle2 size={14} />;
}
