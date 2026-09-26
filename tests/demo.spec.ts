import { expect, test } from '@playwright/test';

test.use({ storageState: process.env.GATEWAY_TEST_STORAGE_STATE });
test.beforeEach(() => {
  test.skip(
    !process.env.GATEWAY_TEST_STORAGE_STATE,
    'Workspace tests require an authenticated Supabase storage state.',
  );
});

test('all demo routes render without client errors and primary surfaces are captured', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  for (const [route, heading] of [
    ['dashboard', 'Good morning, Jordan'],
    ['scan', 'Agent Test Run'],
    ['sessions', 'Shopping Sessions'],
    ['replays/SES-10482', 'Agent Replay'],
    ['security', 'Security'],
    ['recommendations', 'Recommendations'],
    ['analytics', 'Analytics'],
    ['integrations', 'Integrations'],
    ['settings', 'Settings'],
    ['replays', 'Session Replays'],
  ]) {
    await page.goto(`/${route}`);
    await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible();
    await expect(page.locator('body')).not.toContainText('Application error');
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    if (['dashboard', 'scan', 'replays/SES-10482'].includes(route)) {
      await page.screenshot({
        path: `test-results/${route.replaceAll('/', '-')}-desktop.png`,
        fullPage: true,
        animations: 'disabled',
      });
    }
  }
  expect(errors).toEqual([]);
});


test('dashboard separates rolling outcomes from the latest readiness scan', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page.getByText('Last 7 days', { exact: true })).toBeVisible();
  await expect(page.getByText('Latest readiness scan', { exact: true })).toBeVisible();
  await expect(
    page.getByText('Latest scan · 86 pages · 48 shopping sessions · 5 agent profiles', {
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Run new scan' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Run Scan', exact: true })).toHaveCount(1);
});

test('shell dropdowns, scan lifecycle, and finding expansion', async ({ page }) => {
  await page.goto('/dashboard');
  await page.getByRole('button', { name: 'Evertrail Outdoors', exact: true }).click();
  await expect(page.getByRole('menuitem', { name: /Connect a storefront/ })).toBeVisible();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Production', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Staging', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Staging', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Run Scan', exact: true }).click();
  await expect(page.getByRole('progressbar')).toBeVisible();
  await expect(page.getByRole('status')).toContainText('Readiness scan complete', {
    timeout: 10000,
  });
  await expect(page.getByRole('status')).toContainText('Staging');
  await expect(page.getByText('Just now', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: /Variant metadata unclear/ }).click();
  await expect(page.getByText(/The capacity selector updates/)).toBeVisible();
});

