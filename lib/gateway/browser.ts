import { randomUUID } from 'node:crypto';
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import { request as httpRequest } from 'node:http';
import { request as httpsRequest } from 'node:https';
import ipaddr from 'ipaddr.js';
import { chromium, type Browser, type BrowserContext, type Page } from 'playwright';
import { GatewayError } from './errors';
import type { TestEnvironment } from './config';
import type { Action, Observation, Scenario } from './schemas';

const forbiddenPath =
  /(?:^|\/)(?:checkout|cart|account|login|logout|admin|orders?|payments?|purchase|buy|subscribe)(?:\/|$)/i;
export function allowedUrl(raw: string, env: TestEnvironment): string {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new GatewayError(
      'ACTION_BLOCKED',
      'The action requires an absolute storefront URL.',
      422,
    );
  }
  let path: string;
  try {
    path = decodeURIComponent(decodeURIComponent(url.pathname));
  } catch {
    throw new GatewayError('ACTION_BLOCKED', 'Invalid URL encoding.', 422);
  }
  if (
    url.origin !== env.origin ||
    url.username ||
    url.password ||
    !['https:', 'http:'].includes(url.protocol) ||
    path.includes('\\') ||
    path.split('/').includes('..') ||
    forbiddenPath.test(path) ||
    !env.allowedPathPrefixes.some((prefix) =>
      prefix === '/'
        ? path === '/'
        : path === prefix || path.startsWith(`${prefix.replace(/\/$/, '')}/`),
    )
  ) {
    throw new GatewayError(
      'ACTION_BLOCKED',
      'This URL is outside the configured read-only storefront boundary.',
      422,
    );
  }
  // Discard attribution before any request; pagination/asset parameters require
  // explicit server configuration. Unknown query keys still fail closed.
  for (const key of [...url.searchParams.keys()]) {
    if (/^utm_(source|medium|campaign|term|content)$/i.test(key)) url.searchParams.delete(key);
  }
  if (
    [...url.searchParams.keys()].some(
      (key) =>
        !(key === env.searchQueryParam && url.pathname === env.searchPath) &&
        !env.readOnlyQueryRules?.some(
          (rule) =>
            (path === rule.pathPrefix ||
              path.startsWith(`${rule.pathPrefix.replace(/\/$/, '')}/`)) &&
            rule.names.includes(key),
        ),
    )
  )
    throw new GatewayError(
      'ACTION_BLOCKED',
      'Only configured read-only storefront query parameters are permitted.',
      422,
    );
  url.hash = '';
  return url.href;
}
export function safeAddress(address: string, allowLoopback: boolean) {
  try {
    const parsed = ipaddr.process(address);
    return parsed.range() === 'unicast' || (allowLoopback && parsed.range() === 'loopback');
  } catch {
    return false;
  }
}
export async function pinnedHost(env: TestEnvironment) {
  const hostname = new URL(env.origin).hostname.replace(/^\[|\]$/g, '');
  const addresses = isIP(hostname)
    ? [{ address: hostname }]
    : await lookup(hostname, { all: true });
  if (!addresses.length || addresses.some((item) => !safeAddress(item.address, env.allowLoopback)))
    throw new GatewayError(
      'UNSAFE_DESTINATION',
      'The configured storefront resolves to a prohibited network address.',
      422,
    );
  return addresses[0].address;
}

