'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Button,
  Card,
  CardHeader,
  EmptyState,
  LoadingLabel,
  Select,
  StatusBadge,
} from '@/components/ui/primitives';
import { gatewayClient, gatewayRequest, type EnvironmentOption } from '@/lib/gateway/client';
import type { Archetype, Draft, Scenario, Scan } from '@/lib/gateway/schemas';
import { useGateway } from './provider';
import { ErrorNotice, errorMessage, FixtureBadge, ScanResults } from './shared';

type DraftSummary = Pick<
  Draft,
  'id' | 'merchantUrl' | 'revision' | 'approvedAt' | 'fixture' | 'createdAt'
>;
const choices = {
  expertise: ['novice', 'intermediate', 'expert'],
  budgetSensitivity: ['low', 'medium', 'high'],
  comparisonDepth: ['shallow', 'moderate', 'deep'],
  patience: ['low', 'medium', 'high'],
  substitutionTolerance: ['none', 'low', 'high'],
  discoveryStrategy: ['search', 'browse', 'mixed'],
};
const labels = {
  expertise: 'Expertise',
  budgetSensitivity: 'Budget sensitivity',
  comparisonDepth: 'Comparison depth',
  patience: 'Patience',
  substitutionTolerance: 'Substitution tolerance',
  discoveryStrategy: 'Discovery strategy',
};
export function GatewayWorkflow() {
  const { execute, activeScan, error: runError } = useGateway();
  const [environments, setEnvironments] = useState<EnvironmentOption[]>([]);
  const [environmentId, setEnvironmentId] = useState('');
  const [url, setUrl] = useState('');
  const [draft, setDraft] = useState<Draft | null>(null);
  const [savedDrafts, setSavedDrafts] = useState<DraftSummary[]>([]);
  const [archetypes, setArchetypes] = useState<Archetype[]>([]);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [reviewed, setReviewed] = useState(false);
  const [busy, setBusy] = useState('Loading environments…');
  const [error, setError] = useState('');
  const [scanId, setScanId] = useState<string | null>(null);
  const lock = useRef(false);
  function adoptDraft(value: Draft) {
    setDraft(value);
    setArchetypes(value.archetypes);
    setScenarios(value.scenarios);
    setReviewed(false);
    setEnvironmentId(value.environmentId);
    setUrl(value.merchantUrl);
    setScanId(null);
    const location = new URL(window.location.href);
    location.searchParams.set('draft', value.id);
    window.history.replaceState(null, '', location);
  }
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [envs, drafts] = await Promise.all([
          gatewayClient.environments(),
          gatewayClient.drafts(),
        ]);
        if (cancelled) return;
        setEnvironments(envs.items);
        setSavedDrafts(drafts.items);
        setEnvironmentId(envs.items[0]?.id || '');
        setUrl(envs.items[0]?.entryUrl || envs.items[0]?.origin || '');
        const id = new URLSearchParams(window.location.search).get('draft');
        if (id) {
          const value = await gatewayClient.draft(id);
          if (!cancelled) adoptDraft(value);
        }
      } catch (error) {
        if (!cancelled) setError(errorMessage(error));
      } finally {
        if (!cancelled) setBusy('');
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);
  useEffect(() => {
    setReviewed(false);
  }, [archetypes, scenarios]);
  const dirty =
    !!draft &&
    (JSON.stringify(archetypes) !== JSON.stringify(draft.archetypes) ||
      JSON.stringify(scenarios) !== JSON.stringify(draft.scenarios));
  const running = !!activeScan && ['queued', 'running'].includes(activeScan.status);
  async function perform(label: string, task: () => Promise<void>) {
    if (lock.current) return;
    lock.current = true;
    setBusy(label);
    setError('');
    try {
      await task();
    } catch (error) {
      setError(errorMessage(error));
    } finally {
      lock.current = false;
      setBusy('');
    }
  }
  function changeTarget() {
    setDraft(null);
    setArchetypes([]);
    setScenarios([]);
    setReviewed(false);
    setScanId(null);
    const location = new URL(window.location.href);
    location.searchParams.delete('draft');
    window.history.replaceState(null, '', location);
  }
  const inspect = () =>
    perform('Inspecting storefront and generating a test plan…', async () => {
      const normalized = /^https?:\/\//i.test(url.trim()) ? url.trim() : `https://${url.trim()}`;
      const value = await gatewayRequest<Draft>('/drafts', {
        method: 'POST',
        body: { merchantUrl: normalized, environmentId },
      });
      adoptDraft(value);
      setSavedDrafts((current) => [value, ...current.filter((item) => item.id !== value.id)]);
    });
  const save = (approved: boolean) =>
    perform(approved ? 'Approving test plan…' : 'Saving changes…', async () => {
      const value = await gatewayRequest<Draft>(`/drafts/${draft!.id}`, {
        method: 'PATCH',
        body: { revision: draft!.revision, archetypes, scenarios, approved },
      });
      adoptDraft(value);
      setSavedDrafts((current) => current.map((item) => (item.id === value.id ? value : item)));
    });
  const start = () =>
    perform('Creating scan…', async () => {
      const scan = await gatewayRequest<Scan>('/scans', {
        method: 'POST',
        body: { draftId: draft!.id, revision: draft!.revision },
      });
      setScanId(scan.id);
      execute(scan);
    });
  return (
    <div className="gateway-stack">
      <Card className="gateway-panel">
        <div className="gateway-entry-heading">
          <div className="eyebrow">NEW TEST RUN</div>
          <h2>Choose your storefront</h2>
          <p>Select an authorized environment and the page you want to explore.</p>
        </div>
        <fieldset className="gateway-review" disabled={!!busy || running}>
          <div className="gateway-form-row">
            <label>
              Test environment
              <Select
                label="Test environment"
                value={environmentId}
                options={environments.map((env) => ({
                  value: env.id,
                  label: `${env.id} · ${env.origin}`,
                }))}
                onChange={(id) => {
                  changeTarget();
                  setEnvironmentId(id);
                  const selected = environments.find((env) => env.id === id);
                  setUrl(selected?.entryUrl || selected?.origin || '');
                }}
              />
            </label>
            <label>
              Storefront URL
              <input
                aria-label="Storefront URL"
                placeholder="https://staging.example.com/"
                value={url}
                onChange={(event) => {
                  changeTarget();
                  setUrl(event.target.value);
                }}
              />
            </label>
            <Button
              onClick={() => void inspect()}
              disabled={!!busy || running || !url.trim() || !environmentId}
            >
              Inspect storefront
            </Button>
          </div>
        </fieldset>
        <p>
          Choose an authorized storefront, then review the proposed shoppers and goals before
          running them.
        </p>
        {!busy && !environments.length && !error && (
          <EmptyState
            title="No test environments configured"
            description="Add your authorized storefront to GATEWAY_TEST_ENVIRONMENTS on the server, then reload this page."
          />
        )}
      </Card>
      <ErrorNotice message={error} />
      {error.includes('Sign in') && (
        <Button asChild variant="outline">
          <Link href="/login">Sign in</Link>
        </Button>
      )}
      {busy && (
        <div className="gateway-loading" role="status">
          <LoadingLabel>{busy}</LoadingLabel>
        </div>
      )}
      {!draft && savedDrafts.length > 0 && (
        <Card>
          <CardHeader title="Continue a saved test plan" />
          <div className="gateway-panel">
            {savedDrafts.map((item) => (
              <Button
                key={item.id}
                variant="outline"
                disabled={!!busy}
                onClick={() =>
                  void perform('Loading draft…', async () =>
                    adoptDraft(await gatewayClient.draft(item.id)),
                  )
                }
              >
                {item.merchantUrl} · revision {item.revision}
              </Button>
            ))}
          </div>
        </Card>
      )}
      {draft && (
        <>
          <Card>
            <CardHeader
              title={draft.context.merchantName}
              subtitle={draft.context.description}
              action={<FixtureBadge fixture={draft.fixture} />}
            />
            <div className="gateway-panel">
              <div className="gateway-toolbar">
                <StatusBadge tone={draft.approvedAt && !dirty ? 'green' : 'amber'}>
                  {draft.approvedAt && !dirty ? 'Approved' : 'Review required'}
                </StatusBadge>
                <span>Revision {draft.revision}</span>
                <span>{draft.evidence.length} sampled pages</span>
              </div>
              <p>
                These shopper archetypes are hypotheses inferred from site evidence, not measured
                demographics or traffic shares.
              </p>
              <details>
                <summary>Site evidence and sampling limits</summary>
                {draft.context.claims.map((claim, i) => (
                  <p key={i}>
                    {claim.claim}{' '}
                    <small>
                      Sources:{' '}
                      {claim.evidenceIds
                        .map((id) => draft.evidence.find((item) => item.id === id)?.title || id)
                        .join(', ')}
                    </small>
                  </p>
                ))}
                {draft.context.limitations.map((limit, i) => (
                  <p key={i}>{limit}</p>
                ))}
                {draft.evidence.map((evidence) => (
                  <details key={evidence.id}>
                    <summary>{evidence.title || evidence.url}</summary>
                    <a href={evidence.url} target="_blank" rel="noreferrer">
                      {evidence.url}
                    </a>
                    <pre className="gateway-observation">{evidence.text}</pre>
                  </details>
                ))}
              </details>
            </div>
          </Card>
          <fieldset className="gateway-review" disabled={!!busy || running}>
            <Card>
              <CardHeader
                title="Review customer archetypes"
                subtitle="Edit the behavioral hypotheses to match the customers you want to test."
              />
              <div className="gateway-panel gateway-stack">
                {archetypes.map((archetype, index) => (
                  <section className="gateway-editor" key={archetype.id}>
                    <label>
                      Archetype name
                      <input
                        aria-label={`Archetype ${index + 1} name`}
                        value={archetype.name}
                        onChange={(event) =>
                          setArchetypes((all) =>
                            all.map((item, i) =>
                              i === index ? { ...item, name: event.target.value } : item,
                            ),
                          )
                        }
                      />
                    </label>
                    <label>
                      Behavioral hypothesis
                      <textarea
                        value={archetype.hypothesis}
                        onChange={(event) =>
                          setArchetypes((all) =>
                            all.map((item, i) =>
                              i === index ? { ...item, hypothesis: event.target.value } : item,
                            ),
                          )
                        }
                      />
                    </label>
                    <div className="gateway-form-grid">
                      {(Object.keys(choices) as (keyof typeof choices)[]).map((key) => (
                        <label key={key}>
                          {labels[key]}
                          <Select
                            label={`${archetype.name} ${labels[key]}`}
                            options={choices[key]}
                            value={archetype[key]}
                            onChange={(value) =>
                              setArchetypes((all) =>
                                all.map((item, i) =>
                                  i === index ? ({ ...item, [key]: value } as Archetype) : item,
                                ),
                              )
                            }
                          />
                        </label>
                      ))}
                    </div>
                    <small>Evidence: {archetype.provenance.rationale}</small>
                  </section>
                ))}
              </div>
            </Card>
            <Card>
              <CardHeader
                title="Review shopping scenarios"
                subtitle="Archetype and test mode are independent. Include all three modes and at least one expected decline."
              />
              <div className="gateway-panel gateway-stack">
                {scenarios.map((scenario, index) => {
                  const update = (patch: Partial<Scenario>) =>
                    setScenarios((all) =>
                      all.map((item, i) => (i === index ? { ...item, ...patch } : item)),
                    );
                  return (
                    <section className="gateway-editor" key={scenario.id}>
                      <label>
                        Goal {index + 1}
                        <textarea
                          aria-label={`Scenario ${index + 1} goal`}
                          value={scenario.goal}
                          onChange={(event) => update({ goal: event.target.value })}
                        />
                      </label>
                      <div className="gateway-form-grid">
                        <label>
                          Archetype
                          <Select
                            label={`Scenario ${index + 1} archetype`}
                            value={scenario.archetypeId}
                            options={archetypes.map((item) => ({
                              value: item.id,
                              label: item.name,
                            }))}
                            onChange={(archetypeId) => update({ archetypeId })}
                          />
                        </label>
                        <label>
                          Test mode
                          <Select
                            label={`Scenario ${index + 1} mode`}
                            value={scenario.mode}
                            options={['legitimate', 'constraint', 'red_team']}
                            onChange={(mode) => update({ mode: mode as Scenario['mode'] })}
                          />
                        </label>
                        <label>
                          Expected outcome
                          <Select
                            label={`Scenario ${index + 1} expected outcome`}
                            value={scenario.expectedOutcome}
                            options={['recommend', 'decline']}
                            onChange={(expectedOutcome) =>
                              update({
                                expectedOutcome: expectedOutcome as Scenario['expectedOutcome'],
                              })
                            }
                          />
                        </label>
                      </div>
                      <label>
                        Soft preferences (one per line)
                        <textarea
                          value={scenario.softPreferences.join('\n')}
                          onChange={(event) =>
                            update({ softPreferences: event.target.value.split('\n') })
                          }
                          onBlur={() =>
                            update({
                              softPreferences: scenario.softPreferences
                                .map((value) => value.trim())
                                .filter(Boolean),
                            })
                          }
                        />
                      </label>
                      <h4>Hard constraints</h4>
                      {scenario.hardConstraints.map((constraint, ci) => (
                        <div className="gateway-constraint" key={ci}>
                          <Select
                            label={`Scenario ${index + 1} constraint ${ci + 1} type`}
                            value={constraint.kind}
                            options={['max_price', 'currency', 'text_contains', 'text_excludes']}
                            onChange={(kind) =>
                              update({
                                hardConstraints: scenario.hardConstraints.map((item, i) =>
                                  i === ci ? { ...item, kind: kind as typeof item.kind } : item,
                                ),
                              })
                            }
                          />
                          <input
                            aria-label={`Scenario ${index + 1} constraint ${ci + 1} value`}
                            value={constraint.value}
                            onChange={(event) =>
                              update({
                                hardConstraints: scenario.hardConstraints.map((item, i) =>
                                  i === ci ? { ...item, value: event.target.value } : item,
                                ),
                              })
                            }
                          />
                          <input
                            aria-label={`Scenario ${index + 1} constraint ${ci + 1} description`}
                            value={constraint.description}
                            onChange={(event) =>
                              update({
                                hardConstraints: scenario.hardConstraints.map((item, i) =>
                                  i === ci ? { ...item, description: event.target.value } : item,
                                ),
                              })
                            }
                          />
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              update({
                                hardConstraints: scenario.hardConstraints.filter(
                                  (_, i) => i !== ci,
                                ),
                              })
                            }
                          >
                            Remove constraint
                          </Button>
                        </div>
                      ))}
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={scenario.hardConstraints.length >= 12}
                        onClick={() =>
                          update({
                            hardConstraints: [
                              ...scenario.hardConstraints,
                              {
                                kind: 'max_price',
                                value: '100',
                                description: 'Maximum product price',
                              },
                            ],
                          })
                        }
                      >
                        Add constraint
                      </Button>
                      <div className="gateway-toolbar">
                        {(['navigate', 'search', 'inspect_product', 'stop'] as const).map(
                          (action) => (
                            <label className="gateway-checkbox" key={action}>
                              <input
                                type="checkbox"
                                checked={scenario.permittedActions.includes(action)}
                                onChange={(event) =>
                                  update({
                                    permittedActions: event.target.checked
                                      ? [...scenario.permittedActions, action]
                                      : scenario.permittedActions.filter((item) => item !== action),
                                  })
                                }
                              />
                              {action.replaceAll('_', ' ')}
                            </label>
                          ),
                        )}
                      </div>
                      <p>Stop at: recommend a product or decline.</p>
                      <small>Evidence: {scenario.provenance.rationale}</small>
                    </section>
                  );
                })}
              </div>
            </Card>
          </fieldset>
          <Card className="gateway-panel">
            <label className="gateway-checkbox">
              <input
                type="checkbox"
                checked={reviewed}
                onChange={(event) => setReviewed(event.target.checked)}
                disabled={!!busy || running}
              />
              I reviewed these archetypes, goals, constraints, and permitted actions.
            </label>
            <div className="gateway-toolbar">
              <Button
                variant="outline"
                disabled={!!busy || running || !dirty}
                onClick={() => void save(false)}
              >
                Save changes
              </Button>
              <Button disabled={!!busy || running || !reviewed} onClick={() => void save(true)}>
                Approve test plan
              </Button>
              <Button
                disabled={!!busy || running || dirty || !draft.approvedAt}
                onClick={() => void start()}
              >
                Run approved scan
              </Button>
              {error.includes('Reload') && (
                <Button
                  variant="outline"
                  onClick={() =>
                    void perform('Loading latest revision…', async () =>
                      adoptDraft(await gatewayClient.draft(draft.id)),
                    )
                  }
                >
                  Reload latest revision
                </Button>
              )}
            </div>
          </Card>
        </>
      )}
      <ErrorNotice message={runError} />
      {activeScan && (scanId === activeScan.id || activeScan.draft.id === draft?.id) && (
        <>
          <Button asChild variant="outline">
            <Link href={`/scan?scanId=${activeScan.id}`}>Open saved scan</Link>
          </Button>
          <ScanResults scan={activeScan} />
        </>
      )}
      <div className="gateway-toolbar">
        <Button asChild variant="outline">
          <Link href="/dashboard">Open dashboard</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/sessions">Browse sessions</Link>
        </Button>
      </div>
    </div>
  );
}
