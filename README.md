# Gateway

Gateway tests how autonomous shoppers interact with authorized merchant storefronts. Built with Next.js, TypeScript, Supabase authentication, Playwright, and a server-side OpenAI provider.

## Run locally

Requires Node.js 20.9 or newer.

```bash
npm install
npx playwright install chromium
npm run dev
```

Configure Supabase using [Supabase setup](supabase/README.md), then add the server-side model and authorized storefront settings from `.env.example` to `.env.local`. Keep existing credentials when updating the file. See [Gateway API setup and contracts](docs/gateway-api.md).

Open [localhost:3000](http://localhost:3000), create/confirm an account if needed, and sign in. On **Discover**, select a configured test environment and inspect the storefront. Review and edit the evidence-backed customer archetypes and scenarios, explicitly approve the plan, then run it. If no environment is configured, the page explains that setup is required; it does not run a different storefront or silently substitute demo results.

This prototype uses one persistent Node process with owner-scoped files in `.gateway-data/` (or `GATEWAY_DATA_DIR`). Model calls and browser sessions are bounded and request-bound; there is no distributed job system. The browser stops at recommendation or decline, without cart changes or purchases.

## Connected workflow

| Route              | Behavior                                                                                            |
| ------------------ | --------------------------------------------------------------------------------------------------- |
| `/discover`        | Storefront selection, inspection, evidence, archetype/scenario editing, approval and scan execution |
| `/dashboard`       | Persisted scan history, evaluated goal pass rate, usage, and findings                               |
| `/scan?scanId=…`   | Current scan state, sessions, progress and findings; queued scans can be started                    |
| `/sessions`        | Persisted sessions, mode/execution/outcome filters and pagination                                   |
| `/replays`         | Session index linking to recorded replays                                                           |
| `/replays/:id`     | Action/observation trace, goals, independent evaluation, model usage and JSON export                |
| `/recommendations` | Evidence-backed findings linking to supporting sessions                                             |
| `/agent-scan`      | Redirects to the reviewed workflow on Discover                                                      |

Scan requests remain attached to the root app provider while navigating between pages. Reloading reattaches to persisted running scans; it does not start a duplicate run. Drafts can be reopened by URL or from the saved-plan list. Edits require a fresh approval. Empty data, configuration failures and execution failures are displayed explicitly.

The older `/api/agent-scan` execution endpoint is retired with HTTP 410. Its automatic scripted fallback and shopper self-grading are not part of the connected workflow. The older category-report APIs remain separate legacy demo adapters and do not supply the connected dashboard.

**Security, Analytics, Integrations, Settings, and Demand Signal** still contain explicitly labeled demo data/configuration. Their policy/settings controls do not change the runner's permissions. Actual shopper permissions come from the server-configured environment and merchant-reviewed scenarios. These sections do not claim measured checkout or payment outcomes.

Demand Signal at `/demand-signal` preserves the product-concept simulation from main. Its reactions and scores are hand-authored fixtures. Legacy visual replays remain available for known `SES-…` demo IDs and are explicitly labeled as demos; recorded Gateway sessions use UUIDs.

## Architecture

- `app/`: App Router pages and API routes.
- `components/gateway/`: Review workflow, shared execution/polling state, dashboard, sessions, replay and findings views.
- `components/layout/`, `components/ui/`: Shared shell and existing UI primitives.
- `lib/gateway/`: Validated contracts, browser boundary, model provider, evaluation, persistence, APIs and typed browser client.
- `lib/mock-data/`: Legacy demo fixtures, separate from persisted Gateway results.
- `lib/agent/`, `lib/ai/`: Retained legacy runner source; no active scan endpoint calls it.
- `tests/gateway/`: Backend/domain and real-browser fixture tests.
- `tests/gateway-ui/`: Complete UI-to-API fixture journey using isolated local test servers.

The OpenAI key stays in the server environment. Explicit `GATEWAY_MODEL_MODE=fixture` runs are labeled throughout and excluded from the dashboard's non-fixture goal pass rate. Estimated cost is unknown until operator-supplied model rates are configured.

## Verification

```bash
npm run typecheck
npm run test:backend
npm run test:bridge
npm run build
```

`test:backend` starts a local fixture storefront and tests the shopper/evaluator boundaries. `test:bridge` starts an isolated Next.js instance, fixture storefront, and test-only Supabase-compatible authentication server. It exercises the actual routes and browser runner through inspection, edits, approval, execution, reload, dashboard, filters, replay, error states and authentication rejection. It uses fixture model outputs and needs no real credentials or paid model requests. Its Next output is isolated in `.next-gateway-tests/`; screenshots/traces go to `test-results/`.

For additional login and legacy demo checks, start the normal app on port 3000 and run `npm run test:e2e`. `GATEWAY_TEST_EMAIL`/`GATEWAY_TEST_PASSWORD` enable the live account test. `GATEWAY_TEST_STORAGE_STATE` enables the remaining authenticated workspace checks. Keep test credentials and session files outside version control.

## Image credits

Legacy storefront demo imagery comes from Unsplash: mountain landscape (`photo-1464822759023-fed622ff2c3b`) and hiking backpack (`photo-1622260614153-03223fb72052`). Evertrail Outdoors is fictional; connected scan results come from the explicitly configured test environment.
