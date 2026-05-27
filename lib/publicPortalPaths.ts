/** Routes where anonymous form fill must never trigger auth logout or /login redirect. */
const PUBLIC_PORTAL_PREFIXES = [
  '/form/',
  '/s/',
  '/signup',
  '/login',
  '/forgot-password',
  '/reset-password',
  '/privacy',
] as const;

export function isPublicPortalPath(pathname: string): boolean {
  const path = pathname.trim() || '/';
  return PUBLIC_PORTAL_PREFIXES.some(
    (prefix) => path === prefix.replace(/\/$/, '') || path.startsWith(prefix),
  );
}

/** Same-origin relative href for in-app form links (ignores absolute APP_URL host). */
export function normalizeSameOriginFormHref(link: string, origin?: string): string {
  const trimmed = link.trim();
  if (!trimmed) return trimmed;
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) return trimmed;

  const baseOrigin =
    origin ?? (typeof window !== 'undefined' ? window.location.origin : '');
  if (!baseOrigin) return trimmed;

  try {
    const url = new URL(trimmed, baseOrigin);
    if (url.origin === baseOrigin || url.pathname.startsWith('/form/')) {
      return `${url.pathname}${url.search}${url.hash}`;
    }
  } catch {
    /* ignore */
  }
  return trimmed;
}

export function buildFeedbackFormActionHref(row: {
  formLink?: string | null;
  formId: string;
  distributionId: string;
  notificationId?: string | null;
}): string {
  const fallback = `/form/${encodeURIComponent(row.formId)}`;
  const raw = row.formLink?.trim() || fallback;
  const normalized = normalizeSameOriginFormHref(raw);

  try {
    const url = new URL(normalized, 'http://hwseta.local');
    if (!url.pathname.startsWith('/form/')) return normalized;

    if (row.distributionId?.trim()) {
      url.searchParams.set('d', row.distributionId.trim());
    }
    if (row.notificationId?.trim()) {
      url.searchParams.set('n', row.notificationId.trim());
    }
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    const params = new URLSearchParams();
    if (row.distributionId?.trim()) params.set('d', row.distributionId.trim());
    if (row.notificationId?.trim()) params.set('n', row.notificationId.trim());
    const suffix = params.toString() ? `?${params.toString()}` : '';
    return `${fallback}${suffix}`;
  }
}
