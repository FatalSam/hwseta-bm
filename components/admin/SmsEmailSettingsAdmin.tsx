'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChatBubbleLeftRightIcon, EnvelopeIcon } from '@heroicons/react/24/outline';
import { FaRedo, FaSave } from 'react-icons/fa';
import { adminFormTheme } from '@/components/admin/adminFormTheme';
import {
  getEmailSettings,
  getSmsCredits,
  getSmsSettings,
  saveEmailSettings,
  saveSmsSettings,
  type EmailSettingsPayload,
  type SmsSettingsPayload,
} from '@/api/communicationSettings';
import { useNotifications } from '@/components/ui/notification';

function cn(...c: (string | boolean | undefined)[]) {
  return c.filter(Boolean).join(' ');
}

function apiErr(e: unknown): string {
  if (axios.isAxiosError(e)) {
    const d = e.response?.data;
    if (typeof d === 'string') return d;
    if (d && typeof d === 'object') {
      const o = d as Record<string, unknown>;
      if (typeof o.message === 'string') return o.message;
      if (typeof o.title === 'string') return o.title;
    }
    return e.message || 'Request failed';
  }
  return e instanceof Error ? e.message : 'Something went wrong';
}

const queryKeys = {
  sms: ['admin-communication-settings', 'sms'] as const,
  email: ['admin-communication-settings', 'email'] as const,
};

/** Turns WinSMS credits API payload into user-facing toast copy. */
function buildSmsCreditsToast(data: unknown): { title: string; message: string } {
  const o = data && typeof data === 'object' ? (data as Record<string, unknown>) : null;
  if (!o) {
    const fallback =
      data == null
        ? 'No data returned from the credits service.'
        : typeof data === 'string' || typeof data === 'number'
          ? String(data)
          : 'Unexpected credits response.';
    return { title: 'SMS credits', message: fallback };
  }

  const credits = String(o.credits ?? o.Credits ?? '').trim();
  const userName = String(o.userName ?? o.UserName ?? '').trim();
  const raw = String(o.rawResponse ?? o.RawResponse ?? '').trim();
  const checkedRaw = String(o.checkedAtUtc ?? o.CheckedAtUtc ?? '').trim();

  const creditsNum = credits || (raw.match(/Credits=(\d+)/i)?.[1] ?? '').trim();

  const parts: string[] = [];
  if (creditsNum) {
    parts.push(`You have ${creditsNum} SMS credits available`);
  } else if (raw) {
    parts.push(raw.replace(/^Credits=/i, 'Credits: '));
  } else {
    parts.push('No credit balance was returned');
  }
  if (userName) {
    parts.push(`WinSMS account ${userName}`);
  }
  if (checkedRaw) {
    const d = new Date(checkedRaw);
    if (!Number.isNaN(d.getTime())) {
      parts.push(
        `Last checked ${d.toLocaleString('en-ZA', { dateStyle: 'medium', timeStyle: 'short' })}`,
      );
    }
  }

  const message = parts.join('. ') + (parts.length ? '.' : '');
  return {
    title: 'SMS credits (WinSMS)',
    message: message || 'Credits check completed.',
  };
}

type SettingsTab = 'sms' | 'email';

