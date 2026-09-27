'use client';
import { useApp } from '@/components/layout/app-provider';
import { GatewayLogo } from '@/components/layout/app-shell';
import { Button, Select, StatusBadge } from '@/components/ui/primitives';
import {
  budgetBands,
  currencies,
  environments,
  focusOptions,
  guardrailOptions,
  regions,
  scanDepths,
} from '@/lib/agent/intake';
import { buyerPersonas } from '@/lib/agent/personas';
import { directory } from '@/lib/mock-data/directory';
import { productConfig } from '@/lib/mock-data/merchant';
import { cn } from '@/lib/utils';
import { Bot, Search, Settings2, Sparkles, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface ProviderInfo {
  id: string;
  label: string;
  description: string;
  model: string;
  configured: boolean;
}

const SETUP_KEY = 'gateway_scan_setup_skipped';

export function DiscoverPage() {
  const router = useRouter();
  const { scanConfig, setScanConfig } = useApp();
  const [query, setQuery] = useState('');
  const [provider, setProvider] = useState('sciforium');
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [setupOpen, setSetupOpen] = useState(true);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.localStorage.getItem(SETUP_KEY) === '1') {
      setSetupOpen(false);
    }
    fetch('/api/ai/providers')
      .then((response) => response.json())
      .then((payload: { providers: ProviderInfo[]; defaultProvider: string }) => {
        setProviders(Array.isArray(payload.providers) ? payload.providers : []);
        if (payload.defaultProvider) setProvider(payload.defaultProvider);
      })
      .catch(() => undefined);
  }, []);

  const toggleFocus = (focus: string) => {
    const focuses = scanConfig.focuses.includes(focus)
      ? scanConfig.focuses.filter((item) => item !== focus)
      : [...scanConfig.focuses, focus];
    setScanConfig({ ...scanConfig, focuses });
  };

  const togglePersona = (id: string) => {
    const personaIds = scanConfig.personaIds.includes(id)
      ? scanConfig.personaIds.filter((item) => item !== id)
      : [...scanConfig.personaIds, id];
    setScanConfig({ ...scanConfig, personaIds });
  };

  const toggleGuardrail = (guardrail: string) => {
    const guardrails = scanConfig.guardrails.includes(guardrail)
      ? scanConfig.guardrails.filter((item) => item !== guardrail)
      : [...scanConfig.guardrails, guardrail];
    setScanConfig({ ...scanConfig, guardrails });
  };

  const skipSetup = () => {
    setSetupOpen(false);
    if (typeof window !== 'undefined') window.localStorage.setItem(SETUP_KEY, '1');
  };

  const startScan = (value?: string) => {
    const term = (value ?? query).trim();
    if (!term) return;
    router.push(`/scanning?q=${encodeURIComponent(term)}&provider=${encodeURIComponent(provider)}`);
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
        <h1>Search a storefront. Send in the buyer agents.</h1>
        <p>
          Set your scan brief, enter a merchant domain, and multiple autonomous buyer agents shop it
          in parallel — then you land straight in the storefront dashboard.
        </p>

        <div className={cn('setup-panel', !setupOpen && 'collapsed')}>
          <div className="setup-head">
            <span className="setup-title">
              <Settings2 size={14} />
              Scan brief
            </span>
            <div className="setup-head-right">
              <span className="setup-summary">
                {scanConfig.focuses.length} focus · {scanConfig.personaIds.length} agents ·{' '}
                {scanConfig.currency} {scanConfig.budget} · {scanConfig.region} · {scanConfig.depth}
              </span>
              <button className="setup-toggle" onClick={() => setSetupOpen((open) => !open)}>
                {setupOpen ? 'Hide' : 'Configure'}
              </button>
            </div>
          </div>

          {setupOpen && (
            <div className="setup-body">
              <div className="setup-group">
                <span className="setup-label">What to test</span>
                <div className="setup-chips">
                  {focusOptions.map((focus) => (
                    <button
                      key={focus}
                      className={cn('setup-chip', scanConfig.focuses.includes(focus) && 'active')}
                      onClick={() => toggleFocus(focus)}
                    >
                      {focus}
                    </button>
                  ))}
                </div>
              </div>

              <div className="setup-group">
                <span className="setup-label">Buyer agents</span>
                <div className="setup-chips">
                  {buyerPersonas.map((persona) => (
                    <button
                      key={persona.id}
                      className={cn(
                        'setup-chip',
                        scanConfig.personaIds.includes(persona.id) && 'active',
                      )}
                      onClick={() => togglePersona(persona.id)}
                    >
                      <span className={`setup-dot setup-${persona.color}`}>{persona.short}</span>
                      {persona.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="setup-group">
                <span className="setup-label">Guardrails to enforce</span>
                <div className="setup-chips">
                  {guardrailOptions.map((guardrail) => (
                    <button
                      key={guardrail}
                      className={cn(
                        'setup-chip',
                        scanConfig.guardrails.includes(guardrail) && 'active',
                      )}
                      onClick={() => toggleGuardrail(guardrail)}
                    >
                      {guardrail}
                    </button>
                  ))}
                </div>
              </div>

              <div className="setup-row">
                <label className="setup-field">
                  <span className="setup-label">Budget</span>
                  <Select
                    label="Budget"
                    value={String(scanConfig.budget)}
                    onChange={(value) => setScanConfig({ ...scanConfig, budget: Number(value) })}
                    options={budgetBands.map((band) => ({
                      value: String(band.value),
                      label: band.label,
                    }))}
                  />
                </label>
                <label className="setup-field">
                  <span className="setup-label">Currency</span>
                  <Select
                    label="Currency"
                    value={scanConfig.currency}
                    onChange={(value) => setScanConfig({ ...scanConfig, currency: value })}
                    options={currencies}
                  />
                </label>
                <label className="setup-field">
                  <span className="setup-label">Region</span>
                  <Select
                    label="Region"
                    value={scanConfig.region}
                    onChange={(value) => setScanConfig({ ...scanConfig, region: value })}
                    options={regions}
                  />
                </label>
                <label className="setup-field">
                  <span className="setup-label">Environment</span>
                  <Select
                    label="Environment"
                    value={scanConfig.environment}
                    onChange={(value) => setScanConfig({ ...scanConfig, environment: value })}
                    options={environments}
                  />
                </label>
                <label className="setup-field">
                  <span className="setup-label">Scan depth</span>
                  <Select
                    label="Scan depth"
                    value={scanConfig.depth}
                    onChange={(value) => setScanConfig({ ...scanConfig, depth: value })}
                    options={scanDepths}
                  />
                </label>
              </div>

              <button className="setup-skip" onClick={skipSetup}>
                Skip setup — use defaults
              </button>
            </div>
          )}
        </div>

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
                if (event.key === 'Enter') startScan();
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
            <Button onClick={() => startScan()} disabled={!query.trim()}>
              <Bot size={15} />
              Start scan
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
            <button key={site.id} onClick={() => startScan(site.domain)}>
              {site.domain}
            </button>
          ))}
        </div>
      </section>
<p className="portal-hint">
        Your brief feeds the intake API; the buyer agents run on the next page, then open the
        storefront dashboard automatically.
      </p>
    </div>
  );
}