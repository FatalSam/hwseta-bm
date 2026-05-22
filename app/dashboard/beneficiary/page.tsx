'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import {
  FaArrowRight,
  FaChartLine,
  FaEnvelope,
  FaExclamationCircle,
  FaRegCommentDots,
  FaSms,
  FaUserGraduate,
} from 'react-icons/fa';
import { listBeneficiaryEmailInbox } from '@/api/beneficiaryEmailMessages';
import { listBeneficiaryComplaints } from '@/api/beneficiaryComplaints';
import { listBeneficiaryProgrammeLinks } from '@/api/beneficiaryProfile';
import { listBeneficiarySms } from '@/api/beneficiarySms';
import { useAuthStore } from '@/store/authStore';
import { cn } from '@/ultis/cn';
import type { BeneficiaryProgrammeLink } from '@/types/beneficiaryProfile';
import type { BeneficiaryComplaintListItem } from '@/types/beneficiaryComplaints';

function toText(v: unknown): string {
  return v == null ? '' : String(v).trim();
}

function countDistinctProgrammes(links: BeneficiaryProgrammeLink[]): number {
  const keys = new Set<string>();
  for (const l of links) {
    const id = toText(l.programmeId);
    const name = toText(l.programmeName);
    if (!id && !name) continue;
    keys.add(id ? `id:${id}` : `name:${name.toLowerCase()}`);
  }
  return keys.size;
}

function countDistinctQualifications(links: BeneficiaryProgrammeLink[]): number {
  const keys = new Set<string>();
  for (const l of links) {
    const id = toText(l.qualificationId);
    const name = toText(l.customQualificationName ?? l.qualificationName);
    if (!id && !name) continue;
    keys.add(id ? `id:${id}` : `name:${name.toLowerCase()}`);
  }
  return keys.size;
}

function parseDateMs(iso: string | null | undefined): number {
  if (!iso?.trim()) return 0;
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : 0;
}

function linkActivityMs(l: BeneficiaryProgrammeLink): number {
  return Math.max(parseDateMs(l.endDate), parseDateMs(l.startDate));
}

function formatLastReceived(iso: string | null | undefined): string {
  if (!iso?.trim()) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.trim();
  return d.toLocaleString('en-ZA', { dateStyle: 'medium', timeStyle: 'short' });
}

function formatDashboardDateOnly(iso: string | null | undefined): string {
  if (!iso?.trim()) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.trim();
  return d.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' });
}

function latestSentAtFromEmailItems(items: { sentAt?: string }[]): string | null {
  let best = 0;
  let s: string | null = null;
  for (const row of items) {
    const ms = parseDateMs(row.sentAt);
    if (ms >= best && row.sentAt?.trim()) {
      best = ms;
      s = row.sentAt.trim();
    }
  }
  return s;
}

function latestSentDateFromSms(items: { sentDate?: string }[]): string | null {
  let best = 0;
  let s: string | null = null;
  for (const row of items) {
    const ms = parseDateMs(row.sentDate);
    if (ms >= best && row.sentDate?.trim()) {
      best = ms;
      s = row.sentDate.trim();
    }
  }
  return s;
}

function summarizeLatestProgramme(links: BeneficiaryProgrammeLink[]): string | null {
  if (links.length === 0) return null;
  const sorted = [...links].sort((a, b) => linkActivityMs(b) - linkActivityMs(a));
  const l = sorted[0];
  if (!l) return null;
  const name = toText(l.programmeName);
  if (!name) return null;
  const status = toText(l.programmeCompletionStatus);
  const parts: string[] = [`Latest: ${name}`];
  if (status) parts.push(status);
  const end = parseDateMs(l.endDate);
  const start = parseDateMs(l.startDate);
  if (end > 0) parts.push(`Ended ${formatDashboardDateOnly(l.endDate)}`);
  else if (start > 0) parts.push(`Started ${formatDashboardDateOnly(l.startDate)}`);
  return parts.join(' · ');
}

