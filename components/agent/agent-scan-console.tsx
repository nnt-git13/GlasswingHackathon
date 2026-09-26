'use client';
import { AgentResults } from '@/components/agent/agent-results';
import {
  Button,
  Card,
  CardHeader,
  LoadingLabel,
  Select,
  StatusBadge,
} from '@/components/ui/primitives';
import type { AgentScanResult } from '@/lib/agent/types';
import { Bot, Play } from 'lucide-react';
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
  'Order the Summit Trail 45L backpack in Forest, 45L capacity',
  'Buy an insulated jacket under $180',
];

export function AgentScanConsole() {
  const [input, setInput] = useState(defaultGoals.join('\n'));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState<AgentScanResponse | null>(null);
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [provider, setProvider] = useState('sciforium');

  useEffect(() => {
    fetch('/api/agent-scan')
      .then((response) => response.json())
      .then((payload: { providers: ProviderInfo[]; defaultProvider: string }) => {
        setProviders(payload.providers);
        setProvider(payload.defaultProvider);
      })
      .catch(() => undefined);
  }, []);

  const runScan = async () => {
    const goals = input
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
    if (!goals.length) return;
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/agent-scan', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ goals, provider }),
      });
      if (!response.ok) throw new Error(`Request failed with status ${response.status}`);
      setData((await response.json()) as AgentScanResponse);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Scan failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Card className="agent-console">
        <CardHeader
          title="Run an agent against the storefront"
          subtitle={`Autonomous agent evaluating ${data?.storefront ?? 'evertrailoutdoors.com'} · one goal per line`}
          icon={
            <span className="section-icon">
              <Bot size={16} />
            </span>
          }
          action={
            <div className="agent-provider">
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
              {data && (
                <StatusBadge tone={data.configured ? 'green' : 'amber'}>
                  {data.configured ? `live · ${data.model}` : 'scripted (no key)'}
                </StatusBadge>
              )}
            </div>
          }
        />
        <textarea
          className="agent-console-input"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          rows={4}
          aria-label="Shopping goals, one per line"
        />
        <div className="agent-console-actions">
          <Button onClick={runScan} disabled={loading}>
            {loading ? (
              <LoadingLabel>Agent shopping…</LoadingLabel>
            ) : (
              <>
                <Play size={14} />
                Run agent scan
              </>
            )}
          </Button>
          {error && <span className="demo-indicator">{error}</span>}
          {data && !loading && (
            <span className="agent-console-tally">
              <strong>{data.succeeded}</strong> completed · <strong>{data.failed}</strong> failed ·{' '}
              {data.goalCount} goals
            </span>
          )}
        </div>
      </Card>

      {data && <AgentResults results={data.results} />}
    </>
  );
}