// Playwright routing only intercepts the first URL in a server redirect chain.
// Forward requests ourselves to the validated IP; never send a redirect to Chromium.
// TLS still verifies the original hostname. No proxy or secondary DNS lookup is used.
async function readResource(
  raw: string,
  address: string,
  headers: Record<string, string>,
  method: string,
  signal: AbortSignal,
): Promise<{ status: number; headers: Record<string, string>; body: Buffer }> {
  const url = new URL(raw);
  return new Promise((resolve, reject) => {
    const request = (url.protocol === 'https:' ? httpsRequest : httpRequest)(
      {
        protocol: url.protocol,
        hostname: address,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        servername: url.hostname,
        path: url.pathname + url.search,
        method,
        headers: { ...headers, host: url.host, 'accept-encoding': 'identity' },
        signal,
        agent: false,
      },
      (response) => {
        if (response.statusCode && response.statusCode >= 300 && response.statusCode < 400) {
          response.destroy();
          reject(
            new GatewayError(
              'REDIRECT_BLOCKED',
              'HTTP redirects are blocked. Configure the canonical storefront URL.',
              422,
            ),
          );
          return;
        }
        const chunks: Buffer[] = [];
        let size = 0;
        response.on('data', (chunk: Buffer) => {
          size += chunk.length;
          if (size > 4_000_000) {
            response.destroy(
              new GatewayError('RESOURCE_TOO_LARGE', 'Storefront resource exceeds 4 MB.', 422),
            );
          } else chunks.push(chunk);
        });
        response.on('error', reject);
        response.on('end', () => {
          const forwarded: Record<string, string> = {};
          for (const [name, value] of Object.entries(response.headers)) {
            if (
              value !== undefined &&
              !['connection', 'transfer-encoding', 'content-length'].includes(name)
            )
              forwarded[name] = Array.isArray(value) ? value.join('\n') : value;
          }
          resolve({
            status: response.statusCode || 502,
            headers: forwarded,
            body: Buffer.concat(chunks),
          });
        });
      },
    );
    request.setTimeout(15_000, () => request.destroy(new Error('Storefront request timed out.')));
    request.on('error', reject);
    request.end();
  });
}
export function validateAction(
  action: Action,
  scenario: Scenario,
  env: TestEnvironment,
  observations: Observation[],
) {
  if (!scenario.permittedActions.includes(action.type))
    throw new GatewayError(
      'ACTION_BLOCKED',
      'Action is not permitted by the reviewed scenario.',
      422,
    );
  if (action.type === 'stop') {
    if (
      !action.disposition ||
      action.url !== null ||
      action.query !== null ||
      (action.disposition === 'recommend' &&
        !observations.some(
          (obs) =>
            obs.id === action.productObservationId &&
            obs.kind === 'product' &&
            obs.products.length === 1,
        ))
    )
      throw new GatewayError(
        'ACTION_BLOCKED',
        'A recommendation must reference an inspected page with exactly one observed product.',
        422,
      );
    return;
  }
  if (action.disposition !== null || action.productObservationId !== null)
    throw new GatewayError('ACTION_BLOCKED', 'Non-stop actions cannot declare an outcome.', 422);
  if (action.type === 'search') {
    if (!action.query?.trim() || action.url !== null)
      throw new GatewayError(
        'ACTION_BLOCKED',
        'Search requires a query and no arbitrary URL.',
        422,
      );
    return;
  }
  if (!action.url || action.query !== null)
    throw new GatewayError('ACTION_BLOCKED', 'Navigation requires a URL and no search query.', 422);
  const target = allowedUrl(action.url, env);
  const discovered = observations.some(
    (obs) => obs.url === target || obs.links.some((link) => link.url === target),
  );
  if (!discovered)
    throw new GatewayError(
      'ACTION_BLOCKED',
      'The shopper may navigate only to URLs discovered in observations.',
      422,
    );
}
export interface ShopperBrowser {
  observe(url: string, kind?: 'page' | 'product'): Promise<Observation>;
  execute(action: Action): Promise<Observation | null>;
  close(): Promise<void>;
}
export type BrowserFactory = (env: TestEnvironment, signal: AbortSignal) => Promise<ShopperBrowser>;
export class StorefrontBrowser implements ShopperBrowser {
  private constructor(
    private browser: Browser,
    private context: BrowserContext,
    private page: Page,
    private env: TestEnvironment,
    private cleanup: () => void,
    private failures: Map<string, GatewayError>,
  ) {}
  static async open(env: TestEnvironment, signal: AbortSignal): Promise<StorefrontBrowser> {
    signal.throwIfAborted();
    const address = await pinnedHost(env);
    const browser = await chromium.launch({
      headless: true,
      ...(process.env.GATEWAY_CHROMIUM_PATH
        ? { executablePath: process.env.GATEWAY_CHROMIUM_PATH }
        : {}),
      args: [
        '--host-resolver-rules=MAP * ~NOTFOUND',
        '--no-proxy-server',
        '--disable-quic',
        '--disable-background-networking',
        '--force-webrtc-ip-handling-policy=disable_non_proxied_udp',
      ],
    });
    const abort = () => {
      void browser.close().catch(() => {});
    };
    signal.addEventListener('abort', abort, { once: true });
    try {
      signal.throwIfAborted();
      const context = await browser.newContext({
        acceptDownloads: false,
        serviceWorkers: 'block',
        viewport: { width: 1280, height: 900 },
      });
      context.setDefaultTimeout(10_000);
      context.setDefaultNavigationTimeout(20_000);
      const failures = new Map<string, GatewayError>();
      await context.route('**/*', async (route) => {
        const request = route.request();
        try {
          if (!['GET', 'HEAD'].includes(request.method())) throw new Error();
          const resourceUrl = allowedUrl(request.url(), env);
          await route.fulfill(
            await readResource(
              resourceUrl,
              address,
              await request.allHeaders(),
              request.method(),
              signal,
            ),
          );
        } catch (error) {
          if (request.isNavigationRequest() && error instanceof GatewayError)
            failures.set(request.url(), error);
          await route.abort('blockedbyclient').catch(() => {});
        }
      });
      await context.routeWebSocket('**/*', (socket) => socket.close());
      const page = await context.newPage();
      context.on('page', (popup) => {
        if (popup !== page) void popup.close().catch(() => {});
      });
      page.on('dialog', (dialog) => void dialog.dismiss().catch(() => {}));
      return new StorefrontBrowser(
        browser,
        context,
        page,
        env,
        () => signal.removeEventListener('abort', abort),
        failures,
      );
    } catch (error) {
      signal.removeEventListener('abort', abort);
      await browser.close();
      throw error;
    }
  }
  async observe(raw: string, kind: 'page' | 'product' = 'page'): Promise<Observation> {
    const url = allowedUrl(raw, this.env);
    this.failures.delete(url);
    const response = await this.page.goto(url, { waitUntil: 'domcontentloaded' }).catch(() => {
      throw (
        this.failures.get(url) ||
        new GatewayError(
          'STOREFRONT_UNAVAILABLE',
          'Storefront navigation failed or timed out.',
          502,
          true,
        )
      );
    });
    if (!response || !response.ok())
      throw new GatewayError(
        'STOREFRONT_ERROR',
        `Storefront returned ${response?.status() || 'no response'}.`,
        502,
        true,
      );
    allowedUrl(this.page.url(), this.env);
    await this.page.locator('body').waitFor();
    // Streamed storefronts can hydrate their catalog after DOMContentLoaded.
    // Bound both loading and DOM settling; background analytics must not hang a session.
    await this.page.waitForLoadState('load', { timeout: 5000 }).catch(() => {});
    await this.page.evaluate(
      () =>
        new Promise<void>((resolve) => {
          let quiet: ReturnType<typeof setTimeout>;
          const finish = () => {
            clearTimeout(quiet);
            clearTimeout(deadline);
            observer.disconnect();
            resolve();
          };
          const observer = new MutationObserver(() => {
            clearTimeout(quiet);
            quiet = setTimeout(finish, 500);
          });
          const deadline = setTimeout(finish, 3000);
          observer.observe(document.body, { subtree: true, childList: true, characterData: true });
          quiet = setTimeout(finish, 500);
        }),
    );
    // Capture rendered text and literal JSON-LD. Never accept model-invented prices as evidence.
    const snapshot = await this.page.evaluate(() => {
      const text = document.body.innerText.slice(0, 12000);
      const links = Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href]'))
        .slice(0, 100)
        .map((link) => ({
          url: link.href,
          text: (link.innerText || link.getAttribute('aria-label') || '').slice(0, 160),
        }));
      const products: { name: string; price: number | null; currency: string | null }[] = [];
      function visit(value: unknown, depth = 0) {
        if (depth > 10 || !value || typeof value !== 'object' || products.length >= 20) return;
        if (Array.isArray(value)) {
          value.slice(0, 100).forEach((entry) => visit(entry, depth + 1));
          return;
        }
        const node = value as Record<string, unknown>;
        if (
          node['@type'] === 'Product' ||
          (Array.isArray(node['@type']) && node['@type'].includes('Product'))
        ) {
          const offers = Array.isArray(node.offers) ? node.offers[0] : node.offers;
          const offer =
            offers && typeof offers === 'object' ? (offers as Record<string, unknown>) : {};
          // ProductGroup variants carry literal offer URLs. Make them discoverable
          // so the shopper can inspect one variant without guessing its identifier.
          let offerUrl: URL | undefined;
          try {
            if (typeof offer.url === 'string') {
              offerUrl = new URL(offer.url, location.href);
              links.push({ url: offerUrl.href, text: String(node.name || '').slice(0, 160) });
            }
          } catch {}
          const selectedVariant = new URL(location.href).searchParams.get('variant');
          if (
            selectedVariant &&
            (!offerUrl ||
              offerUrl.origin !== location.origin ||
              offerUrl.pathname !== location.pathname ||
              offerUrl.searchParams.get('variant') !== selectedVariant)
          )
            return;
          let price =
            (typeof offer.price === 'string' && offer.price.trim() !== '') ||
            typeof offer.price === 'number'
              ? Number(offer.price)
              : NaN;
          // An aggregate range is not an exact purchasable price. Accept it only
          // when both literal bounds agree (Saleor's single-price products).
          if (offer['@type'] === 'AggregateOffer' && !Number.isFinite(price)) {
            const low =
              typeof offer.lowPrice === 'number' ||
              (typeof offer.lowPrice === 'string' && offer.lowPrice.trim())
                ? Number(offer.lowPrice)
                : NaN;
            const high =
              typeof offer.highPrice === 'number' ||
              (typeof offer.highPrice === 'string' && offer.highPrice.trim())
                ? Number(offer.highPrice)
                : NaN;
            if (Number.isFinite(low) && low === high) price = low;
          }
          products.push({
            name: String(node.name || '').slice(0, 300),
            price: Number.isFinite(price) && price >= 0 ? price : null,
            currency:
              typeof offer.priceCurrency === 'string' ? offer.priceCurrency.slice(0, 10) : null,
          });
        }
        Object.values(node)
          .slice(0, 100)
          .forEach((entry) => visit(entry, depth + 1));
      }
      for (const script of Array.from(
        document.querySelectorAll('script[type="application/ld+json"]'),
      ).slice(0, 20)) {
        try {
          if ((script.textContent?.length || 0) < 100000)
            visit(JSON.parse(script.textContent || ''));
        } catch {}
      }
      return { title: document.title.slice(0, 300), text, links, products };
    });
    return {
      id: randomUUID(),
      timestamp: new Date().toISOString(),
      url: this.page.url(),
      ...snapshot,
      links: snapshot.links.flatMap((link) => {
        try {
          return [{ ...link, url: allowedUrl(link.url, this.env) }];
        } catch {
          return [];
        }
      }),
      kind,
    };
  }
  async execute(action: Action) {
    if (action.type === 'stop') return null;
    if (action.type === 'search') {
      const url = new URL(this.env.searchPath, this.env.origin);
      url.searchParams.set(this.env.searchQueryParam, action.query!);
      return this.observe(url.href);
    }
    return this.observe(action.url!, action.type === 'inspect_product' ? 'product' : 'page');
  }
  async close() {
    this.cleanup();
    await this.context.close().catch(() => {});
    await this.browser.close();
  }
}
export const browserFactory: BrowserFactory = (env, signal) => StorefrontBrowser.open(env, signal);