export default function SmsEmailSettingsAdmin() {
  const queryClient = useQueryClient();
  const { addNotification } = useNotifications();
  const [activeTab, setActiveTab] = useState<SettingsTab>('sms');
  const [sms, setSms] = useState<SmsSettingsPayload>({ userName: '', password: '', emailCopy: '' });
  const [email, setEmail] = useState<EmailSettingsPayload>({
    userName: '',
    password: '',
    copyEmail: '',
    smtpHost: '',
    smtpPort: 465,
    enableSsl: true,
    fromEmail: '',
    fromName: '',
    isActive: true,
    imapHost: '',
    imapPort: 993,
    imapEnableSsl: true,
    imapUserName: '',
    imapPassword: '',
    imapEnabled: false,
  });

  const smsQuery = useQuery({
    queryKey: queryKeys.sms,
    queryFn: getSmsSettings,
    retry: false,
  });

  const emailQuery = useQuery({
    queryKey: queryKeys.email,
    queryFn: getEmailSettings,
    retry: false,
  });

  useEffect(() => {
    if (smsQuery.data) {
      setSms(smsQuery.data);
    }
  }, [smsQuery.data]);

  useEffect(() => {
    if (emailQuery.data) {
      setEmail(emailQuery.data);
    }
  }, [emailQuery.data]);

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.sms });
    void queryClient.invalidateQueries({ queryKey: queryKeys.email });
  };

  const saveSms = useMutation({
    mutationFn: () => {
      if (!sms.userName.trim() || !sms.password.trim()) {
        throw new Error('Username and password are required.');
      }
      return saveSmsSettings({
        userName: sms.userName.trim(),
        password: sms.password,
        emailCopy: sms.emailCopy.trim(),
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.sms });
      addNotification({
        type: 'success',
        title: 'SMS settings saved',
        message: 'Your SMS communication settings were updated successfully.',
        duration: 4800,
      });
    },
    onError: (e) =>
      addNotification({
        type: 'error',
        title: 'Could not save SMS settings',
        message: apiErr(e),
        duration: 6000,
      }),
  });

  const saveEmail = useMutation({
    mutationFn: () => {
      if (!email.userName.trim() || !email.password.trim()) {
        throw new Error('Username and password are required.');
      }
      const rawPort = Number(email.smtpPort);
      const smtpPort =
        Number.isFinite(rawPort) && rawPort >= 1 && rawPort <= 65535 ? Math.floor(rawPort) : 465;
      const rawImap = Number(email.imapPort);
      const imapPort =
        Number.isFinite(rawImap) && rawImap >= 1 && rawImap <= 65535 ? Math.floor(rawImap) : 993;
      const imapPasswordTrim = email.imapPassword.trim();
      return saveEmailSettings({
        userName: email.userName.trim(),
        password: email.password,
        copyEmail: email.copyEmail.trim(),
        smtpHost: email.smtpHost.trim(),
        smtpPort,
        enableSsl: email.enableSsl,
        fromEmail: email.fromEmail.trim(),
        fromName: email.fromName.trim(),
        isActive: email.isActive,
        imapHost: email.imapHost.trim(),
        imapPort,
        imapEnableSsl: email.imapEnableSsl,
        imapUserName: email.imapUserName.trim(),
        imapEnabled: email.imapEnabled,
        ...(imapPasswordTrim ? { imapPassword: imapPasswordTrim } : {}),
      });
    },
    onSuccess: (data: unknown) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.email });
      setEmail((prev) => ({ ...prev, imapPassword: '' }));
      const msg =
        data &&
        typeof data === 'object' &&
        data !== null &&
        'message' in data &&
        typeof (data as { message: unknown }).message === 'string'
          ? (data as { message: string }).message
          : 'Your email communication settings were updated successfully.';
      addNotification({
        type: 'success',
        title: 'Email settings saved',
        message: msg,
        duration: 4800,
      });
    },
    onError: (e) =>
      addNotification({
        type: 'error',
        title: 'Could not save email settings',
        message: apiErr(e),
        duration: 6000,
      }),
  });

  const checkCredits = async () => {
    try {
      const data = await getSmsCredits();
      const { title, message } = buildSmsCreditsToast(data);
      addNotification({
        type: 'info',
        title,
        message,
        duration: 6500,
      });
    } catch (e) {
      addNotification({
        type: 'error',
        title: 'Could not load SMS credits',
        message: apiErr(e),
        duration: 6000,
      });
    }
  };

  const loading = smsQuery.isLoading || emailQuery.isLoading;
  const loadError =
    smsQuery.isError || emailQuery.isError
      ? [smsQuery.error, emailQuery.error].filter(Boolean).map(apiErr).join(' ')
      : null;

  return (
    <div className="mx-auto max-w-[1200px] bg-gradient-to-b from-slate-50/70 to-white pb-8">
      <div className="mb-4 flex items-center gap-2 px-4 text-sm text-gray-600 lg:px-6">
        <ChatBubbleLeftRightIcon className="h-4 w-4" />
        <span>/</span>
        <span className="font-medium text-gray-900">Setup</span>
        <span>/</span>
        <span className="font-medium text-gray-900">SMS &amp; Email Settings</span>
      </div>

      <div className="mb-4 flex flex-col gap-4 rounded-3xl border border-slate-200/80 bg-white px-5 py-4 shadow-[0_10px_30px_rgba(15,23,42,0.06)] sm:flex-row sm:items-start sm:justify-between lg:mx-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-hwseta-green">Communication</p>
          <h1 className="mt-1 text-2xl font-bold text-gray-900">SMS &amp; Email Settings</h1>
          <p className="mt-1 text-sm text-slate-600">Configure global communication credentials for this organisation.</p>
        </div>
        <button
          type="button"
          onClick={() => refresh()}
          disabled={smsQuery.isFetching || emailQuery.isFetching}
          className="inline-flex shrink-0 items-center gap-2 self-start rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-slate-50 disabled:opacity-50"
        >
          <FaRedo className={cn('h-3.5 w-3.5', (smsQuery.isFetching || emailQuery.isFetching) && 'animate-spin')} />
          Refresh
        </button>
      </div>

      {loadError && (
        <div className="mx-4 mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 lg:mx-6" role="alert">
          {loadError}
        </div>
      )}

      <div className="mx-auto max-w-3xl px-4 lg:px-6">
        <div className="overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-[0_12px_32px_rgba(15,23,42,0.06)]">
          <div className="border-b border-slate-100 px-3 pt-3 sm:px-4 sm:pt-4">
            <div
              className="grid grid-cols-2 gap-2 rounded-2xl bg-slate-100/80 p-1.5 ring-1 ring-slate-200/60"
              role="tablist"
              aria-label="Communication settings"
            >
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'sms'}
                id="comm-tab-sms"
                aria-controls="comm-panel-sms"
                onClick={() => setActiveTab('sms')}
                className={cn(
                  'flex min-h-[44px] items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all',
                  activeTab === 'sms'
                    ? 'bg-white text-[#017f3f] shadow-md ring-1 ring-[#017f3f]/20'
                    : 'text-slate-600 hover:bg-white/70 hover:text-slate-900',
                )}
              >
                <ChatBubbleLeftRightIcon className="h-5 w-5 shrink-0 opacity-90" aria-hidden />
                <span className="truncate">SMS</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'email'}
                id="comm-tab-email"
                aria-controls="comm-panel-email"
                onClick={() => setActiveTab('email')}
                className={cn(
                  'flex min-h-[44px] items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all',
                  activeTab === 'email'
                    ? 'bg-white text-[#017f3f] shadow-md ring-1 ring-[#017f3f]/20'
                    : 'text-slate-600 hover:bg-white/70 hover:text-slate-900',
                )}
              >
                <EnvelopeIcon className="h-5 w-5 shrink-0 opacity-90" aria-hidden />
                <span className="truncate">Email</span>
              </button>
            </div>
          </div>

          <div
            id="comm-panel-sms"
            role="tabpanel"
            aria-labelledby="comm-tab-sms"
            hidden={activeTab !== 'sms'}
            className="p-6 sm:p-8"
          >
          <div className="mb-5 flex items-center gap-2">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-hwseta-green/10 text-hwseta-green">
              <ChatBubbleLeftRightIcon className="h-5 w-5" aria-hidden />
            </span>
            <h2 className="text-lg font-bold text-slate-900">SMS Settings</h2>
          </div>

          <div className="space-y-4">
            <label className="block">
              <span className={adminFormTheme.label}>
                Username
                <span className={adminFormTheme.required} aria-hidden>
                  *
                </span>
              </span>
              <input
                type="text"
                autoComplete="username"
                value={sms.userName}
                onChange={(e) => setSms((s) => ({ ...s, userName: e.target.value }))}
                className={adminFormTheme.input}
                disabled={loading}
              />
            </label>
            <label className="block">
              <span className={adminFormTheme.label}>
                Password
                <span className={adminFormTheme.required} aria-hidden>
                  *
                </span>
              </span>
              <input
                type="password"
                autoComplete="current-password"
                value={sms.password}
                onChange={(e) => setSms((s) => ({ ...s, password: e.target.value }))}
                className={adminFormTheme.input}
                disabled={loading}
              />
            </label>
            <label className="block">
              <span className={adminFormTheme.label}>
                Email copy{' '}
                <span className="font-normal text-slate-500">(optional)</span>
              </span>
              <input
                type="email"
                autoComplete="email"
                value={sms.emailCopy}
                onChange={(e) => setSms((s) => ({ ...s, emailCopy: e.target.value }))}
                className={adminFormTheme.input}
                disabled={loading}
                placeholder="e.g. optional-copy@example.com"
              />
            </label>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => saveSms.mutate()}
              disabled={saveSms.isPending || loading}
              className={adminFormTheme.btnPrimary}
            >
              <FaSave className="h-4 w-4" />
              Save SMS Settings
            </button>
            <button
              type="button"
              onClick={() => void checkCredits()}
              className={adminFormTheme.btnSecondary}
            >
              <ChatBubbleLeftRightIcon className="h-4 w-4" />
              Check SMS Credits
            </button>
          </div>
          </div>

          <div
            id="comm-panel-email"
            role="tabpanel"
            aria-labelledby="comm-tab-email"
            hidden={activeTab !== 'email'}
            className="p-6 sm:p-8"
          >
          <div className="mb-5 flex items-center gap-2">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-hwseta-green/10 text-hwseta-green">
              <EnvelopeIcon className="h-5 w-5" aria-hidden />
            </span>
            <h2 className="text-lg font-bold text-slate-900">Email Settings</h2>
          </div>

          <div className="mb-6 rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm text-slate-700">
            <p className="font-semibold text-slate-900">Shared organisational mailbox (SMTP + IMAP)</p>
            <p className="mt-1 leading-relaxed">
              Outgoing mail uses <span className="font-medium">SMTP</span>; inbound sync uses{' '}
              <span className="font-medium">IMAP</span> only (same host often has two ports). Typical SSL
              setup: SMTP <span className="font-mono text-xs">465</span> (implicit TLS), IMAP{' '}
              <span className="font-mono text-xs">993</span>. Example host:{' '}
              <span className="font-mono text-xs">mail.mybeneficiary.co.za</span> — use the same mailbox
              username and password for both unless you set separate IMAP fields below.
            </p>
            <p className="mt-2 text-xs text-slate-600">
              SMTP password is required on each save. Leave IMAP password empty to keep the stored IMAP
              password unchanged.
            </p>
          </div>

          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="block md:col-span-2">
                <span className={adminFormTheme.label}>
                  Username
                  <span className={adminFormTheme.required} aria-hidden>
                    *
                  </span>
                </span>
                <input
                  type="text"
                  autoComplete="username"
                  value={email.userName}
                  onChange={(e) => setEmail((s) => ({ ...s, userName: e.target.value }))}
                  className={adminFormTheme.input}
                  disabled={loading}
                  placeholder="e.g. testing@mybeneficiary.co.za"
                />
              </label>
              <label className="block md:col-span-2">
                <span className={adminFormTheme.label}>
                  Password
                  <span className={adminFormTheme.required} aria-hidden>
                    *
                  </span>
                </span>
                <input
                  type="password"
                  autoComplete="current-password"
                  value={email.password}
                  onChange={(e) => setEmail((s) => ({ ...s, password: e.target.value }))}
                  className={adminFormTheme.input}
                  disabled={loading}
                />
              </label>
              <label className="block md:col-span-2">
                <span className={adminFormTheme.label}>
                  Copy email{' '}
                  <span className="font-normal text-slate-500">(optional)</span>
                </span>
                <input
                  type="email"
                  autoComplete="email"
                  value={email.copyEmail}
                  onChange={(e) => setEmail((s) => ({ ...s, copyEmail: e.target.value }))}
                  className={adminFormTheme.input}
                  disabled={loading}
                  placeholder="e.g. optional-copy@example.com"
                />
              </label>
            </div>

            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">SMTP</p>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <label className="block">
                  <span className={adminFormTheme.label}>SMTP host</span>
                  <input
                    type="text"
                    value={email.smtpHost}
                    onChange={(e) => setEmail((s) => ({ ...s, smtpHost: e.target.value }))}
                    className={adminFormTheme.input}
                    disabled={loading}
                    placeholder="e.g. mail.mybeneficiary.co.za"
                  />
                </label>
                <label className="block">
                  <span className={adminFormTheme.label}>SMTP port</span>
                  <input
                    type="number"
                    min={1}
                    max={65535}
                    value={email.smtpPort}
                    onChange={(e) => {
                      const n = Number(e.target.value);
                      setEmail((s) => ({
                        ...s,
                        smtpPort: e.target.value === '' ? 0 : Number.isFinite(n) ? n : s.smtpPort,
                      }));
                    }}
                    className={adminFormTheme.input}
                    disabled={loading}
                  />
                </label>
                <label className="flex cursor-pointer items-center gap-3 md:col-span-2">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300 text-hwseta-green focus:ring-hwseta-green"
                    checked={email.enableSsl}
                    onChange={(e) => setEmail((s) => ({ ...s, enableSsl: e.target.checked }))}
                    disabled={loading}
                  />
                  <span className="text-sm font-medium text-slate-800">
                    Use SSL/TLS (SMTP — e.g. implicit TLS on port 465)
                  </span>
                </label>
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Incoming (IMAP)
              </p>
              <p className="mb-3 text-sm text-slate-600">
                Used when admins run <span className="font-medium text-slate-800">Sync inbox</span> (IMAP
                INBOX → matches beneficiary email addresses). Save before syncing. POP3 is not used.
              </p>
              <label className="mb-4 flex cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300 text-hwseta-green focus:ring-hwseta-green"
                  checked={email.imapEnabled}
                  onChange={(e) => setEmail((s) => ({ ...s, imapEnabled: e.target.checked }))}
                  disabled={loading}
                />
                <span className="text-sm font-medium text-slate-800">Enable IMAP / inbound sync</span>
              </label>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <label className="block md:col-span-2">
                  <span className={adminFormTheme.label}>IMAP host</span>
                  <input
                    type="text"
                    value={email.imapHost}
                    onChange={(e) => setEmail((s) => ({ ...s, imapHost: e.target.value }))}
                    className={adminFormTheme.input}
                    disabled={loading}
                    placeholder="e.g. mail.mybeneficiary.co.za"
                  />
                </label>
                <label className="block">
                  <span className={adminFormTheme.label}>IMAP port</span>
                  <input
                    type="number"
                    min={1}
                    max={65535}
                    value={email.imapPort}
                    onChange={(e) => {
                      const n = Number(e.target.value);
                      setEmail((s) => ({
                        ...s,
                        imapPort: e.target.value === '' ? 0 : Number.isFinite(n) ? n : s.imapPort,
                      }));
                    }}
                    className={adminFormTheme.input}
                    disabled={loading}
                  />
                </label>
                <label className="flex cursor-pointer items-center gap-3 md:col-span-2 md:pt-6">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300 text-hwseta-green focus:ring-hwseta-green"
                    checked={email.imapEnableSsl}
                    onChange={(e) => setEmail((s) => ({ ...s, imapEnableSsl: e.target.checked }))}
                    disabled={loading}
                  />
                  <span className="text-sm font-medium text-slate-800">Use SSL/TLS (IMAP)</span>
                </label>
                <label className="block md:col-span-2">
                  <span className={adminFormTheme.label}>
                    IMAP username <span className="font-normal text-slate-500">(optional)</span>
                  </span>
                  <input
                    type="text"
                    autoComplete="off"
                    value={email.imapUserName}
                    onChange={(e) => setEmail((s) => ({ ...s, imapUserName: e.target.value }))}
                    className={adminFormTheme.input}
                    disabled={loading}
                    placeholder="Leave blank to use SMTP username (same mailbox)"
                  />
                </label>
                <label className="block md:col-span-2">
                  <span className={adminFormTheme.label}>
                    IMAP password <span className="font-normal text-slate-500">(optional)</span>
                  </span>
                  <input
                    type="password"
                    autoComplete="new-password"
                    value={email.imapPassword}
                    onChange={(e) => setEmail((s) => ({ ...s, imapPassword: e.target.value }))}
                    className={adminFormTheme.input}
                    disabled={loading}
                    placeholder="Leave blank to keep stored password, or use SMTP password"
                  />
                </label>
              </div>
            </div>

            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">From</p>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <label className="block">
                  <span className={adminFormTheme.label}>From email</span>
                  <input
                    type="email"
                    value={email.fromEmail}
                    onChange={(e) => setEmail((s) => ({ ...s, fromEmail: e.target.value }))}
                    className={adminFormTheme.input}
                    disabled={loading}
                    placeholder="notifications@example.org"
                  />
                </label>
                <label className="block">
                  <span className={adminFormTheme.label}>From name</span>
                  <input
                    type="text"
                    value={email.fromName}
                    onChange={(e) => setEmail((s) => ({ ...s, fromName: e.target.value }))}
                    className={adminFormTheme.input}
                    disabled={loading}
                    placeholder="e.g. HWSETA Notifications"
                  />
                </label>
              </div>
            </div>

            <label className="flex cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 text-hwseta-green focus:ring-hwseta-green"
                checked={email.isActive}
                onChange={(e) => setEmail((s) => ({ ...s, isActive: e.target.checked }))}
                disabled={loading}
              />
              <span className="text-sm font-medium text-slate-800">Email sending active</span>
            </label>
          </div>

          <div className="mt-6">
            <button
              type="button"
              onClick={() => saveEmail.mutate()}
              disabled={saveEmail.isPending || loading}
              className={adminFormTheme.btnPrimary}
            >
              <FaSave className="h-4 w-4" />
              Save Email Settings
            </button>
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}