test('scan annotations and storefront page selector are interactive', async ({ page }) => {
  await page.goto('/scan');
  await expect(page.getByText('shopping sessions tested', { exact: true })).toBeVisible();
  await expect(page.getByText('Generate shopper goals', { exact: true })).toBeVisible();
  await expect(page.getByText('Generate findings', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Issue 2: Unclear shipping estimate' }).click();
  await expect(page.getByRole('link', { name: /View supporting journey/ })).toHaveAttribute(
    'href',
    '/replays/SES-10482',
  );
  await expect(page.locator('.selected-issue')).toContainText('Unclear shipping estimate');
  await page.getByLabel('Preview page').selectOption('Cart');
  await expect(page.getByRole('heading', { name: 'Your cart', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Continue to checkout' }).click();
  await expect(page.getByRole('heading', { name: 'Order summary' })).toBeVisible();
  await page.getByRole('button', { name: /Checkout Flow/ }).click();
  await expect(page.locator('.phase-detail')).toContainText('All 8 checkout checks passed');
  await page.getByLabel('Preview page').selectOption('Shipping policy');
  await expect(page.getByRole('heading', { name: 'Shipping & returns' })).toBeVisible();
});

test('session filters, CSV export, selected replay, and timeline tabs', async ({ page }) => {
  await page.goto('/sessions');
  await page.getByLabel('Status', { exact: true }).selectOption('Failed');
  await expect(page.locator('tbody tr')).toHaveCount(2);
  await page.getByLabel('Search sessions').fill('boots');
  await expect(page.locator('tbody tr')).toHaveCount(1);
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  expect((await download).suggestedFilename()).toBe('gateway-shopping-sessions.csv');
  await page.getByRole('link', { name: 'SES-10481', exact: true }).click();
  await expect(page).toHaveURL(/replays\/SES-10481/);
  await expect(
    page.getByText('Size 11 variant SKU does not match checkout availability.'),
  ).toBeVisible();
  await page.goto('/replays/SES-10482');
  await expect(page.getByRole('heading', { name: 'Investigation view' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Requesting shipping' })).toBeVisible();
  await expect(page.getByText('Shipping: 3–5 business days', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: /Step 3 Comparing products/i }).click();
  await expect(page.getByRole('heading', { name: 'Comparing products' })).toBeVisible();
  await expect(page.getByText('No merchant-side failure was detected at this step.')).toBeVisible();
  await page.getByRole('button', { name: /Step 4 Requesting shipping/i }).click();
  await expect(page.getByText('destination-aware delivery estimate', { exact: false })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Safety controls held' })).toBeVisible();
  await page.getByRole('tab', { name: 'Requests', exact: true }).click();
  await expect(page.locator('.request-list')).toContainText('GET /collections/backpacks');
  await page.getByRole('tab', { name: 'Agent context' }).click();
  await expect(page.getByText('Production-safe simulation', { exact: true })).toBeVisible();
  await page.getByRole('tab', { name: 'Timeline' }).click();
  await page.getByRole('button', { name: 'Replay', exact: true }).click();
  await expect(page.locator('.playback-active')).toBeVisible();
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await page.getByRole('button', { name: 'View all events' }).click();
  await expect(page.getByRole('dialog')).toContainText('Security events · SES-10482');
});

test('all session filters and empty state', async ({ page }) => {
  await page.goto('/sessions');
  await page.getByLabel('Goal type', { exact: true }).selectOption('Promotion');
  await expect(page.locator('tbody tr')).toHaveCount(1);
  await page.getByLabel('Agent profile', { exact: true }).selectOption('Synthetic Buyer v3');
  await page.getByLabel('Environment filter').selectOption('Production');
  await page.getByLabel('Severity', { exact: true }).selectOption('Critical');
  await page.getByLabel('Date range').selectOption('Today');
  await expect(page.locator('tbody tr')).toHaveCount(1);
  await page.getByLabel('Date range').selectOption('Yesterday');
  await expect(page.getByRole('heading', { name: 'No results found' })).toBeVisible();
  await page.getByRole('button', { name: 'Clear filters' }).click();
  await expect(page.locator('tbody tr')).toHaveCount(11);
});

test('policy editing and new policy submission', async ({ page }) => {
  await page.goto('/security');
  await page
    .getByRole('button', { name: 'Edit policy: Purchase confirmation', exact: true })
    .click();
  await page.getByLabel('Enforcement', { exact: true }).fill('Require signed confirmation');
  await page.getByRole('button', { name: 'Save policy' }).click();
  await expect(
    page.locator('tbody tr').filter({ hasText: 'Purchase confirmation' }).first(),
  ).toContainText('Require signed confirmation');
  await page.getByRole('button', { name: 'New policy' }).click();
  await page.getByLabel('Policy name').fill('Prevent checkout retries');
  await page.getByLabel('Policy scope').selectOption('Checkout');
  await page.getByRole('button', { name: 'Save policy' }).click();
  await expect(page.locator('.policy-table tbody tr')).toHaveCount(6);
  await expect(page.locator('.policy-table')).toContainText('Prevent checkout retries');
});

test('recommendation implementation and verification move an issue to resolved', async ({
  page,
}) => {
  await page.goto('/recommendations');
  await expect(page.getByText('High impact', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('4', { exact: true }).first()).toBeVisible();
  await expect(page.locator('#REC-005')).toContainText('Medium impact');
  const card = page.locator('#REC-001');
  await expect(card.getByRole('link', { name: 'View evidence' })).toHaveAttribute('href', '/scan');
  await card.getByRole('button', { name: 'View implementation' }).click();
  await expect(page.getByRole('dialog')).toContainText('ProductGroup');
  await page.getByRole('button', { name: 'Close guide' }).click();
  await card.getByRole('button', { name: 'Verify fix' }).click();
  await expect(card.getByRole('button', { name: 'Rerunning scenarios…' })).toBeDisabled();
  await expect(page.getByRole('status')).toContainText('Verification run passed', {
    timeout: 10000,
  });
  await page.getByRole('tab', { name: 'Resolved', exact: true }).click();
  await expect(page.locator('#REC-001')).toContainText('12/12 passed');
  await expect(
    page.locator('#REC-001').getByRole('button', { name: 'Verified', exact: true }),
  ).toBeDisabled();
});

test('analytics date range and integration connection', async ({ page }) => {
  await page.goto('/analytics');
  await page.getByRole('button', { name: '30d', exact: true }).click();
  await expect(page.getByText('across 5,312 sessions')).toBeVisible();
  await page.getByRole('button', { name: '90d', exact: true }).click();
  await expect(page.getByText('across 16,407 sessions')).toBeVisible();
  await page.goto('/integrations');
  await page.getByLabel('Search integrations').fill('Stripe');
  await expect(page.locator('.integration-card')).toHaveCount(1);
  await page.getByRole('button', { name: 'Connect', exact: true }).click();
  await page.getByLabel('Connection name').fill('Evertrail payments');
  await page.getByLabel('Account or endpoint').fill('acct_demo_evertrail');
  await page.getByRole('button', { name: 'Save connection' }).click();
  await expect(page.locator('.integration-card')).toContainText('Connected');
  await expect(page.getByRole('button', { name: 'Configure' })).toBeVisible();
});

test('tablet and mobile layouts stay within viewport, navigation works', async ({ page }) => {
  for (const width of [768, 390]) {
    await page.setViewportSize({ width, height: 844 });
    for (const route of [
      'dashboard',
      'scan',
      'sessions',
      'replays/SES-10482',
      'security',
      'recommendations',
      'analytics',
      'integrations',
    ]) {
      await page.goto(`/${route}`);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
        `${route} overflows at ${width}px`,
      ).toBe(true);
    }
    await page.goto('/dashboard');
    await page.getByRole('button', { name: 'Open navigation' }).click();
    await page
      .getByRole('navigation', { name: 'Main navigation' })
      .getByRole('link', { name: 'Security', exact: true })
      .click();
    await expect(page).toHaveURL(/\/security/);
    await expect(page.getByRole('button', { name: 'Open navigation' })).toBeVisible();
    await page.screenshot({ path: `test-results/security-${width}.png`, fullPage: true });
  }
});

test('invalid replay shows a proper not-found page and session alias redirects', async ({
  page,
}) => {
  await page.goto('/replays/SES-invalid');
  await expect(
    page.getByRole('heading', { name: 'This page isn’t in your workspace.' }),
  ).toBeVisible();
  await page.goto('/sessions/SES-10479');
  await expect(page).toHaveURL(/\/replays\/SES-10479/);
  await expect(page.getByText('Fourth promo-code attempt blocked.')).toBeVisible();
});
