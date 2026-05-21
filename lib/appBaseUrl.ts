import environment from '@/config/environment';

/** Portal origin from `NEXT_PUBLIC_APP_URL`, else browser origin in the client. */
export function getAppBaseUrl(): string {
  const fromEnv = environment.appUrl?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  if (typeof window !== 'undefined') return window.location.origin.replace(/\/$/, '');
  return '';
}

/** Public form fill path segment: `/form/{formId}` */
export const PUBLIC_FORM_PATH = '/form';

export function buildPublicFormPath(formId: string): string {
  return `${PUBLIC_FORM_PATH}/${encodeURIComponent(formId.trim())}`;
}

/** Public SMS short URL: `{NEXT_PUBLIC_APP_URL}/s/{code}` */
export function buildShortLinkUrl(code: string): string {
  const base = getAppBaseUrl();
  const path = `/s/${encodeURIComponent(code.trim())}`;
  return base ? `${base}${path}` : path;
}
