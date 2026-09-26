import { Card, StatusBadge } from '@/components/ui/primitives';
import type { ReadinessMetric } from '@/lib/types';
import { ArrowUpRight, Compass, CreditCard, Puzzle, ShieldCheck } from 'lucide-react';
const icons = {
  discovery: Compass,
  checkout: CreditCard,
  security: ShieldCheck,
  compatibility: Puzzle,
};
export function ReadinessCard({ metric }: { metric: ReadinessMetric }) {
  const Icon = icons[metric.icon];
  return (
    <Card className="readiness-card">
      <div className="readiness-top">
        <span className="readiness-title">
          <Icon size={17} />
          {metric.name}
        </span>
        <StatusBadge
          tone={
            metric.status === 'Good'
              ? 'green'
              : metric.status === 'Needs attention'
                ? 'red'
                : 'amber'
          }
          dot={false}
        >
          {metric.status}
        </StatusBadge>
      </div>
      <div className="readiness-value">
        {metric.score}
        <span>%</span>
        <span className="readiness-change">
          <ArrowUpRight size={12} />
          {metric.change}%
        </span>
      </div>
      <p>{metric.description}</p>
      <div className="progress-track">
        <span
          className={
            metric.status === 'Good'
              ? 'green'
              : metric.status === 'Needs attention'
                ? 'rose'
                : 'amber'
          }
          style={{ width: `${metric.score}%` }}
        />
      </div>
      {metric.meta && (
        <div className="readiness-meta">
          <span className="readiness-meta-total">
            {metric.meta.passing} / {metric.meta.total} {metric.meta.unitLabel}
          </span>
          {metric.meta.breakdown?.map((b) => (
            <div key={b.name} className="readiness-meta-row">
              <span>{b.name}</span>
              <span>
                {b.passing}/{b.total}
              </span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
