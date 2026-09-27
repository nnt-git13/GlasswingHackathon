'use client';
import { useEffect, useRef, useState } from 'react';
import {
  ArrowUpRight,
  ChevronDown,
  Plus,
  Sparkles,
  Globe2,
  UsersRound,
  ShoppingBag,
  Clock3,
  LoaderCircle,
  CheckCircle2,
} from 'lucide-react';
import { Button, Card, CardHeader, StatusBadge } from '@/components/ui/primitives';
import { ErrorNotice, FixtureBadge } from '@/components/gateway/shared';
import { gatewayRequest } from '@/lib/gateway/client';
import type { Scan } from '@/lib/gateway/schemas';
import type { DemandReport, DemandRequest } from '@/lib/gateway/demand';
import styles from '@/app/demand-signal/demand.module.css';

const verdictLabels = {
  attractive: 'Attractive',
  consider: 'Would consider',
  unattractive: 'Unattractive',
  insufficient_evidence: 'More evidence needed',
};
const priceLabels = {
  appropriate: 'Price fits',
  high: 'Price feels high',
  low: 'Price feels low',
  unknown: 'Price not assessed',
};
function excerpt(text: string, limit = 160) {
  if (text.length <= limit) return text;
  const firstSentence = text.match(/^.*?[.!?](?:\s|$)/)?.[0]?.trim();
  if (firstSentence && firstSentence.length <= limit) return firstSentence;
  const clipped = text.slice(0, limit);
  return `${clipped.slice(0, clipped.lastIndexOf(' ') > limit / 2 ? clipped.lastIndexOf(' ') : limit).trim()}…`;
}
export function NewProductAssessment({ scan, onSaved }: { scan: Scan; onSaved: () => void }) {
  const observations = [
    ...scan.draft.evidence,
    ...scan.sessions.flatMap((session) =>
      session.trace.flatMap((event) => (event.observation ? [event.observation] : [])),
    ),
  ];
  const pages = [...new Set([scan.draft.merchantUrl, ...observations.map((item) => item.url)])];
  const initialCurrency =
    observations.flatMap((item) => item.products).find((product) => product.currency)?.currency ||
    'USD';
  const [open, setOpen] = useState(false);
  const [product, setProduct] = useState<DemandRequest>({
    name: '',
    description: '',
    price: 0,
    currency: initialCurrency,
    pageUrl: scan.draft.merchantUrl,
    trafficNotes: '',
  });
  const [running, setRunning] = useState(false);
  const [error, setError] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const loadingView = useRef<HTMLElement>(null);
  useEffect(() => {
    if (running && loadingView.current) {
      loadingView.current.focus({ preventScroll: true });
      loadingView.current.scrollIntoView({
        block: 'start',
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
          ? 'instant'
          : 'smooth',
      });
    }
  }, [running]);
  useEffect(() => {
    if (!running) return;
    const started = Date.now();
    const timer = setInterval(() => setElapsed(Math.floor((Date.now() - started) / 1000)), 1000);
    return () => clearInterval(timer);
  }, [running]);
  const [selected, setSelected] = useState<DemandReport | null>(null);
  const report = selected || scan.demandReports?.[0];
  const counts = report
    ? Object.entries(verdictLabels).map(([verdict, label]) => ({
        label,
        count: report.result.profiles.filter((profile) => profile.verdict === verdict).length,
      }))
    : [];
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (running) return;
    setElapsed(0);
    setRunning(true);
    setError('');
    try {
      const result = await gatewayRequest<DemandReport>(`/scans/${scan.id}/demand`, {
        method: 'POST',
        body: product,
      });
      setSelected(result);
      setOpen(false);
      onSaved();
    } catch (error) {
      setError(
        error instanceof Error ? error.message : 'Unable to assess the product. Please retry.',
      );
    } finally {
      setRunning(false);
    }
  };
  const busyScan = ['running', 'queued'].includes(scan.status);
  return (
    <Card className={styles.assessment}>
      <CardHeader
        title="Test a new product"
        subtitle="Place a proposed product in this page's context and assess its appeal to your reviewed shoppers."
        action={
          running ? (
            <span className={styles.pendingBadge}>
              <LoaderCircle size={14} />
              Assessment running
            </span>
          ) : (
            <Button
              variant={open ? 'outline' : 'default'}
              onClick={() => setOpen(!open)}
              disabled={busyScan}
            >
              <Plus size={14} />
              {open ? 'Close product form' : 'Add new product'}
              <ChevronDown size={14} />
            </Button>
          )
        }
      />
      {busyScan && (
        <p className={styles.assessmentNote}>
          Finish the current storefront run to assess a new product against its evidence.
        </p>
      )}
      <ErrorNotice message={error} />
      {open && !running && (
        <form className={styles.productForm} onSubmit={submit}>
          <div className={styles.entryLayout}>
            <div className={styles.entrySections}>
              <section className={styles.entrySection}>
                <div className={styles.sectionHeading}>
                  <span>01</span>
                  <div>
                    <h3>Choose where it belongs</h3>
                    <p>Assess the concept in a page your shoppers already explored.</p>
                  </div>
                </div>
                <label>
                  Existing storefront page
                  <select
                    required
                    value={product.pageUrl}
                    onChange={(event) => setProduct({ ...product, pageUrl: event.target.value })}
                  >
                    {pages.map((page) => (
                      <option key={page} value={page}>
                        {page}
                      </option>
                    ))}
                  </select>
                </label>
              </section>
              <section className={styles.entrySection}>
                <div className={styles.sectionHeading}>
                  <span>02</span>
                  <div>
                    <h3>Describe your product</h3>
                    <p>Give shoppers the details they would see before deciding.</p>
                  </div>
                </div>
                <div className={styles.productFields}>
                  <label className={styles.fullWidth}>
                    Product name
                    <input
                      required
                      maxLength={200}
                      value={product.name}
                      onChange={(event) => setProduct({ ...product, name: event.target.value })}
                      placeholder="e.g. Weekend 90 All-Mountain Skis"
                    />
                  </label>
                  <label>
                    Price
                    <div className={styles.priceInput}>
                      <span>{product.currency}</span>
                      <input
                        required
                        aria-label="Price"
                        type="number"
                        min="0"
                        max="10000000"
                        step="0.01"
                        value={product.price}
                        onChange={(event) =>
                          setProduct({ ...product, price: Number(event.target.value) })
                        }
                      />
                    </div>
                  </label>
                  <label>
                    Currency
                    <select
                      value={product.currency}
                      onChange={(event) => setProduct({ ...product, currency: event.target.value })}
                    >
                      {[
                        ...new Set([initialCurrency, 'USD', 'CAD', 'EUR', 'GBP', 'AUD', 'JPY']),
                      ].map((currency) => (
                        <option key={currency}>{currency}</option>
                      ))}
                    </select>
                  </label>
                  <label className={styles.fullWidth}>
                    Product description
                    <textarea
                      required
                      minLength={10}
                      maxLength={4000}
                      rows={4}
                      value={product.description}
                      onChange={(event) =>
                        setProduct({ ...product, description: event.target.value })
                      }
                      placeholder="What is it, who is it for, and why would they choose it? Include specifications and benefits."
                    />
                  </label>
                </div>
              </section>
              <details className={styles.trafficDisclosure}>
                <summary>
                  <UsersRound size={16} />
                  <div>
                    <strong>Add traffic context</strong>
                    <span>Optional · ground the assessment in your audience data</span>
                  </div>
                  <ChevronDown size={16} />
                </summary>
                <label>
                  Existing traffic context (optional)
                  <textarea
                    maxLength={4000}
                    rows={3}
                    aria-label="Existing traffic context (optional)"
                    aria-describedby="traffic-context-help"
                    value={product.trafficNotes}
                    onChange={(event) =>
                      setProduct({ ...product, trafficNotes: event.target.value })
                    }
                    placeholder="Paste page analytics or describe existing visitors. Include the source and date."
                  />
                  <small id="traffic-context-help">
                    Traffic figures you provide are user-reported. Without them, we use the store’s
                    scan-inferred shopper profiles.
                  </small>
                </label>
              </details>
            </div>
            <aside className={styles.assessmentContext}>
              <span className={styles.contextIcon}>
                <Sparkles size={22} />
              </span>
              <span className={styles.eyebrow}>YOUR ASSESSMENT</span>
              <h3>A product decision, in context</h3>
              <p>
                We’ll compare your concept with the store evidence and the shoppers reviewed for
                this run.
              </p>
              <div className={styles.contextFact}>
                <Globe2 size={16} />
                <div>
                  <strong>{new URL(scan.draft.merchantUrl).hostname}</strong>
                  <span>{observations.length} recorded page observations</span>
                </div>
              </div>
              <div className={styles.contextFact}>
                <UsersRound size={16} />
                <div>
                  <strong>{scan.draft.archetypes.length} reviewed shopper profiles</strong>
                  <span>
                    {product.trafficNotes.trim()
                      ? 'Includes your traffic context'
                      : 'Inferred from storefront evidence'}
                  </span>
                </div>
              </div>
              <div className={styles.contextOutputs}>
                <strong>What you’ll get</strong>
                {[
                  'Product appeal for each profile',
                  'Price fit and likely objections',
                  'Positioning and next steps',
                ].map((item) => (
                  <span key={item}>
                    <CheckCircle2 size={14} />
                    {item}
                  </span>
                ))}
              </div>
              <small>Saved as a concept in Gateway. Website publishing is separate.</small>
            </aside>
          </div>
          <div className={styles.formFooter}>
            <span>
              <ShoppingBag size={15} />
              Ready to test your concept?
            </span>
            <div>
              <Button variant="outline" type="button" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">
                <Sparkles size={14} />
                Assess product &amp; price
                <ArrowUpRight size={14} />
              </Button>
            </div>
          </div>
        </form>
      )}
      {running && (
        <section
          ref={loadingView}
          tabIndex={-1}
          className={styles.loadingPanel}
          aria-label="Product assessment in progress"
          aria-busy="true"
        >
          <div className={styles.loadingHero}>
            <span className={styles.loadingOrb}>
              <Sparkles size={28} />
            </span>
            <div>
              <span className={styles.eyebrow}>ASSESSING YOUR PRODUCT</span>
              <h2>{product.name}</h2>
              <p>
                {product.currency} {product.price.toLocaleString()} ·{' '}
                {new URL(product.pageUrl).hostname}
                {new URL(product.pageUrl).pathname}
              </p>
            </div>
            <span className={styles.elapsed}>
              <Clock3 size={14} />
              {Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, '0')} elapsed
            </span>
          </div>
          <div className={styles.indeterminate} aria-hidden="true">
            <span />
          </div>
          <div className={styles.loadingMessage} role="status">
            <LoaderCircle size={17} />
            <div>
              <strong>Evaluating product appeal and price</strong>
              <p>
                {elapsed >= 45
                  ? 'The assessment is still running. Your product details are preserved while we wait for the model response.'
                  : 'Using the recorded page evidence and reviewed shopper profiles to prepare your assessment.'}
              </p>
            </div>
          </div>
          <div className={styles.loadingInputs}>
            {[
              {
                icon: Globe2,
                label: 'Store context',
                detail: new URL(scan.draft.merchantUrl).hostname,
              },
              {
                icon: ShoppingBag,
                label: 'Product & price',
                detail: `${product.currency} ${product.price.toLocaleString()}`,
              },
              {
                icon: UsersRound,
                label: 'Shopper perspectives',
                detail: `${scan.draft.archetypes.length} reviewed profiles`,
              },
            ].map((item) => (
              <div key={item.label}>
                <item.icon size={18} />
                <div>
                  <strong>{item.label}</strong>
                  <span>{item.detail}</span>
                </div>
              </div>
            ))}
          </div>
          <div className={styles.loadingProfiles}>
            <span>Profiles included</span>
            {scan.draft.archetypes.map((profile) => (
              <span className={styles.profileChip} key={profile.id}>
                <i>{profile.name.charAt(0)}</i>
                {profile.name}
              </span>
            ))}
          </div>
          <div className={styles.skeletonGrid} aria-hidden="true">
            {['Product appeal', 'Price feedback', 'Positioning & next steps'].map((label) => (
              <div key={label}>
                <span>{label}</span>
                <i />
                <i />
                <i />
              </div>
            ))}
          </div>
          <p className={styles.loadingFootnote}>
            Your assessment will appear here and be saved with this storefront run.
          </p>
        </section>
      )}
      {!running && report ? (
        <section className={styles.assessmentResults}>
          <div className={styles.reportHeading}>
            <div>
              <span className={styles.eyebrow}>PROPOSED PRODUCT ASSESSMENT</span>
              <h2>{report.product.name}</h2>
              <p>
                {report.product.currency} {report.product.price.toLocaleString()} ·{' '}
                <a href={report.product.pageUrl} target="_blank" rel="noreferrer">
                  {new URL(report.product.pageUrl).pathname}
                  <ArrowUpRight size={12} />
                </a>{' '}
                · {new Date(report.createdAt).toLocaleString()}
              </p>
            </div>
            <FixtureBadge fixture={report.fixture} />
          </div>
          <p className={styles.assessmentSummary}>{excerpt(report.result.summary, 240)}</p>
          {report.result.summary.length > 240 && (
            <details className={styles.reportDisclosure}>
              <summary>
                Full assessment summary <ChevronDown size={13} />
              </summary>
              <p>{report.result.summary}</p>
            </details>
          )}
          <div className={styles.assessmentMetrics}>
            {counts.map((count) => (
              <div key={count.label}>
                <span>{count.label}</span>
                <strong>{count.count}</strong>
                <small>reviewed shopper profiles</small>
              </div>
            ))}
          </div>
          <details className={styles.audienceDisclosure}>
            <summary>
              <UsersRound size={14} />
              <span>
                {report.product.trafficNotes
                  ? 'Includes user-reported traffic context.'
                  : 'Scan-inferred profiles · no traffic analytics supplied'}
              </span>
              <span>About this audience</span>
              <ChevronDown size={13} />
            </summary>
            <p>{report.result.trafficLimitations}</p>
          </details>
          <div className={styles.profileResults}>
            {report.result.profiles.map((profile) => {
              const name =
                scan.draft.archetypes.find((item) => item.id === profile.archetypeId)?.name ||
                profile.archetypeId;
              return (
                <article
                  className={styles.profileResult}
                  key={profile.archetypeId}
                  data-verdict={profile.verdict}
                >
                  <div className={styles.profileIdentity}>
                    <span>
                      {name
                        .split(' ')
                        .slice(0, 2)
                        .map((word) => word.charAt(0))
                        .join('')}
                    </span>
                    <strong>{name}</strong>
                  </div>
                  <div className={styles.verdictRow}>
                    <StatusBadge
                      tone={
                        profile.verdict === 'attractive'
                          ? 'green'
                          : profile.verdict === 'unattractive'
                            ? 'red'
                            : 'amber'
                      }
                    >
                      {verdictLabels[profile.verdict]}
                    </StatusBadge>
                    <span>{priceLabels[profile.priceFit]}</span>
                  </div>
                  <p className={styles.profileTakeaway}>{excerpt(profile.reasoning)}</p>
                  {profile.objections.length > 0 && (
                    <div className={styles.profileConcern}>
                      <span>KEY CONCERN</span>
                      <p>{excerpt(profile.objections[0], 100)}</p>
                    </div>
                  )}
                  <details className={styles.profileDetails}>
                    <summary>
                      Reasoning &amp; sources <small>{profile.evidenceIds.length}</small>
                      <ChevronDown size={14} />
                    </summary>
                    <div>
                      <p>{profile.reasoning}</p>
                      {profile.objections.length > 0 && (
                        <>
                          <h4>Objections</h4>
                          <ul>
                            {profile.objections.map((objection) => (
                              <li key={objection}>{objection}</li>
                            ))}
                          </ul>
                        </>
                      )}
                      <h4>Supporting pages</h4>
                      <div className={styles.compactSources}>
                        {profile.evidenceIds.map((id) => {
                          const evidence = observations.find((item) => item.id === id);
                          return evidence ? (
                            <a
                              key={id}
                              href={evidence.url}
                              target="_blank"
                              rel="noreferrer"
                              title={evidence.title || evidence.url}
                            >
                              {evidence.title || new URL(evidence.url).pathname}
                              <ArrowUpRight size={12} />
                            </a>
                          ) : null;
                        })}
                      </div>
                    </div>
                  </details>
                </article>
              );
            })}
          </div>
          <div className={styles.nextSteps}>
            <div>
              <h3>Positioning to test</h3>
              <p className={styles.compactText}>{excerpt(report.result.positioning, 180)}</p>
              {report.result.positioning.length > 180 && (
                <details className={styles.inlineDisclosure}>
                  <summary>Full positioning advice</summary>
                  <p>{report.result.positioning}</p>
                </details>
              )}
            </div>
            <div>
              <h3>Recommended next steps</h3>
              <ul>
                {report.result.nextSteps.map((step) => (
                  <li key={step} className={styles.compactText}>
                    {excerpt(step, 140)}
                  </li>
                ))}
              </ul>
              {report.result.nextSteps.some((step) => step.length > 140) && (
                <details className={styles.inlineDisclosure}>
                  <summary>Full recommended actions</summary>
                  <ul>
                    {report.result.nextSteps.map((step) => (
                      <li key={step}>{step}</li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          </div>
          {(scan.demandReports?.length || 0) > 1 && (
            <div className={styles.reportHistory}>
              <span>Saved product assessments</span>
              {scan.demandReports?.map((saved) => (
                <button
                  key={saved.id}
                  onClick={() => setSelected(saved)}
                  aria-pressed={saved.id === report.id}
                >
                  {saved.product.name} · {saved.product.currency} {saved.product.price}
                </button>
              ))}
            </div>
          )}
        </section>
      ) : (
        !open &&
        !running && (
          <p className={styles.assessmentNote}>
            Add a product and price to generate profile-specific appeal, price feedback, objections,
            and positioning suggestions grounded in your storefront.
          </p>
        )
      )}
    </Card>
  );
}
