import { LoginPage } from '@/components/auth/login-page';
import { safeNextPath } from '@/lib/auth/redirect';

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const params = await searchParams;
  return (
    <LoginPage
      authError={params.error || ''}
      nextPath={safeNextPath(params.next)}
    />
  );
}
