import { NextResponse } from 'next/server';

/**
 * Builds a GET/POST route handler pair for a readiness-scanning agent to
 * report into. GET returns the latest result (seeded with mock data until a
 * real scan lands); POST accepts a new result, checking that the given
 * numeric and array fields are present, and stores it in memory.
 *
 * In-memory store: fine for a single dev/demo instance. Swap for a real
 * datastore before this runs across multiple server instances or restarts.
 */
export function createScanRoute<T extends { scanId?: string; scannedAt?: string }>(
  initial: T,
  requiredNumberFields: (keyof T & string)[],
  requiredArrayField: keyof T & string
) {
  let latest: T = initial;

  async function GET() {
    return NextResponse.json(latest);
  }

  async function POST(request: Request) {
    const body = (await request.json()) as Partial<T>;
    const missingField = requiredNumberFields.find((f) => typeof body[f] !== 'number');
    if (missingField || !Array.isArray(body[requiredArrayField])) {
      return NextResponse.json(
        {
          error: `Expected ${requiredNumberFields.join(', ')} as numbers and ${requiredArrayField} as an array.`,
        },
        { status: 400 }
      );
    }

    latest = {
      ...latest,
      ...body,
      scanId: body.scanId ?? `SCN-${Date.now()}`,
      scannedAt: body.scannedAt ?? new Date().toISOString(),
    } as T;

    return NextResponse.json(latest);
  }

  return { GET, POST };
}
