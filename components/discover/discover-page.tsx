'use client';
import { AgentLoading } from '@/components/agent/agent-loading';
import { AgentResults } from '@/components/agent/agent-results';
import { useApp } from '@/components/layout/app-provider';
import { GatewayLogo } from '@/components/layout/app-shell';
import { Button, LoadingLabel, Select, StatusBadge } from '@/components/ui/primitives';
import { computeReadiness, hostFromDomain, siteNameFromDomain } from '@/lib/agent/readiness';
import type { AgentScanResult } from '@/lib/agent/types';
import { directory } from '@/lib/mock-data/directory';
import { productConfig } from '@/lib/mock-data/merchant';
import { ArrowRight, Bot, Globe2, LayoutDashboard, Search, Sparkles, X } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

interface ProviderInfo {
  id: string;
  label: string;
  description: string;
  model: string;
  configured: boolean;
}

interface AgentScanResponse {
  provider: string;
  configured: boolean;
  storefront: string;
  mode: string;
  model: string | null;
  goalCount: number;
  succeeded: number;
  failed: number;
  results: AgentScanResult[];
}

const defaultGoals = [
  'Find a hiking backpack under $250 and buy the best-rated option',
  'Buy an insulated jacket under $180',
];

function normalizeStorefront(query: string): string | null {
  const trimmed = query.trim();
  if (!trimmed || trimmed.includes(' ')) return null;
  if (!/\./.test(trimmed)) return null;
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

export function DiscoverPage() {
  const { setScanSite } = useApp();
  const [query, setQuery] = useState('');
  const [provider, setProvider] = useState('sciforium');
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState<AgentScanResponse | null>(null);

  useEffect(() => {
    fetch('/api/agent-scan')
      .then((response) => response.json())
      .then((payload: { providers: ProviderInfo[]; defaultProvider: string }) => {
        setProviders(payload.providers);
        setProvider(payload.defaultProvider);
      })
      .catch(() => undefined);
  }, []);

  const runAgent = async (value?: string) => {
    const term = (value ?? query).trim();
    if (!term) return;
    const storefrontUrl = normalizeStorefront(term);
    const goals = storefrontUrl ? defaultGoals : [`${term}`];
    setLoading(true);
    setError('');
    setData(null);
    const startedAt = Date.now();
    try {
      const response = await fetch('/api/agent-scan', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ goals, provider, storefrontUrl, agentName: 'Gateway Test Agent' }),
      });
      if (!response.ok) throw new Error(`Request failed with status ${response.status}`);
      const payload = (await response.json()) as AgentScanResponse;
      const elapsed = Date.now() - startedAt;
      if (elapsed < 2800) await new Promise((resolve) => setTimeout(resolve, 2800 - elapsed));
      setData(payload);
      const findings = payload.results.flatMap((result) => result.findings);
      const host = hostFromDomain(payload.storefront);
      setScanSite({
        domain: host,
        name: siteNameFromDomain(payload.storefront),
        score: computeReadiness(findings),
        mode: payload.mode,
        model: payload.model,
        succeeded: payload.succeeded,
        failed: payload.failed,
        goalCount: payload.goalCount,
        findings,
        scannedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Agent run failed');
    } finally {
      setLoading(false);
    }
  };

  const activeProvider = providers.find((item) => item.id === provider);

  return (
    <div className="portal-page">
      <header className="portal-brand">
        <span className="portal-logo">
          <GatewayLogo />
          <strong>{productConfig.name}</strong>
        </span>
        <span className="portal-brand-note">Agent readiness · demo workspace</span>
      </header>

      <section className="discover-hero">
        <div className="discover-eyebrow">
          <Sparkles size={13} />
          Agentic storefront scan
        </div>
        <h1>Search a storefront. Let the agent test it.</h1>
        <p>
          Enter a merchant domain to send an autonomous agent through its catalog, policies, and
          checkout — or search a product goal to test the reference storefront. The agent reasons,
          acts, observes, and reports what blocks a purchase.
        </p>

        <div className="portal-controls">
          <div className="discover-search">
            <Search size={18} />
            <input
              autoFocus
              placeholder="evertrailoutdoors.com or “hiking backpack under $250”"
              aria-label="Search storefronts"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') void runAgent();
              }}
            />
            {query && (
              <button aria-label="Clear search" onClick={() => setQuery('')}>
                <X size={15} />
              </button>
            )}
          </div>
          <div className="portal-control-side">
            <label className="portal-provider">
              <span>Model API</span>
              <Select
                label="Model API"
                value={provider}
                onChange={setProvider}
                options={providers.map((item) => ({
                  value: item.id,
                  label: `${item.label}${item.configured ? '' : ' · no key'}`,
                }))}
              />
            </label>
            <Button onClick={() => void runAgent()} disabled={loading || !query.trim()}>
              {loading ? (
                <LoadingLabel>Agent running…</LoadingLabel>
              ) : (
                <>
                  <Bot size={15} />
                  Run agent
                </>
              )}
            </Button>
          </div>
        </div>

        {activeProvider && (
          <p className="portal-provider-note">
            {activeProvider.configured ? (
              <StatusBadge tone="green">live · {activeProvider.model}</StatusBadge>
            ) : (
              <StatusBadge tone="amber">
                {activeProvider.label} has no key · runs scripted against the reference store
              </StatusBadge>
            )}
          </p>
        )}

        <div className="discover-suggestions">
          <span>Indexed storefronts</span>
          {directory.slice(0, 5).map((site) => (
            <button key={site.id} onClick={() => setQuery(site.domain)}>
              {site.domain}
            </button>
          ))}
        </div>
      </section>

      {error && <div className="portal-error">{error}</div>}

      {loading && (
        <AgentLoading storefront={hostFromDomain(normalizeStorefront(query) ?? query)} />
      )}

      {data && (
        <section className="portal-results">
          <div className="portal-results-head">
            <div>
              <Globe2 size={15} />
              <strong>{data.storefront}</strong>
              <span>
                {data.succeeded} completed · {data.failed} failed · {data.goalCount} goals
              </span>
            </div>
            <div className="portal-results-actions">
              <StatusBadge tone={data.configured ? 'green' : 'amber'}>
                {data.configured ? `live · ${data.model}` : 'scripted reference run'}
              </StatusBadge>
              <Button asChild size="sm">
                <Link href="/dashboard">
                  <LayoutDashboard size={13} />
                  Open dashboard
                </Link>
              </Button>
            </div>
          </div>
          <AgentResults results={data.results} />
        </section>
      )}

      {!data && !loading && (
        <div className="portal-hint">
          <ArrowRight size={14} />
          Pick an indexed storefront above, or type any domain to fetch it live.
        </div>
      )}
    </div>
  );
}