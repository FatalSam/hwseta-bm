'use client';

import Link from 'next/link';
import { cn } from '@/ultis/cn';

const PALETTE_PROGRAMME = ['#2563eb', '#059669', '#7c3aed', '#ea580c', '#0891b2'];
const PALETTE_STATUS = ['#dc2626', '#059669', '#2563eb', '#d97706', '#64748b', '#7c3aed'];
const PALETTE_TYPE = ['#2563eb', '#059669', '#7c3aed', '#ea580c', '#64748b'];

export type InsightSegment = { label: string; count: number };

type DonutCardProps = {
  title: string;
  segments: InsightSegment[];
  /** Shown in the centre; defaults to sum of segment counts. */
  centerTotal?: number;
  loading?: boolean;
  emptyHint?: string;
  colors: string[];
  footerHref: string;
  footerLabel: string;
};

function buildDonutPaths(
  segments: InsightSegment[],
  colors: string[],
): { label: string; count: number; path: string; color: string; percentage: number }[] {
  const total = segments.reduce((s, x) => s + x.count, 0);
  if (total <= 0) return [];

  let currentAngle = 0;
  return segments
    .map((item, index) => {
      if (item.count <= 0) return null;
      const percentage = (item.count / total) * 100;
      const angle = (item.count / total) * 360;
      const startAngle = currentAngle;
      currentAngle += angle;
      const x1 = 50 + 40 * Math.cos(((startAngle - 90) * Math.PI) / 180);
      const y1 = 50 + 40 * Math.sin(((startAngle - 90) * Math.PI) / 180);
      const x2 = 50 + 40 * Math.cos(((currentAngle - 90) * Math.PI) / 180);
      const y2 = 50 + 40 * Math.sin(((currentAngle - 90) * Math.PI) / 180);
      const largeArcFlag = angle > 180 ? 1 : 0;
      return {
        label: item.label,
        count: item.count,
        path: `M 50 50 L ${x1} ${y1} A 40 40 0 ${largeArcFlag} 1 ${x2} ${y2} Z`,
        color: colors[index % colors.length],
        percentage,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x != null);
}

export function BeneficiariesByProgrammeCard({
  title,
  segments,
  centerTotal,
  loading,
  emptyHint = 'No programme links in the sample',
  colors = PALETTE_PROGRAMME,
  footerHref,
  footerLabel,
}: DonutCardProps) {
  const sum = segments.reduce((s, x) => s + x.count, 0);
  const displayTotal = centerTotal !== undefined ? centerTotal : sum;
  const paths = buildDonutPaths(segments, colors);

  return (
    <div className="flex h-full flex-col rounded-[28px] border border-slate-200/90 bg-white p-5 shadow-[0_16px_40px_rgba(15,23,42,0.05)] sm:p-6">
      <h3 className="text-base font-bold text-slate-900">{title}</h3>
      <p className="mt-1 text-xs text-slate-500">
        % of the total in the centre (beneficiaries per programme in this sample).
      </p>
      <div className="mt-4 flex min-h-[200px] flex-1 flex-col items-stretch gap-4">
        {loading ? (
          <div className="flex flex-1 items-center justify-center py-8">
            <div className="h-9 w-9 animate-spin rounded-full border-2 border-[#124a3f] border-t-transparent" />
          </div>
        ) : (
          <>
            <div className="relative mx-auto flex h-[200px] w-[200px] shrink-0 items-center justify-center">
              <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
                {paths.length > 0 ? (
                  paths.map((seg, i) => (
                    <path key={i} d={seg.path} fill={seg.color} stroke="white" strokeWidth="1" />
                  ))
                ) : (
                  <circle cx="50" cy="50" r="40" className="fill-slate-100" />
                )}
                <circle cx="50" cy="50" r="16" className="fill-white" />
              </svg>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-2xl font-bold tabular-nums text-slate-900">
                  {displayTotal.toLocaleString('en-ZA')}
                </span>
                <span className="text-xs font-medium text-slate-500">Total</span>
              </div>
            </div>
            <ul className="w-full space-y-2.5 text-sm [writing-mode:horizontal-tb]" aria-label="Legend">
              {segments.length === 0 ? (
                <li className="text-slate-500">{emptyHint}</li>
              ) : (
                segments.map((row, i) => {
                  const base = displayTotal > 0 ? (row.count / displayTotal) * 100 : 0;
                  const p = buildDonutPaths([row], colors)[0];
                  const color = p?.color ?? colors[i % colors.length];
                  const name = (row.label || `Programme ${i + 1}`).trim();
                  return (
                    <li
                      key={`${name}-${i}`}
                      className="flex w-full min-w-0 items-baseline justify-between gap-3 text-left text-[13px] leading-normal [writing-mode:horizontal-tb]"
                    >
                      <span className="flex min-w-0 flex-1 items-baseline gap-2">
                        <span
                          className="mt-1.5 h-2.5 w-2.5 shrink-0 self-start rounded-sm ring-1 ring-black/5"
                          style={{ backgroundColor: color }}
                          aria-hidden
                        />
                        <span className="min-w-0 break-normal text-slate-800" title={name}>
                          {name}
                        </span>
                      </span>
                      <span className="w-max max-w-[min(100%,11rem)] shrink-0 text-right tabular-nums text-slate-900 sm:max-w-none">
                        {row.count.toLocaleString('en-ZA')}
                        <span className="whitespace-nowrap text-slate-500"> ({base.toFixed(1)}%)</span>
                      </span>
                    </li>
                  );
                })
              )}
            </ul>
          </>
        )}
      </div>
      <div className="mt-4 flex justify-center border-t border-slate-100 pt-3">
        <Link href={footerHref} className="text-sm font-semibold text-[#2563eb] hover:underline">
          {footerLabel}
        </Link>
      </div>
    </div>
  );
}

export function ComplaintsOverviewDonutCard({
  title,
  segments,
  centerTotal,
  loading,
  error,
  colors = PALETTE_STATUS,
  footerHref,
  footerLabel,
}: DonutCardProps & { error?: boolean }) {
  const sum = segments.reduce((s, x) => s + x.count, 0);
  const displayTotal = centerTotal !== undefined ? centerTotal : sum;
  const paths = buildDonutPaths(segments, colors);

  return (
    <div className="rounded-[28px] border border-slate-200/90 bg-white p-5 shadow-[0_16px_40px_rgba(15,23,42,0.05)] sm:p-6">
      <h3 className="text-[1.05rem] font-bold text-slate-900">{title}</h3>
      <p className="mt-1 text-sm text-slate-500">% of the complaint total in the centre.</p>
      {error && !loading ? (
        <p className="mt-3 text-sm text-amber-800">
          Could not load complaint breakdown. Check admin API access.
        </p>
      ) : null}
      <div className="mt-4">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-9 w-9 animate-spin rounded-full border-2 border-[#124a3f] border-t-transparent" />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-[160px_1fr] md:items-center">
            <div className="relative mx-auto flex h-[160px] w-[160px] shrink-0 items-center justify-center">
              <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
                {paths.length > 0 ? (
                  paths.map((seg, i) => (
                    <path key={i} d={seg.path} fill={seg.color} stroke="white" strokeWidth="1" />
                  ))
                ) : (
                  <circle cx="50" cy="50" r="40" className="fill-slate-100" />
                )}
                <circle cx="50" cy="50" r="16" className="fill-white" />
              </svg>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-xl font-bold tabular-nums text-slate-900">
                  {displayTotal.toLocaleString('en-ZA')}
                </span>
                <span className="text-xs font-medium text-slate-500">Total</span>
              </div>
            </div>
            <ul className="w-full space-y-2.5 text-sm [writing-mode:horizontal-tb]" aria-label="Complaint statuses">
              {!error && segments.length === 0 ? (
                <li className="text-slate-500">No status breakdown returned.</li>
              ) : null}
              {segments.map((row, i) => {
                const base = displayTotal > 0 ? (row.count / displayTotal) * 100 : 0;
                const p = buildDonutPaths([row], colors)[0];
                const color = p?.color ?? colors[i % colors.length];
                const name = (row.label || `Status ${i + 1}`).trim();
                return (
                  <li
                    key={`${name}-${i}`}
                    className="flex w-full min-w-0 items-baseline justify-between gap-2 text-left text-[13px] leading-normal [writing-mode:horizontal-tb]"
                  >
                    <span className="flex min-w-0 flex-1 items-baseline gap-2">
                      <span
                        className="mt-1.5 h-2.5 w-2.5 shrink-0 self-start rounded-sm ring-1 ring-black/5"
                        style={{ backgroundColor: color }}
                        aria-hidden
                      />
                      <span className="min-w-0 break-normal font-medium text-slate-800" title={name}>
                        {name}
                      </span>
                    </span>
                    <span className="w-max max-w-[min(100%,10rem)] shrink-0 text-right tabular-nums text-slate-900 sm:max-w-none">
                      {row.count.toLocaleString('en-ZA')}
                      <span className="whitespace-nowrap text-slate-500"> ({base.toFixed(1)}%)</span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
      <div className="mt-4 flex justify-center border-t border-slate-100 pt-3">
        <Link
          href={footerHref}
          className={cn(
            'inline-flex min-h-9 min-w-[9.5rem] items-center justify-center rounded-full border border-[#124a3f] px-4 text-sm font-semibold text-[#124a3f] transition hover:bg-[#124a3f]/5',
          )}
        >
          {footerLabel}
        </Link>
      </div>
    </div>
  );
}

type BarCardProps = {
  title: string;
  rows: InsightSegment[];
  total: number;
  loading?: boolean;
  error?: boolean;
  colors?: string[];
  footerHref: string;
  footerLabel: string;
};

export function ComplaintsByTypeBarCard({
  title,
  rows,
  total,
  loading,
  error,
  colors = PALETTE_TYPE,
  footerHref,
  footerLabel,
}: BarCardProps) {
  const max = Math.max(1, ...rows.map((r) => r.count), 0);

  return (
    <div className="flex h-full flex-col rounded-[28px] border border-slate-200/90 bg-white p-5 shadow-[0_16px_40px_rgba(15,23,42,0.05)] sm:p-6">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-[1.05rem] font-bold text-slate-900">{title}</h3>
        <div className="shrink-0">
          <label className="sr-only" htmlFor="complaints-type-period">
            Period
          </label>
          <select
            id="complaints-type-period"
            disabled
            className="max-w-[9rem] cursor-not-allowed rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs font-medium text-slate-600"
            title="Range filter when supported by the API"
          >
            <option>All time</option>
          </select>
        </div>
      </div>
      <p className="mt-1 text-sm text-slate-500">Share of total complaints by against type.</p>
      {error && !loading ? (
        <p className="mt-2 text-sm text-amber-800">Could not load complaint types breakdown.</p>
      ) : null}
      <div className="mt-4 min-h-[200px] flex-1 space-y-3">
        {loading ? (
          <div className="flex justify-center py-10">
            <div className="h-9 w-9 animate-spin rounded-full border-2 border-[#124a3f] border-t-transparent" />
          </div>
        ) : rows.length === 0 && !error ? (
          <p className="text-sm text-slate-500">No &quot;against type&quot; data returned yet.</p>
        ) : (
          rows.map((row, i) => {
            const pctOfTotal = total > 0 ? (row.count / total) * 100 : 0;
            const barPct = (row.count / max) * 100;
            const c = colors[i % colors.length];
            const name = (row.label || `Type ${i + 1}`).trim();
            return (
              <div key={`${name}-${i}`} className="w-full min-w-0 space-y-1 [writing-mode:horizontal-tb]">
                <div className="flex w-full min-w-0 items-baseline justify-between gap-3 text-left text-[13px] leading-normal">
                  <span className="flex min-w-0 flex-1 items-baseline gap-2 font-medium text-slate-800">
                    <span
                      className="mt-0.5 h-2 w-2 shrink-0 self-start rounded-full"
                      style={{ backgroundColor: c }}
                      aria-hidden
                    />
                    <span className="min-w-0 break-normal" title={name}>
                      {name}
                    </span>
                  </span>
                  <span className="w-max max-w-[min(100%,11rem)] shrink-0 text-right tabular-nums text-slate-900 sm:max-w-none">
                    {row.count.toLocaleString('en-ZA')}
                    <span className="whitespace-nowrap text-slate-500"> ({pctOfTotal.toFixed(1)}%)</span>
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full transition-[width] duration-500"
                    style={{ width: `${Math.max(4, barPct)}%`, backgroundColor: c }}
                  />
                </div>
              </div>
            );
          })
        )}
      </div>
      <div className="mt-4 flex justify-center border-t border-slate-100 pt-3">
        <Link href={footerHref} className="text-sm font-semibold text-[#2563eb] hover:underline">
          {footerLabel}
        </Link>
      </div>
    </div>
  );
}
