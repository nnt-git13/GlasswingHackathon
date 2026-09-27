import { createClient } from '@/lib/supabase/server';
import { handleGateway } from '@/lib/gateway/api';
import { GatewayError } from '@/lib/gateway/errors';
import { gatewayService } from '@/lib/gateway/service';
import { supabaseConfig } from '@/lib/supabase/config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
// A persistent Node deployment is required; scan execution is request-bound.
export const maxDuration = 900;
async function authenticate() {
  // Local hackathon demo mode: keep Gateway data owner-scoped even when
  // Supabase is intentionally not configured. Real configured deployments
  // still require a verified Supabase user below.
  if (!supabaseConfig()) return 'local-demo-user';

  try {
    const client = await createClient();
    const {
      data: { user },
      error,
    } = await client.auth.getUser();
    if (error || !user) throw new Error();
    return user.id;
  } catch {
    throw new GatewayError('AUTHENTICATION_REQUIRED', 'Authentication required.', 401);
  }
}
async function handler(request: Request, context: { params: Promise<{ path?: string[] }> }) {
  return handleGateway(request, (await context.params).path || [], authenticate, gatewayService());
}
export { handler as GET, handler as POST, handler as PATCH };
