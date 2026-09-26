export type Severity = 'Critical' | 'High' | 'Medium' | 'Low';
export type Environment = 'Production' | 'Staging';
export interface Merchant {
  id: string;
  name: string;
  domain: string;
  description: string;
  products: number;
  brands: number;
  categories: number;
  flows: number;
}
export interface ReadinessMetric {
  name: string;
  score: number;
  description: string;
  status: string;
  icon: 'discovery' | 'checkout' | 'security' | 'compatibility';
  change: number;
  /** Populated once a scanning agent's result has been mapped in; drives the optional breakdown list on the card. */
  meta?: {
    total: number;
    passing: number;
    unitLabel: string;
    breakdown?: { name: string; total: number; passing: number }[];
  };
}

/** Shared issue shape reported by any readiness-scanning agent. */
export interface ScanIssue {
  title: string;
  description: string;
  affected: number;
}

/**
 * Contract for the discoverability-scanning agent's output. The agent crawls a
 * merchant site and reports what fraction of products/content it could find
 * and parse. `lib/discovery.ts` maps this shape onto a `ReadinessMetric` for
 * display; anything posting to `/api/discovery` should match this shape.
 */
export interface DiscoveryScanResult {
  scanId: string;
  scannedAt: string;
  totalProducts: number;
  discoverableProducts: number;
  previousDiscoverablePercent?: number;
  categories: { name: string; total: number; discoverable: number }[];
  issues?: ScanIssue[];
}

/**
 * Contract for the checkout-scanning agent's output: what fraction of
 * purchase flows an agent can complete end-to-end. Post matching this shape
 * to `/api/checkout`; `lib/checkout.ts` maps it onto a `ReadinessMetric`.
 */
export interface CheckoutScanResult {
  scanId: string;
  scannedAt: string;
  totalFlows: number;
  completableFlows: number;
  previousCompletablePercent?: number;
  flows: { name: string; total: number; completable: number }[];
  issues?: ScanIssue[];
}

/**
 * Contract for the security-scanning agent's output: what fraction of intent
 * and abuse-protection policies are enforced. Post matching this shape to
 * `/api/security`; `lib/security.ts` maps it onto a `ReadinessMetric`.
 */
export interface SecurityScanResult {
  scanId: string;
  scannedAt: string;
  totalPolicies: number;
  enforcedPolicies: number;
  previousEnforcedPercent?: number;
  policies: { name: string; total: number; enforced: number }[];
  issues?: ScanIssue[];
}

/**
 * Contract for the compatibility-scanning agent's output: what fraction of
 * structured-data/policy signals are machine-readable. Post matching this
 * shape to `/api/compatibility`; `lib/compatibility.ts` maps it onto a
 * `ReadinessMetric`.
 */
export interface CompatibilityScanResult {
  scanId: string;
  scannedAt: string;
  totalSignals: number;
  compatibleSignals: number;
  previousCompatiblePercent?: number;
  signals: { name: string; total: number; compatible: number }[];
  issues?: ScanIssue[];
}
export interface Scan {
  id: string;
  score: number;
  date: string;
  pages: number;
  sessions: number;
  duration: string;
  phases: { name: string; issues: number }[];
}
export interface Finding {
  id: string;
  title: string;
  description: string;
  severity: Severity;
  category: string;
  detail: string;
  path: string;
  affected: number;
}
export interface Recommendation {
  id: string;
  title: string;
  problem: string;
  reason: string;
  fix: string;
  impact: string;
  impactLevel: 'High' | 'Medium';
  effort: string;
  affected: number;
  category: string;
  code: string;
}

/**
 * Contract for the agent's top-findings report: the most critical, highest-
 * impact issues found on the merchant's site, ranked by the agent. Post
 * matching this shape to `/api/findings`; `lib/findings.ts` maps it onto the
 * "Top findings" widget.
 */
export interface FindingsScanResult {
  scanId: string;
  scannedAt: string;
  findings: Finding[];
}

/** One historical scan's overall readiness score, for the readiness-trend chart. */
export interface ReadinessTrendPoint {
  label: string;
  date: string;
  score: number;
}

/**
 * Contract for the agent readiness trend: the merchant's overall readiness
 * score across its last 5 scans. Post matching this shape to
 * `/api/readiness-trend`; `lib/readiness-trend.ts` maps it onto the "Agent
 * readiness trend" chart. `points` should be ordered oldest to newest and
 * capped at the last 5 scans.
 */
export interface ReadinessTrendScanResult {
  scanId?: string;
  scannedAt?: string;
  target: number;
  points: ReadinessTrendPoint[];
}

/**
 * Contract for the agent's recommended next steps: the highest-value fixes,
 * benchmarked against how well-executed comparable merchant sites handle the
 * same issue. Post matching this shape to `/api/next-steps`;
 * `lib/next-steps.ts` maps it onto the "Recommended next steps" widget.
 */
export interface NextStepsScanResult {
  scanId: string;
  scannedAt: string;
  recommendations: Recommendation[];
}
export interface AgentProfile {
  name: string;
  short: string;
  color: string;
}
export interface ShoppingSession {
  id: string;
  goal: string;
  agent: string;
  status: 'Completed' | 'Failed' | 'Blocked';
  steps: number;
  duration: string;
  issues: number;
  severity: Severity | null;
  timestamp: string;
  goalType: string;
  environment: Environment;
  date: string;
}
export interface SessionEvent {
  id: number;
  time: string;
  title: string;
  type: 'goal' | 'browse' | 'compare' | 'warning' | 'cart' | 'promo' | 'checkout' | 'complete';
  summary: string;
  action?: string;
  details: string;
  status?: string;
}
export interface SecurityPolicy {
  id: string;
  name: string;
  scope: string;
  enforcement: string;
  violations: number;
  enabled: boolean;
  warning?: boolean;
}
export interface SecurityEvent {
  id: string;
  title: string;
  severity: Severity;
  sessionId: string;
  time: string;
  policy: string;
}
