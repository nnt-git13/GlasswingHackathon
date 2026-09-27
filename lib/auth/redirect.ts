export function safeNextPath(value: string | null | undefined, fallback = '/discover') {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return fallback;
  const pathname = value.split(/[?#]/, 1)[0];
  if (['/', '/login', '/signup'].includes(pathname) || pathname.startsWith('/auth/')) {
    return fallback;
  }
  return value;
}
