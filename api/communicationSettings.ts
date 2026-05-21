import apiClient from '@/ultis/apiClient';

const BASE = '/api/Admin/communication-settings';

function asObject(value: unknown): Record<string, unknown> | null {
  return value != null && typeof value === 'object' ? (value as Record<string, unknown>) : null;
}

function pickStr(o: Record<string, unknown>, ...keys: string[]): string {
  for (const k of keys) {
    const v = o[k];
    if (typeof v === 'string') return v;
    if (v != null && typeof v !== 'object') return String(v);
  }
  return '';
}

function pickNum(o: Record<string, unknown>, fallback: number, ...keys: string[]): number {
  for (const k of keys) {
    const v = o[k];
    if (typeof v === 'number' && Number.isFinite(v)) return v;
    if (typeof v === 'string') {
      const n = Number(v);
      if (Number.isFinite(n)) return n;
    }
  }
  return fallback;
}

function pickBool(o: Record<string, unknown>, fallback: boolean, ...keys: string[]): boolean {
  for (const k of keys) {
    const v = o[k];
    if (typeof v === 'boolean') return v;
    if (v === 1 || v === '1' || v === 'true') return true;
    if (v === 0 || v === '0' || v === 'false') return false;
  }
  return fallback;
}

export type SmsSettingsPayload = {
  userName: string;
  password: string;
  emailCopy: string;
};

export type EmailSettingsPayload = {
  userName: string;
  password: string;
  copyEmail: string;
  smtpHost: string;
  smtpPort: number;
  enableSsl: boolean;
  fromEmail: string;
  fromName: string;
  isActive: boolean;
  /** IMAP / incoming — used when syncing inbound mail (e.g. sync-inbound). */
  imapHost: string;
  imapPort: number;
  imapEnableSsl: boolean;
  imapUserName: string;
  imapPassword: string;
  imapEnabled: boolean;
};

/**
 * POST body for `communication-settings/email`.
 * Omit `imapPassword` when unchanged so the API keeps the stored IMAP password (see HW_EmailSettings / EmailSettingsUpsertRequest).
 */
export type EmailSettingsUpsertPayload = Omit<EmailSettingsPayload, 'imapPassword'> & {
  imapPassword?: string;
};

export function normalizeSmsSettings(data: unknown): SmsSettingsPayload {
  const o = asObject(data) ?? {};
  return {
    userName: pickStr(o, 'userName', 'UserName'),
    password: pickStr(o, 'password', 'Password'),
    emailCopy: pickStr(o, 'emailCopy', 'EmailCopy'),
  };
}

export function normalizeEmailSettings(data: unknown): EmailSettingsPayload {
  const o = asObject(data) ?? {};
  return {
    userName: pickStr(o, 'userName', 'UserName'),
    password: pickStr(o, 'password', 'Password'),
    copyEmail: pickStr(o, 'copyEmail', 'CopyEmail'),
    smtpHost: pickStr(o, 'smtpHost', 'SmtpHost'),
    smtpPort: pickNum(o, 465, 'smtpPort', 'SmtpPort'),
    enableSsl: pickBool(o, true, 'enableSsl', 'EnableSsl'),
    fromEmail: pickStr(o, 'fromEmail', 'FromEmail'),
    fromName: pickStr(o, 'fromName', 'FromName'),
    isActive: pickBool(o, true, 'isActive', 'IsActive'),
    imapHost: pickStr(o, 'imapHost', 'ImapHost', 'incomingHost', 'IncomingHost'),
    imapPort: pickNum(o, 993, 'imapPort', 'ImapPort', 'incomingPort', 'IncomingPort'),
    imapEnableSsl: pickBool(o, true, 'imapEnableSsl', 'ImapEnableSsl', 'incomingUseSsl', 'IncomingUseSsl'),
    imapUserName: pickStr(o, 'imapUserName', 'ImapUserName', 'imapUsername', 'ImapUsername'),
    imapPassword: pickStr(o, 'imapPassword', 'ImapPassword', 'incomingPassword', 'IncomingPassword'),
    imapEnabled: pickBool(o, false, 'imapEnabled', 'ImapEnabled', 'incomingEnabled', 'IncomingEnabled'),
  };
}

export async function getSmsSettings(): Promise<SmsSettingsPayload> {
  const { data } = await apiClient.get<unknown>(`${BASE}/sms`);
  return normalizeSmsSettings(data);
}

export async function saveSmsSettings(payload: SmsSettingsPayload): Promise<unknown> {
  const { data } = await apiClient.post(`${BASE}/sms`, payload);
  return data;
}

export async function getSmsCredits(): Promise<unknown> {
  const { data } = await apiClient.get<unknown>(`${BASE}/sms/credits`);
  return data;
}

export async function getEmailSettings(): Promise<EmailSettingsPayload> {
  const { data } = await apiClient.get<unknown>(`${BASE}/email`);
  return normalizeEmailSettings(data);
}

export async function saveEmailSettings(payload: EmailSettingsUpsertPayload): Promise<unknown> {
  const { data } = await apiClient.post(`${BASE}/email`, payload);
  return data;
}
