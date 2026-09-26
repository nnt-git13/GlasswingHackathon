# Gateway

An enterprise frontend for testing, observing, and securing autonomous shopping sessions. Built from the Glasswing Hackathon brief for the fictional merchant **Evertrail Outdoors**.

## Run locally

Requires Node.js 20.9 or newer.

```bash
npm install
npm run dev
```

Open [localhost:3000](http://localhost:3000) for the login page (also available at `/login`). Create an account at `/signup`, confirm your email, then sign in. Supabase configuration is required; protected routes stay inaccessible when it is absent. See [Supabase setup](supabase/README.md).

```bash
npm run typecheck
npm run build
npm run start
```

## Demo surfaces

| Route                | What to explore                                                            |
| -------------------- | -------------------------------------------------------------------------- |
| `/dashboard`         | Readiness score, category health, expandable findings, scan history        |
| `/scan`              | Storefront annotations, product/cart/checkout/policy previews, scan phases |
| `/sessions`          | Search and six filters, CSV export, links to individual session traces     |
| `/replays`           | Replay session index                                                       |
| `/replays/SES-10482` | Eight-step shopping trace, playback, requests, context, JSON export        |
| `/security`          | Policy editor, new policies, blocked events linked to matching replays     |
| `/recommendations`   | Implementation guides, generated policy, resolve and verify workflow       |
| `/analytics`         | Six Recharts visualizations with 7/30/90-day ranges                        |
| `/integrations`      | Searchable connectors, configuration dialogs, CI command example           |
| `/settings`          | Workspace, scan, and notification preferences                              |

Try **Run Scan**, select a numbered storefront issue, filter for a blocked session and open its replay, then run **Verify fix** on a recommendation. Successful verification moves the recommendation to the Resolved tab.

## Architecture

- `app/`: Next.js App Router routes and global design tokens/responsive styles.
- `components/layout/`: Persistent application shell, selectors, scan state, shared demo state.
- `components/dashboard/`, `scans/`, `sessions/`, `security/`, `recommendations/`, `charts/`: Reusable domain components.
- `components/ui/`: shadcn-style primitives built with Radix UI, CVA, and Tailwind utilities.
- `lib/types/`: Typed merchant, scan, finding, recommendation, session/event, policy, agent, and readiness contracts.
- `lib/mock-data/`: Separate fixtures for commerce demo data; authentication uses Supabase.
- `public/`: Local storefront photography, so previews do not depend on external image requests.
- `tests/`: Playwright coverage of the main demo workflows and responsive layouts.

The reusable components receive typed records. Replace fixture imports at the page/container layer and the simulated actions in `AppProvider` with real data loading and mutations when connecting a backend. Session replay lookup already resolves IDs independently and returns a 404 for unknown sessions.

Rename the product in `lib/mock-data/merchant.ts` (`productConfig`). This is also the source for the workspace and user identity.

## Frontend-only behavior

Scan and verification runs use short deterministic timers. Policies and recommendation state survive client-side route navigation; all demo changes reset on a page reload. Integration and settings configuration is held in component state. No merchant websites, commerce APIs, payment systems, or notification services are contacted. The CLI command is illustrative.

Analytics charts use generated fixtures for the selected period. Agent distribution and failure-mode tables explicitly display the latest 1,248-session snapshot. The sessions table contains 11 representative sessions from that larger workspace summary. Recommendations expose five prioritized examples from the 12-item summary.

## Browser checks

Start the app on port 3000, then:

```bash
npx playwright install chromium
npm run test:e2e
```

Authentication tests run without an account. Set `GATEWAY_TEST_EMAIL` and `GATEWAY_TEST_PASSWORD` to enable the live account test after applying the migration. Workspace tests require `GATEWAY_TEST_STORAGE_STATE` pointing to a Playwright storage-state file from a signed-in test account; otherwise they are skipped. Keep test credentials and session files outside version control.

The Playwright configuration uses the preinstalled Chromium binary in this workspace when available, and otherwise uses Playwright's managed browser. Tests cover all routes, scans, filters, exports, replay tabs/playback, annotation selection, policy creation/editing, verification, integrations, not-found handling, and tablet/mobile overflow. Screenshots are generated in `test-results/`.

## Image credits

Storefront mock imagery is downloaded from Unsplash and stored locally: mountain landscape (`photo-1464822759023-fed622ff2c3b`) and hiking backpack (`photo-1622260614153-03223fb72052`). Evertrail Outdoors and all operational data are fictional demo content.