function summarizeLatestQualification(links: BeneficiaryProgrammeLink[]): string | null {
  const withQual = links.filter(
    (l) =>
      toText(l.qualificationId) || toText(l.qualificationName) || toText(l.customQualificationName),
  );
  if (withQual.length === 0) return null;
  const sorted = [...withQual].sort((a, b) => linkActivityMs(b) - linkActivityMs(a));
  const l = sorted[0];
  if (!l) return null;
  const name = toText(l.customQualificationName ?? l.qualificationName);
  if (!name) return null;
  const status = toText(l.programmeCompletionStatus);
  const parts: string[] = [`Latest: ${name}`];
  if (status) parts.push(status);
  const end = parseDateMs(l.endDate);
  const start = parseDateMs(l.startDate);
  if (end > 0) parts.push(`Ended ${formatDashboardDateOnly(l.endDate)}`);
  else if (start > 0) parts.push(`Started ${formatDashboardDateOnly(l.startDate)}`);
  return parts.join(' · ');
}

function emailInboxErrorSubtitle(e: unknown): string {
  if (axios.isAxiosError(e) && e.response?.status === 503) {
    return 'Inbox is temporarily unavailable on the server.';
  }
  return 'Could not load inbox.';
}

type ProgrammeStatusKey =
  | 'Completed'
  | 'In Progress'
  | 'Not Completed'
  | 'Withdrawn'
  | 'Dropped Out';

type ProgrammeStatusAggregate = Record<ProgrammeStatusKey, number>;

function buildProgrammeCompletionCounts(links: BeneficiaryProgrammeLink[]): ProgrammeStatusAggregate {
  const base: ProgrammeStatusAggregate = {
    Completed: 0,
    'In Progress': 0,
    'Not Completed': 0,
    Withdrawn: 0,
    'Dropped Out': 0,
  };
  const known = new Set<string>(['Completed', 'In Progress', 'Not Completed', 'Withdrawn', 'Dropped Out']);
  for (const l of links) {
    const raw = toText(l.programmeCompletionStatus);
    if (!raw || !known.has(raw)) continue;
    base[raw as ProgrammeStatusKey] += 1;
  }
  return base;
}

type ComplaintStatusRow = { label: string; count: number; fill: string };

const CARD_VARIANT = {
  emerald: {
    orbTR: 'from-[#017f3f]/25 via-emerald-400/15 to-transparent',
    orbBL: 'from-[#feca07]/20 via-amber-200/10 to-transparent',
    hoverRing: 'hover:ring-emerald-300/40 hover:border-emerald-200/50',
  },
  emeraldGold: {
    orbTR: 'from-[#017f3f]/20 via-[#feca07]/12 to-transparent',
    orbBL: 'from-emerald-300/15 via-transparent to-transparent',
    hoverRing: 'hover:ring-emerald-300/35 hover:border-[#feca07]/30',
  },
  coral: {
    orbTR: 'from-[#d81920]/18 via-rose-300/10 to-transparent',
    orbBL: 'from-slate-200/30 to-transparent',
    hoverRing: 'hover:ring-rose-200/50 hover:border-rose-200/40',
  },
  amber: {
    orbTR: 'from-[#feca07]/25 via-amber-400/15 to-transparent',
    orbBL: 'from-[#d81920]/12 to-transparent',
    hoverRing: 'hover:ring-amber-200/50 hover:border-amber-200/45',
  },
  gold: {
    orbTR: 'from-[#feca07]/30 via-yellow-200/15 to-transparent',
    orbBL: 'from-[#017f3f]/12 to-transparent',
    hoverRing: 'hover:ring-yellow-200/50 hover:border-[#feca07]/35',
  },
} as const;

type CardVariantKey = keyof typeof CARD_VARIANT;

const COMPLAINT_STATUS_PALETTE = ['#059669', '#2563eb', '#d97706', '#64748b', '#e11d48', '#7c3aed', '#0ea5e9', '#c026d3'];

