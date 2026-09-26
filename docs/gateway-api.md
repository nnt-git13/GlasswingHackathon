# Gateway AI service (v1)

The backend is part of the existing Next.js application. It uses the existing Supabase session cookie, owner-scoped JSON files, and a shared Playwright shopper runner. The Discover, dashboard, scan, sessions, replay and findings pages call these APIs. Discover provides merchant review and explicit approval; the shared app provider polls persisted progress across navigation and reloads.

## Setup

1. Configure Supabase as described in `supabase/README.md` and sign in.
2. Run `npm install` and `npx playwright install chromium`.
3. Copy `.env.example` to `.env.local`. Set `OPENAI_API_KEY` and replace `GATEWAY_TEST_ENVIRONMENTS` with an explicitly authorized staging/test storefront. Each environment has an exact `origin`, read-only `allowedPathPrefixes`, a `searchPath`, and `searchQueryParam`. Optional `entryPath` prepopulates the environment picker with a catalog path or query instead of the origin root. Clients select an environment ID; they cannot supply or expand its access policy.
4. Run `npm run dev`. Use a **single persistent Node process** and a persistent, writable `GATEWAY_DATA_DIR` in deployments. The default is `.gateway-data/`, which is gitignored. Protect this directory as merchant data; it contains page text, observations and traces. There is no automatic retention/deletion policy in this prototype.

