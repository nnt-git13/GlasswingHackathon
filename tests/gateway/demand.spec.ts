import { test, expect } from '@playwright/test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { FileStore } from '../../lib/gateway/store';
import { GatewayService } from '../../lib/gateway/service';
import { OpenAIProvider, type ModelProvider } from '../../lib/gateway/provider';
import { handleGateway } from '../../lib/gateway/api';
import { GatewayError } from '../../lib/gateway/errors';
import { demandRequestSchema } from '../../lib/gateway/demand';
import type { Scan } from '../../lib/gateway/schemas';
import { fixtureOutput } from '../../lib/gateway/fixtures';

const product = {
  name: 'New mountain ski',
  description: 'A playful mountain ski with a published weight and warranty.',
  price: 799,
  currency: 'USD',
  pageUrl: 'https://jskis.com/',
  trafficNotes: 'User-reported: most visitors arrive through ski reviews.',
};
test('proposed-product assessments enforce ownership, recorded pages, persistence and model-call auditing', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'gateway-demand-'));
  const previous = process.env.GATEWAY_MODEL_MODE;
  process.env.GATEWAY_MODEL_MODE = 'fixture';
  try {
    const store = new FileStore(directory);
    const scan = {
      id: randomUUID(),
      ownerId: 'owner-a',
      status: 'completed',
      fixture: true,
      draft: {
        merchantUrl: product.pageUrl,
        context: { merchantName: 'J Skis' },
        archetypes: [{ id: 'ski-comparer', name: 'Ski comparer' }],
        evidence: [
          {
            id: 'page-1',
            url: product.pageUrl,
            title: 'J Skis',
            text: 'Mountain skis from $779',
            products: [],
          },
        ],
      },
      sessions: [],
      findings: [],
      modelCalls: [],
    } as unknown as Scan;
    await store.save('scan', scan);
    const service = new GatewayService(store, () => new OpenAIProvider());
    const post = (owner: string, body: unknown) =>
      handleGateway(
        new Request(`http://gateway.test/api/gateway/scans/${scan.id}/demand`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }),
        ['scans', scan.id, 'demand'],
        async () => owner,
        service,
      );
    expect((await post('owner-b', product)).status).toBe(404);
    expect((await post('owner-a', { ...product, pageUrl: 'https://unrelated.test/' })).status).toBe(
      400,
    );
    expect((await post('owner-a', { ...product, price: -5 })).status).toBe(400);
    const result = await post('owner-a', product);
    expect(result.status).toBe(201);
    const report = (await result.json()).data;
    expect(report.product).toEqual(product);
    expect(report.fixture).toBe(true);
    expect(report.result.profiles[0]).toMatchObject({
      archetypeId: 'ski-comparer',
      priceFit: 'unknown',
    });
    expect(report.modelCalls[0].purpose).toBe('demand');
    expect(
      (await new FileStore(directory).get('scan', 'owner-a', scan.id)).demandReports?.[0].id,
    ).toBe(report.id);
    expect((await store.listCalls('owner-a'))[0].operationId).toBe(report.id);
    const unauth = await handleGateway(
      new Request('http://gateway.test/api/gateway/scans/x/demand'),
      ['scans', scan.id, 'demand'],
      async () => {
        throw new GatewayError('AUTHENTICATION_REQUIRED', 'Sign in', 401);
      },
      service,
    );
    expect(unauth.status).toBe(401);
    scan.status = 'queued';
    await store.save('scan', scan);
    expect((await post('owner-a', product)).status).toBe(409);
  } finally {
    if (previous === undefined) delete process.env.GATEWAY_MODEL_MODE;
    else process.env.GATEWAY_MODEL_MODE = previous;
    await rm(directory, { recursive: true, force: true });
  }
});

test('rejects model reports citing unrelated profiles or evidence', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'gateway-demand-invalid-'));
  try {
    const store = new FileStore(directory);
    const scan = {
      id: randomUUID(),
      ownerId: 'owner',
      status: 'completed',
      draft: {
        merchantUrl: product.pageUrl,
        context: {},
        archetypes: [{ id: 'profile' }],
        evidence: [{ id: 'page', url: product.pageUrl, text: 'Skis', products: [] }],
      },
      sessions: [],
    } as unknown as Scan;
    await store.save('scan', scan);
    const provider: ModelProvider = {
      fixture: true,
      async generate(_purpose, schema, _instructions, input) {
        const output = fixtureOutput('demand', input) as { profiles: { evidenceIds: string[] }[] };
        output.profiles[0].evidenceIds = ['unrelated-evidence'];
        return schema.parse(output);
      },
    };
    const service = new GatewayService(store, () => provider);
    await expect(
      service.assessDemand('owner', scan.id, demandRequestSchema.parse(product)),
    ).rejects.toThrow('recorded evidence correctly');
    expect((await store.get('scan', 'owner', scan.id)).demandReports).toBeUndefined();
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
