import { buildPublicFormPath, buildShortLinkUrl, getAppBaseUrl } from '@/lib/appBaseUrl';

export const TEMPLATE_TOKENS = [
  '{{formTitle}}',
  '{{beneficiaryFirstName}}',
  '{{beneficiaryLastName}}',
  '{{formLink}}',
  '{{shortLink}}',
] as const;

export const DEFAULT_EMAIL_SUBJECT = 'Please complete: {{formTitle}}';

export const DEFAULT_EMAIL_BODY = `Hello {{beneficiaryFirstName}},

Please complete the form "{{formTitle}}":
{{formLink}}

Thank you,
HWSETA`;

export const DEFAULT_SMS_BODY = 'HWSETA: Complete "{{formTitle}}": {{shortLink}}';

/** Example short link for template preview (`/s/Ab12Cd34` on `NEXT_PUBLIC_APP_URL`). */
export const SAMPLE_SHORT_LINK_CODE = 'Ab12Cd34';

export function sampleShortLinkForPreview(): string {
  return buildShortLinkUrl(SAMPLE_SHORT_LINK_CODE);
}

export interface MergeContext {
  formTitle: string;
  beneficiaryFirstName: string;
  beneficiaryLastName: string;
  formLink: string;
  shortLink: string;
}

export function splitName(fullName: string): { first: string; last: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { first: 'there', last: '' };
  if (parts.length === 1) return { first: parts[0], last: '' };
  return { first: parts[0], last: parts.slice(1).join(' ') };
}

export function buildFormLink(formId: string, distributionId?: string): string {
  const base = getAppBaseUrl();
  const path = buildPublicFormPath(formId);
  if (!distributionId) return `${base}${path}`;
  return `${base}${path}?d=${encodeURIComponent(distributionId)}`;
}

export function mergeTemplate(template: string, ctx: MergeContext): string {
  return template
    .replace(/\{\{formTitle\}\}/g, ctx.formTitle)
    .replace(/\{\{beneficiaryFirstName\}\}/g, ctx.beneficiaryFirstName)
    .replace(/\{\{beneficiaryLastName\}\}/g, ctx.beneficiaryLastName)
    .replace(/\{\{formLink\}\}/g, ctx.formLink)
    .replace(/\{\{shortLink\}\}/g, ctx.shortLink);
}

export function previewMergeContext(formTitle: string, formId: string): MergeContext {
  const { first, last } = splitName('Thabo Mokoena');
  return {
    formTitle,
    beneficiaryFirstName: first,
    beneficiaryLastName: last,
    formLink: buildFormLink(formId),
    shortLink: sampleShortLinkForPreview(),
  };
}
