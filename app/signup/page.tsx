import { LoginPage } from '@/components/auth/login-page';
import { safeNextPath } from '@/lib/auth/redirect';

export default async function Signup({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const params = await searchParams;
  return <LoginPage mode="signup" nextPath={safeNextPath(params.next)} />;
}
