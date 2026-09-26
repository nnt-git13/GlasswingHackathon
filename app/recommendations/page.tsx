'use client';
import { useApp } from '@/components/layout/app-provider';
import { RecommendationCard } from '@/components/recommendations/recommendation-card';
import { MetricCard } from '@/components/ui/metric-card';
import { PageHeading } from '@/components/ui/page-heading';
import { Card, EmptyState, Select, Tabs } from '@/components/ui/primitives';
import { recommendations } from '@/lib/mock-data/recommendations';
import { ArrowUpRight, CheckCheck, TrendingUp } from 'lucide-react';
import { useState } from 'react';
export default function RecommendationsPage() {
  const [tab, setTab] = useState('Open');
  const [category, setCategory] = useState('All categories');
  const { resolved, verified } = useApp();
  const openHighImpact = recommendations.filter(
    (r) => r.impactLevel === 'High' && !resolved.includes(r.id),
  ).length;
  const visible = recommendations.filter(
    (r) =>
      (category === 'All categories' || category === r.category) &&
      (tab === 'All' || (tab === 'Resolved' ? resolved.includes(r.id) : !resolved.includes(r.id))),
  );
  return (
    <>
      <PageHeading
        title="Recommendations"
        subtitle="Merchant-side fixes from failed agent journeys. Apply a change, rerun the same scenarios, and verify the result."
        action={
          <span className="subtle-badge">
            <span className="live-dot" />
            From scan #0025
          </span>
        }
      />
      <div className="metrics-grid">
        <MetricCard
          label="Open recommendations"
          value={String(12 - resolved.length)}
          detail="Prioritized by merchant impact"
        />
        <MetricCard
          label="High impact"
          value={String(openHighImpact)}
          detail="Address these recommendations first"
        />
        <MetricCard label="Quick wins" value="4" detail="Less than one day to implement" />
        <MetricCard
          label="Verified fixes"
          value={String(verified.length)}
          detail="Passed scenario reruns"
        />
      </div>
      <div className="recommendations-layout">
        <div>
          <div className="recommendations-toolbar">
            <Tabs tabs={['Open', 'Resolved', 'All']} active={tab} onChange={setTab} />
            <Select
              label="Recommendation category"
              value={category}
              onChange={setCategory}
              options={['All categories', 'Product semantics', 'Security', 'Policies']}
            />
          </div>
          <div className="recommendations-list">
            {visible.map((r, i) => (
              <RecommendationCard recommendation={r} key={r.id} index={i} />
            ))}
            {!visible.length && (
              <Card>
                <EmptyState
                  title={
                    tab === 'Resolved'
                      ? 'No resolved recommendations yet'
                      : 'No matching recommendations'
                  }
                  description={
                    tab === 'Resolved'
                      ? 'Implement a recommendation and verify the fix to see it here.'
                      : 'Try a different category or open the All tab.'
                  }
                />
              </Card>
            )}
          </div>
          <p className="recommendations-footnote">
            Showing {visible.length} prioritized recommendations from the latest scan. 7 additional
            lower-priority recommendations are outside this demo.
          </p>
        </div>
        <aside className="recommendations-sidebar">
          <Card>
            <span className="icon-box blue">
              <TrendingUp size={21} />
            </span>
            <h3>Your path to agent readiness</h3>
            <p>Resolve these issues to help more autonomous shoppers complete their goals.</p>
            <div className="readiness-projection">
              <div>
                <span>Current score</span>
                <strong>74</strong>
              </div>
              <ArrowUpRight size={22} />
              <div>
                <span>Potential score</span>
                <strong>92</strong>
              </div>
            </div>
            <div className="progress-track">
              <span style={{ width: '74%' }} />
            </div>
            <small>
              Estimated across all 12 open recommendations. Individual impacts may overlap.
            </small>
          </Card>
          <Card className="verification-explainer">
            <span className="icon-box green">
              <CheckCheck size={19} />
            </span>
            <h3>Verify before closing</h3>
            <p>
              A recommendation moves to Resolved only after the same shopping scenarios pass again.
            </p>
            <ol>
              <li>
                <span>1</span>Review implementation
              </li>
              <li>
                <span>2</span>Apply the merchant-side fix
              </li>
              <li>
                <span>3</span>Rerun the same scenarios
              </li>
              <li>
                <span>4</span>Confirm the result
              </li>
            </ol>
          </Card>
        </aside>
      </div>
    </>
  );
}
