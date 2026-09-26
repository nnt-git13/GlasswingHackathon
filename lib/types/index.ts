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