function buildComplaintStatusRows(items: BeneficiaryComplaintListItem[]): ComplaintStatusRow[] {
  const counts = new Map<string, number>();
  for (const c of items) {
    const label =
      toText(c.complaintsStatusDescription) ||
      toText(c.complaintsStatus) ||
      'Unknown';
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  const sorted = Array.from(counts.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);
  const top = sorted.slice(0, 7);
  const rest = sorted.slice(7);
  const otherCount = rest.reduce((s, r) => s + r.count, 0);
  if (otherCount > 0) {
    top.push({ label: 'Other', count: otherCount });
  }
  return top.map((row, i) => ({
    ...row,
    fill: COMPLAINT_STATUS_PALETTE[i % COMPLAINT_STATUS_PALETTE.length]!,
  }));
}

function ProgrammeCompletionDistribution({
  statuses,
  loading,
}: {
  statuses: ProgrammeStatusAggregate;
  loading: boolean;
}) {
  const segments = [
    { key: 'Completed', label: 'Completed', count: statuses.Completed, fill: '#059669' },
    { key: 'In Progress', label: 'In Progress', count: statuses['In Progress'], fill: '#2563eb' },
    { key: 'Not Completed', label: 'Not Completed', count: statuses['Not Completed'], fill: '#64748b' },
    { key: 'Withdrawn', label: 'Withdrawn', count: statuses.Withdrawn, fill: '#d97706' },
    { key: 'Dropped Out', label: 'Dropped Out', count: statuses['Dropped Out'], fill: '#e11d48' },
  ] as const;
  const total = segments.reduce((sum, row) => sum + row.count, 0);

  if (loading) {
    return (
      <div className="space-y-2" aria-hidden>
        <div className="h-3 animate-pulse rounded-full bg-slate-200/70" />
        <div className="space-y-1.5">
          {segments.map((row) => (
            <div key={row.key} className="h-3.5 animate-pulse rounded bg-slate-200/60" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3" aria-label="Programme links by completion status">
      <div
        className="flex h-4 w-full overflow-hidden rounded-full border border-white/60 bg-slate-200/40 p-0.5 shadow-[inset_0_2px_4px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/40"
        title={total > 0 ? `Total programme links: ${total}` : 'No programme links'}
      >
        <div className="flex h-full w-full overflow-hidden rounded-full">
          {total > 0
            ? segments.map((row) =>
                row.count > 0 ? (
                  <div
                    key={row.key}
                    style={{ width: `${(row.count / total) * 100}%`, backgroundColor: row.fill }}
                    className="min-w-px bg-gradient-to-b from-white/25 to-transparent shadow-[inset_0_-1px_0_rgba(0,0,0,0.08)] first:rounded-l-full last:rounded-r-full"
                    title={`${row.label}: ${row.count}`}
                  />
                ) : null,
              )
            : null}
        </div>
      </div>
      <ul className="space-y-1.5" role="list">
        {segments.map((row) => (
          <li
            key={row.key}
            className="flex items-center justify-between gap-2 rounded-lg px-1.5 py-1 text-[10px] leading-snug text-slate-700 transition-colors hover:bg-white/60"
          >
            <span className="flex min-w-0 items-center gap-1.5">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full shadow-sm ring-2 ring-white/80"
                style={{ backgroundColor: row.fill }}
                aria-hidden
              />
              <span className="truncate font-medium">{row.label}</span>
            </span>
            <span className="shrink-0 tabular-nums text-sm font-bold text-slate-900">{row.count}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ComplaintStatusDistribution({
  rows,
  loading,
  totalComplaints,
}: {
  rows: ComplaintStatusRow[];
  loading: boolean;
  totalComplaints: number;
}) {
  const total = rows.reduce((s, r) => s + r.count, 0);

  if (loading) {
    return (
      <div className="space-y-2" aria-hidden>
        <div className="h-3 animate-pulse rounded-full bg-slate-200/70" />
        <div className="space-y-1.5">
          {[1, 2, 3].map((k) => (
            <div key={k} className="h-3.5 animate-pulse rounded bg-slate-200/60" />
          ))}
        </div>
      </div>
    );
  }

  if (totalComplaints === 0) {
    return (
      <p className="rounded-xl border border-slate-100/80 bg-white/50 px-3 py-2.5 text-xs text-slate-500 shadow-inner">
        No complaints submitted yet.
      </p>
    );
  }

  return (
    <div className="space-y-3" aria-label="Complaints by status">
      <div
        className="flex h-4 w-full overflow-hidden rounded-full border border-white/60 bg-slate-200/40 p-0.5 shadow-[inset_0_2px_4px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/40"
        title={total > 0 ? `Total complaints: ${total}` : 'No complaints'}
      >
        <div className="flex h-full w-full overflow-hidden rounded-full">
          {total > 0
            ? rows.map((row) =>
                row.count > 0 ? (
                  <div
                    key={row.label}
                    style={{ width: `${(row.count / total) * 100}%`, backgroundColor: row.fill }}
                    className="min-w-px bg-gradient-to-b from-white/30 to-transparent shadow-[inset_0_-1px_0_rgba(0,0,0,0.08)] first:rounded-l-full last:rounded-r-full"
                    title={`${row.label}: ${row.count}`}
                  />
                ) : null,
              )
            : null}
        </div>
      </div>
      <ul className="space-y-1.5" role="list">
        {rows.map((row) => (
          <li
            key={row.label}
            className="flex items-center justify-between gap-2 rounded-lg px-1.5 py-1 text-[10px] leading-snug text-slate-700 transition-colors hover:bg-white/60"
          >
            <span className="flex min-w-0 items-center gap-1.5">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full shadow-sm ring-2 ring-white/80"
                style={{ backgroundColor: row.fill }}
                aria-hidden
              />
              <span className="truncate font-medium">{row.label}</span>
            </span>
            <span className="shrink-0 tabular-nums text-sm font-bold text-slate-900">{row.count}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function BeneficiaryDashboardPage() {
  const { user, isAuthenticated } = useAuthStore();
  const isReady = Boolean(isAuthenticated && user?.userID);

  const programmeLinksQuery = useQuery({
    queryKey: ['beneficiary-dashboard', 'programme-links'],
    queryFn: listBeneficiaryProgrammeLinks,
    enabled: isReady,
    retry: false,
  });

  const smsQuery = useQuery({
    queryKey: ['beneficiary-dashboard', 'sms'],
    queryFn: listBeneficiarySms,
    enabled: isReady,
    retry: false,
  });

  const emailQuery = useQuery({
    queryKey: ['beneficiary-dashboard', 'email-inbox'],
    queryFn: listBeneficiaryEmailInbox,
    enabled: isReady,
    retry: false,
  });

  const complaintsQuery = useQuery({
    queryKey: ['beneficiary-dashboard', 'complaints'],
    queryFn: () => listBeneficiaryComplaints(1, 500),
    enabled: isReady,
    retry: false,
  });

  const links = programmeLinksQuery.data ?? [];
  const programmeCount = useMemo(() => countDistinctProgrammes(links), [links]);
  const qualificationCount = useMemo(() => countDistinctQualifications(links), [links]);
  const programmeStatuses = useMemo(() => buildProgrammeCompletionCounts(links), [links]);

  const complaintItems = complaintsQuery.data?.items ?? [];
  const complaintTotal = complaintsQuery.data?.totalCount ?? complaintItems.length;
  const complaintStatusRows = useMemo(() => buildComplaintStatusRows(complaintItems), [complaintItems]);

  const smsCount = smsQuery.data?.count ?? smsQuery.data?.items.length ?? 0;
  const smsItems = smsQuery.data?.items ?? [];
  const lastSmsAt = useMemo(() => latestSentDateFromSms(smsItems), [smsItems]);

  const emailItems = emailQuery.data?.items ?? [];
  const emailCount = emailQuery.data?.count ?? emailItems.length;
  const lastEmailAt = useMemo(() => latestSentAtFromEmailItems(emailItems), [emailItems]);

  const programmeCardSubtitle = useMemo(() => summarizeLatestProgramme(links), [links]);
  const qualificationCardSubtitle = useMemo(() => summarizeLatestQualification(links), [links]);

  const smsSubtitle = useMemo(() => {
    if (smsQuery.isLoading) return 'Loading…';
    if (smsCount === 0) return 'No SMS yet.';
    if (lastSmsAt) return `Last received ${formatLastReceived(lastSmsAt)}`;
    return 'Last received time unavailable.';
  }, [smsQuery.isLoading, smsCount, lastSmsAt]);

  const emailSubtitle = useMemo(() => {
    if (emailQuery.isLoading) return 'Loading…';
    if (emailQuery.isError) return emailInboxErrorSubtitle(emailQuery.error);
    if (emailCount === 0) return 'No messages yet.';
    if (lastEmailAt) return `Last received ${formatLastReceived(lastEmailAt)}`;
    return 'Last received time unavailable.';
  }, [emailQuery.isLoading, emailQuery.isError, emailQuery.error, emailCount, lastEmailAt]);

  const dashboardCards = useMemo(
    () =>
      [
        {
          kind: 'metric' as const,
          title: 'Programmes',
          href: '/dashboard/beneficiary/programmes',
          value: String(programmeCount),
          subtitle: programmeLinksQuery.isLoading
            ? 'Loading…'
            : (programmeCardSubtitle ?? 'Add programme links on your profile to see detail here.'),
          icon: FaUserGraduate,
          accent: 'from-[#017f3f]/[0.07] via-white/95 to-white',
          iconBg:
            'bg-gradient-to-br from-[#017f3f]/12 to-[#017f3f]/6 text-[#017f3f] shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] ring-1 ring-[#017f3f]/15',
          variant: 'emerald' satisfies CardVariantKey,
          loading: programmeLinksQuery.isLoading,
        },
        {
          kind: 'metric' as const,
          title: 'Qualifications',
          href: '/dashboard/beneficiary/profile?tab=programmes',
          value: String(qualificationCount),
          subtitle: programmeLinksQuery.isLoading
            ? 'Loading…'
            : (qualificationCardSubtitle ??
              'Link qualifications under your programme records to see the latest one here.'),
          icon: FaUserGraduate,
          accent: 'from-[#017f3f]/[0.06] via-[#feca07]/[0.06] to-white',
          iconBg:
            'bg-gradient-to-br from-[#017f3f]/12 to-emerald-600/10 text-[#017f3f] shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] ring-1 ring-[#017f3f]/15',
          variant: 'emerald' satisfies CardVariantKey,
          loading: programmeLinksQuery.isLoading,
        },
        {
          kind: 'programmeStatus' as const,
          title: 'Qualification status',
          href: '/dashboard/beneficiary/profile?tab=programmes',
          statuses: programmeStatuses,
          loading: programmeLinksQuery.isLoading,
          icon: FaChartLine,
          accent: 'from-emerald-50/80 via-white to-[#fffdf7]',
          iconBg:
            'bg-gradient-to-br from-[#017f3f]/14 to-emerald-500/10 text-[#017f3f] shadow-[inset_0_1px_0_rgba(255,255,255,0.95)] ring-1 ring-emerald-400/25',
          variant: 'emeraldGold' satisfies CardVariantKey,
        },
        {
          kind: 'metric' as const,
          title: 'SMS',
          href: '/dashboard/beneficiary/communication/sms',
          value: smsQuery.isLoading ? '…' : String(smsCount),
          subtitle: smsSubtitle,
          icon: FaSms,
          accent: 'from-[#017f3f]/[0.06] via-white to-emerald-50/30',
          iconBg:
            'bg-gradient-to-br from-[#017f3f]/12 to-[#017f3f]/5 text-[#017f3f] shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] ring-1 ring-[#017f3f]/15',
          variant: 'emerald' satisfies CardVariantKey,
          loading: smsQuery.isLoading,
        },
        {
          kind: 'metric' as const,
          title: 'Emails',
          href: '/dashboard/beneficiary/communication/email',
          value: emailQuery.isLoading ? '…' : emailQuery.isError ? '—' : String(emailCount),
          subtitle: emailSubtitle,
          icon: FaEnvelope,
          accent: 'from-rose-50/60 via-white to-white',
          iconBg:
            'bg-gradient-to-br from-[#d81920]/14 to-rose-500/10 text-[#d81920] shadow-[inset_0_1px_0_rgba(255,255,255,0.95)] ring-1 ring-rose-300/30',
          variant: 'coral' satisfies CardVariantKey,
          loading: emailQuery.isLoading,
          mutedValue: emailQuery.isError,
        },
        {
          kind: 'complaintStatus' as const,
          title: 'Complaints',
          href: '/dashboard/beneficiary/complaints',
          rows: complaintStatusRows,
          totalComplaints: complaintTotal,
          loading: complaintsQuery.isLoading,
          icon: FaExclamationCircle,
          accent: 'from-amber-50/70 via-white to-red-50/20',
          iconBg:
            'bg-gradient-to-br from-[#feca07]/25 to-amber-500/15 text-[#9a6b00] shadow-[inset_0_1px_0_rgba(255,255,255,0.95)] ring-1 ring-amber-300/35',
          variant: 'amber' satisfies CardVariantKey,
        },
        {
          kind: 'metric' as const,
          title: 'Feedback surveys',
          href: '/dashboard/beneficiary/feedback-forms',
          value: 'Soon',
          subtitle: 'We will connect this dashboard metric when surveys go live.',
          icon: FaRegCommentDots,
          accent: 'from-[#fffbeb] via-white to-emerald-50/20',
          iconBg:
            'bg-gradient-to-br from-[#feca07]/22 to-yellow-300/12 text-[#9a7200] shadow-[inset_0_1px_0_rgba(255,255,255,0.95)] ring-1 ring-[#feca07]/35',
          variant: 'gold' satisfies CardVariantKey,
          loading: false,
          mutedValue: true,
        },
      ] as const,
    [
      programmeCount,
      qualificationCount,
      programmeStatuses,
      programmeCardSubtitle,
      qualificationCardSubtitle,
      smsQuery.isLoading,
      smsCount,
      smsSubtitle,
      emailQuery.isLoading,
      emailQuery.isError,
      emailCount,
      emailSubtitle,
      complaintStatusRows,
      complaintTotal,
      complaintsQuery.isLoading,
      programmeLinksQuery.isLoading,
    ],
  );

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <section className="relative overflow-hidden rounded-[2rem] border border-white/80 bg-gradient-to-br from-white via-slate-50/50 to-emerald-50/30 p-6 shadow-[0_4px_24px_-8px_rgba(15,23,42,0.08),0_1px_0_rgba(255,255,255,0.9)_inset] sm:p-8">
          <div
            className="pointer-events-none absolute -right-16 top-0 h-48 w-48 rounded-full bg-[radial-gradient(circle_at_center,rgba(1,127,63,0.12),transparent_70%)] blur-2xl"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -left-10 bottom-0 h-36 w-36 rounded-full bg-[radial-gradient(circle_at_center,rgba(254,202,7,0.15),transparent_65%)] blur-2xl"
            aria-hidden
          />
          <div className="relative">
            <h1 className="bg-gradient-to-r from-slate-900 via-slate-800 to-[#124a3f] bg-clip-text text-2xl font-bold tracking-tight text-transparent sm:text-3xl">
              Welcome{user?.firstName ? ` ${user.firstName}` : ''}
            </h1>
            <p className="mt-2 whitespace-nowrap text-sm leading-relaxed text-slate-600 sm:text-base">
              Everything you need your profile, programmes, messages, complaints, and support all in one place.
            </p>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {dashboardCards.map((card) => {
            const Icon = card.icon;
            const v = CARD_VARIANT[card.variant];

            return (
              <Link
                key={card.title}
                href={card.href}
                className={cn(
                  'group relative flex flex-col overflow-hidden rounded-3xl border border-white/70 bg-gradient-to-br p-5',
                  'shadow-[0_2px_8px_rgba(15,23,42,0.04),0_16px_40px_-12px_rgba(1,127,63,0.12),inset_0_1px_0_rgba(255,255,255,0.85)]',
                  'ring-1 ring-slate-200/40 backdrop-blur-[2px] transition duration-300 ease-out',
                  'hover:-translate-y-1.5 hover:shadow-[0_12px_40px_-8px_rgba(15,23,42,0.12),0_28px_56px_-12px_rgba(1,127,63,0.18)]',
                  v.hoverRing,
                  card.accent,
                  card.kind === 'metric' ? 'min-h-[11rem]' : 'min-h-[12rem]',
                )}
              >
                <div
                  className={cn(
                    'pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-gradient-to-br to-transparent opacity-90 blur-3xl transition duration-500 group-hover:opacity-100',
                    v.orbTR,
                  )}
                  aria-hidden
                />
                <div
                  className={cn(
                    'pointer-events-none absolute -bottom-14 -left-10 h-36 w-36 rounded-full bg-gradient-to-tr to-transparent opacity-70 blur-3xl',
                    v.orbBL,
                  )}
                  aria-hidden
                />
                <div
                  className="pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-[#017f3f]/20 to-transparent opacity-60"
                  aria-hidden
                />

                <div className="relative z-10 flex items-start justify-between gap-3">
                  <span
                    className={cn(
                      'inline-flex rounded-2xl p-2.5 transition duration-300 group-hover:scale-[1.03]',
                      card.iconBg,
                    )}
                  >
                    <Icon className="h-[1.15rem] w-[1.15rem]" />
                  </span>
                  <span
                    className={cn(
                      'rounded-full border border-white/90 bg-white/75 p-2 text-slate-400 shadow-[0_4px_12px_rgba(15,23,42,0.08)] backdrop-blur-md',
                      'transition duration-300 group-hover:border-[#017f3f]/25 group-hover:text-[#017f3f] group-hover:shadow-[0_6px_16px_rgba(1,127,63,0.15)]',
                    )}
                  >
                    <FaArrowRight className="h-3 w-3" />
                  </span>
                </div>

                <p className="relative z-10 mt-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  {card.title}
                </p>

                {card.kind === 'metric' ? (
                  <>
                    <p
                      className={cn(
                        'relative z-10 mt-1 text-3xl font-bold tabular-nums tracking-tight',
                        'loading' in card && card.loading && 'text-slate-400',
                        !('loading' in card && card.loading) &&
                          !('mutedValue' in card && card.mutedValue) &&
                          'bg-gradient-to-b from-slate-900 to-slate-700 bg-clip-text text-transparent',
                        !('loading' in card && card.loading) &&
                          'mutedValue' in card &&
                          card.mutedValue &&
                          'bg-gradient-to-b from-slate-600 to-slate-500 bg-clip-text text-2xl text-transparent',
                      )}
                    >
                      {'loading' in card && card.loading ? '…' : card.value}
                    </p>
                    {'subtitle' in card && card.subtitle ? (
                      <p className="relative z-10 mt-2 line-clamp-4 text-xs leading-snug text-slate-500">
                        {card.subtitle}
                      </p>
                    ) : null}
                  </>
                ) : card.kind === 'programmeStatus' ? (
                  <div className="relative z-10 mt-3 flex min-h-0 flex-1 flex-col">
                    <ProgrammeCompletionDistribution statuses={card.statuses} loading={card.loading} />
                  </div>
                ) : (
                  <div className="relative z-10 mt-3 flex min-h-0 flex-1 flex-col">
                    <ComplaintStatusDistribution
                      rows={card.rows}
                      loading={card.loading}
                      totalComplaints={card.totalComplaints}
                    />
                  </div>
                )}
              </Link>
            );
          })}
        </section>
      </div>
    </div>
  );
}