`GATEWAY_SYNTHESIS_MODEL` defaults to `gpt-6-luna`; shopper and independent evaluator default to `gpt-6-sol`. Overrides use `GATEWAY_SHOPPER_MODEL` and `GATEWAY_EVALUATOR_MODEL`. Models must be available to the configured account and support strict structured outputs. The provider uses the [OpenAI Responses structured-output API](https://developers.openai.com/api/docs/guides/structured-outputs), then validates results with Zod and checks evidence references on the server. There is no automatic fallback to another model.

Set `GATEWAY_MODEL_PRICING` to a JSON map keyed by model ID, with `inputPerMillion` and `outputPerMillion` in USD. Rates are operator supplied, not asserted current prices. Each call records requested model ID, prompt version, attempts, token usage across parsed responses (including invalid output), estimated cost and status. Unknown/unconfigured cost is `null`, never a fabricated zero. Estimates use uncached input rates and may overestimate cached-input charges; provider timeouts cannot reveal tokens billed by the upstream service. The owner-scoped call ledger retains failed synthesis attempts even when no draft was produced. Scan usage includes its draft-generation calls; dashboard usage counts actual calls once across scans.

## API contract

Base: `/api/gateway`. Every response is JSON and uses `Cache-Control: private, no-store`.

```ts
// Success
{ apiVersion: 'v1', data: T }
// Error
{ apiVersion: 'v1', error: { code: string, message: string, retryable: boolean, issues?: unknown[] } }
```

Domain contracts and request schemas are in `lib/gateway/schemas.ts`. Import their **types only** in client code. Never import the provider/service/store into client components. API keys are read only on the server and never serialized.

| Method | Path                   | Result                                                                              |
| ------ | ---------------------- | ----------------------------------------------------------------------------------- |
| GET    | `/environments`        | Configured environment IDs and storefront origins                                   |
| GET    | `/drafts`              | Paginated saved draft summaries for resuming review                                 |
| POST   | `/drafts`              | Inspect storefront and generate an unapproved draft                                 |
| GET    | `/drafts/:id`          | Context, evidence, hypotheses, scenarios, revision and approval                     |
| PATCH  | `/drafts/:id`          | Replace archetypes/scenarios and approve or unapprove a revision                    |
| POST   | `/scans`               | Create a queued scan with an immutable copy of the approved draft                   |
| POST   | `/scans/:id/run`       | Execute the queued scan once; returns the final scan                                |
| GET    | `/scans/:id`           | Current full scan, including partial traces while running                           |
| GET    | `/scans`               | Paginated scan summaries                                                            |
| GET    | `/sessions`            | Paginated session summaries; optional `scanId`, `status`, `mode`, `outcome` filters |
| GET    | `/sessions/:id`        | Scenario, archetype, trace, evaluation, error and model calls                       |
| GET    | `/sessions/:id/replay` | Ordered events, observations, evaluation and model metadata                         |
| GET    | `/findings`            | Paginated findings with session, scan and evidence references; optional `scanId`    |
| GET    | `/dashboard`           | Counts, latest scans, real evaluated-session pass rate, fixture count and usage     |
| GET    | `/model-calls`         | Paginated model-call ledger, including failed inspection calls                      |

Lists return `{items, total, offset, limit}`. `offset` defaults to 0, `limit` to 25 (maximum 100). All resource lookups are scoped to the authenticated Supabase user; another user's resource returns 404. Mutations reject cross-origin browser requests. Set `NEXT_PUBLIC_SITE_URL` to the public app origin when Next.js runs behind an internal hostname or reverse proxy. JSON request bodies are limited to 128 KB.

### Complete browser-side workflow

Run from an authenticated page on this app:

```js
async function gateway(path, method = 'GET', body) {
  const response = await fetch(`/api/gateway${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const result = await response.json();
  if (!response.ok) throw result.error;
  return result.data;
}

const draft = await gateway('/drafts', 'POST', {
  merchantUrl: 'https://staging.example.com/',
  environmentId: 'staging',
});
// Show draft.context, draft.evidence, draft.archetypes and draft.scenarios for
// merchant review. Let the merchant edit the latter two before this action.
const approved = await gateway(`/drafts/${draft.id}`, 'PATCH', {
  revision: draft.revision,
  archetypes: draft.archetypes,
  scenarios: draft.scenarios,
  approved: true,
});
const scan = await gateway('/scans', 'POST', {
  draftId: approved.id,
  revision: approved.revision,
});
const runningRequest = gateway(`/scans/${scan.id}/run`, 'POST');
// Poll GET /scans/:id on a separate request while this promise is pending.
const completed = await runningRequest;
const replay = await gateway(`/sessions/${completed.sessions[0].id}/replay`);
```

Review updates require the current revision, increment it, and set/clear approval. Edited hypotheses/scenarios get `merchant_edit` provenance while retaining source evidence references. All plans must cover legitimate, constraint and red_team modes and include an expected decline. Archetypes are behavioral hypotheses; they contain no demographic or traffic-share fields. Test mode is a scenario field, independent of archetype.

`run` is **synchronous and request-bound**, not a background-job submission. Keep the request open; configure a timeout of at least 15 minutes in the reverse proxy. Once execution starts, dropping the client connection does not intentionally cancel it in a persistent process. Poll before retrying a lost request. Scans run once; repeated execution returns 409. Create another scan to rerun. There is one active scan and one inspection per user in-process; sessions execute sequentially with independent browser contexts and no shared conversation or storage. Restarted running scans become `interrupted` on their next read and retain their partial traces. This storage/locking design is intentionally not suitable for multiple server workers or ephemeral serverless deployments.

## Execution and evaluation

The narrow actions are `navigate`, `search`, `inspect_product`, and `stop`. All require schema validation; unused action fields are null. Navigation requires an observed URL. Search uses the environment's configured GET endpoint. Stopping either recommends one inspected product or declines. Shopper prompts do not receive the expected outcome.

Each browser instance/context starts fresh with no imported cookies or credentials. Network destinations are exact-origin restricted; DNS is checked once per browser context and requests are forwarded to the validated IP with the original TLS hostname. HTTP redirects are rejected before Chromium can follow them; configure canonical URLs. Each resource is limited to 4 MB. Private, link-local, reserved and metadata destinations are rejected. `allowLoopback: true` permits loopback only for an explicitly configured local test server, not other private networks. All requests must use GET/HEAD and configured path prefixes. Checkout/cart/account/order/payment routes and arbitrary query parameters are blocked. Service workers, WebSockets, downloads and popups are disabled/closed. Path `/` permits only the root; `/products` also permits descendants. Add required read-only asset prefixes explicitly. Query strings permit the configured search key and optional `readOnlyQueryRules` entries (`pathPrefix` plus `names`). Unknown keys remain blocked. Standard UTM attribution parameters are removed before navigation. Some real storefronts will therefore require an adapter or adjusted test storefront assets; the service reports errors instead of widening access.

The renderer captures bounded visible text, discovered links and literal Product JSON-LD. A recommendation currently requires an inspected page with exactly one JSON-LD Product. ProductGroup offer URLs become discovered links; inspecting an explicit Shopify variant retains only the matching variant. Equal low/high AggregateOffer bounds supply an exact observed price; a price range remains unknown. Missing/ambiguous product metadata prevents recommendation. Prices are parsed from observed JSON-LD; the model cannot invent a price for deterministic checks. Text constraints apply to captured page text and can be inconclusive. This slice ends at recommendation/decline: it does not change carts, submit forms, log in, or purchase. The environment owner must configure paths that are actually read-only; unusual state-changing GET storefront endpoints are outside this prototype's assumptions.

Trace events have stable IDs, monotonically increasing per-session sequence numbers, timestamps, validated actions, bounded observations, status and detail. Replay is a data/observation replay, not a video recording.

Deterministic checks validate the stopping point, proposed action boundary, expected disposition, selected product and typed constraints. Price/currency evidence can prove a pass or failure. Missing evidence produces `unknown`; text absence is not proof of an excluded property. A fresh independent evaluator receives the scenario, browser observations and selected disposition/product, **not** the shopper conversation, success claims or expected outcome. Its verdict must cite existing observations and assess every hard constraint. A semantic pass cannot override a deterministic failure, and unknown deterministic constraints remain inconclusive. Declines require independent justification; a partial catalog sample alone is insufficient to prove no matching product exists. Logical impossibility scenarios can pass by correctly declining.

Session execution state (`queued/running/completed/failed/interrupted`) is separate from evaluation outcome (`passed/failed/inconclusive`). A `completed` session can fail its goal. A scan completes when its sessions finish, even if some session executions fail; if every session errors, the scan is `failed`. Findings reference trace/evidence IDs and expose `summarySource`; summary-model failures preserve a clearly deterministic fallback finding. Fixtures are labeled throughout and excluded from the real dashboard pass rate.

## Fixtures and verification

Set `GATEWAY_MODEL_MODE=fixture` explicitly to bypass OpenAI for development. The browser still visits the configured storefront, and Supabase authentication still applies. Fixtures propose a comparer archetype and three scenarios, including a logically impossible price constraint. They issue scripted product inspection/stop decisions and **fixture** evaluator verdicts. They are not evidence of AI quality. Missing `OPENAI_API_KEY` in `openai` mode returns 503 `CONFIGURATION_ERROR`; it never enables fixtures implicitly.

For a local storefront, configure an environment with an exact `http://127.0.0.1:PORT` origin and `allowLoopback: true`. Do not expose a developer fixture configuration as a production testing service.

```bash
npm run test:backend
npm run test:bridge
npm run typecheck
npm run build
```

Backend tests start their own local storefront and use real Chromium, explicit fixture model outputs, mocked OpenAI transport failures and isolated temporary storage. They do not need a live API key or Supabase account. Existing UI/auth tests remain under `npm run test:e2e` and retain their existing account/server requirements. Live OpenAI behavior requires a configured account and has not been claimed by fixture tests.

## Frontend bridge

Start on `/discover`: select an authorized test environment, inspect, edit the archetypes/scenarios, check the review confirmation, approve, then run. The UI uses `lib/gateway/client.ts`; no provider or API key is imported by client components. `GET /drafts` lists saved plans and `/discover?draft=ID` resumes review. `GET /scans/:id` supplies progress and partial traces. The root provider keeps the execution request alive during client-side navigation; reloads observe the persisted scan without resubmitting it.

`/dashboard`, `/scan?scanId=ID`, `/sessions`, `/replays/:id`, and `/recommendations` display saved Gateway records. Replay provides event selection, independent evaluation, usage details and JSON export. Core views never replace failures or empty results with mock data. Remaining legacy demo sections are explicitly labeled.

`/api/agent-scan` returns HTTP 410 with guidance to use the reviewed workflow. `/agent-scan` redirects to Discover. The legacy model-picker/scripted fallback is no longer an execution entry point.

## Public demo browser checks

`config/gateway-demo-environments.json` contains explicit read-only policies for the Shopify Dawn and Saleor demos. Set `GATEWAY_TEST_ENVIRONMENTS` to its compact JSON contents to enable them in Discover. These policies do not allow checkout or storefront account creation. Create the test account in Gateway itself.

Run `GATEWAY_LIVE_STOREFRONTS=1 npx playwright test tests/gateway-live/ --output=test-results/live-storefronts` to check the real isolated browser against the supplied URLs, product/variant inspection, structured prices, and search. This opt-in suite makes no model calls and does not authenticate to Gateway; it is not proof of a completed AI scan. Observations are saved as `observations.json` in the test output. Saleor's supplied pagination cursor can return an empty page; the test follows its observed catalog link to recover.

To exercise the real AI service as well, run `GATEWAY_LIVE_AI=1 npx playwright test tests/gateway-live/ai-workflow.spec.ts --output=test-results/live-ai`. This explicitly opts into billed OpenAI calls on both demo stores. It loads `.env.local`, uses isolated result storage, validates generated plans, executes sessions, and checks result API handlers. It does not create a Supabase account or bypass the running app’s authentication; signup and authenticated UI acceptance remain separate checks. Drafts, scans, traces and model metadata are retained in the test output.

## Quantitative Overview bridge

`GET /api/gateway/dashboard` includes a typed `readiness` object (see `lib/gateway/readiness.ts`). The Overview consumes this input for its score ring, sampled storefront counts, four category cards and trend. Existing scans need no migration or rerun: their persisted observations and independent evaluations are projected at read time.

The overall score is `passed / (passed + failed)` for independently evaluated goals in the latest non-fixture scan. Inconclusive and unevaluated sessions are separate counts; no conclusive results means `score: null`, never an artificial zero. If only fixture scans exist, the entire panel is explicitly labeled. Trends contain at most five completed scans with the same origin, configured environment and fixture status. Different scenario sets can affect comparisons.

Default category measurements are explicitly scoped: Discovery counts successful sampled browser actions, Security counts compliance of proposed shopper actions, and Compatibility counts product observations containing exactly one product with a structured price/currency. These are trace measurements, not whole-catalog coverage or a storefront security audit. Checkout remains unmeasured because the current runner cannot perform checkout.

An independent evaluator or authenticated orchestration service can supply richer category results with `POST /api/gateway/scans/:id/readiness` after the scan stops:

```json
{
  "category": "discovery",
  "producer": "catalog-evaluator-v1",
  "description": "Product discoverability checks in the sampled catalog.",
  "unit": "product checks",
  "checks": [
    {
      "id": "product-navigation",
      "label": "Product reachable from the catalog",
      "result": "pass",
      "evidenceIds": ["<observation-or-trace-event-UUID-from-this-scan>"]
    }
  ]
}
```

Categories are `discovery`, `checkout`, `security`, and `compatibility`; check results are `pass`, `fail`, or `unknown`. The server validates unique check IDs, owner access and evidence references, stamps receipt time, and persists one report per category (later submissions replace that category). It computes scores from checks rather than accepting a supplied percentage. The submitting evaluator is responsible for the factual validity of the checks; reference validation establishes provenance, not truth. Do not submit checkout passes using unrelated observations. Reports cannot change shopper permissions, session verdicts, or the overall goal score. The shopper has no reporting action and cannot grade itself.

`GET /api/gateway/scans/:id/readiness` returns the scan's projected metrics, including evidence IDs and producer labels. Refreshing Overview reads accepted reports immediately. The old global in-memory `/api/discovery`, `/api/checkout`, `/api/security`, and `/api/compatibility` demo adapters do not feed these owner-scoped panels; agent producers should use the scan-specific bridge above.
