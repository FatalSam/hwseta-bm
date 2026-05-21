'use client';

import { useCallback, useId, useMemo, useState } from 'react';

export type AreaChartPoint = { key: string; label: string; value: number; longLabel?: string };

const CHART = { w: 400, h: 180, pl: 44, pr: 12, pt: 16, pb: 28, innerH: 180 - 16 - 28, innerW: 400 - 44 - 12 };

type AreaLineChartProps = {
  points: AreaChartPoint[];
  loading?: boolean;
  yMax: number;
  formatY: (n: number) => string;
  valueDecimals?: number;
  /** 0 = count style, 1 = percent (tooltip) */
  valueSuffix?: string;
  emptyMessage?: string;
};

function AreaLineChart({
  points,
  loading,
  yMax,
  formatY,
  valueDecimals = 0,
  valueSuffix = '',
  emptyMessage = 'No data for this range.',
}: AreaLineChartProps) {
  const gradientId = useId();
  const [hover, setHover] = useState<{ i: number; x: number; y: number } | null>(null);
  const maxY = Math.max(1, yMax);

  const { linePath, areaPath, dots } = useMemo(() => {
    if (points.length === 0) {
      return { linePath: '', areaPath: '', dots: [] as { cx: number; cy: number; i: number }[] };
    }
    const w = CHART.w - CHART.pl - CHART.pr;
    const h = CHART.innerH;
    const n = points.length;
    const xAt = (i: number) => CHART.pl + (n <= 1 ? w / 2 : (i / (n - 1)) * w);
    const yAt = (v: number) => CHART.pt + h - (v / maxY) * h;
    const xs = points.map((_, i) => xAt(i));
    const ys = points.map((p) => yAt(p.value));
    const lineM = points
      .map((_, i) => `${i === 0 ? 'M' : 'L'} ${xs[i].toFixed(2)} ${ys[i].toFixed(2)}`)
      .join(' ');
    const yBottom = CHART.pt + h;
    const area = `${lineM} L ${xs[n - 1]!.toFixed(2)} ${yBottom} L ${xs[0]!.toFixed(2)} ${yBottom} Z`;
    const d = points.map((_, i) => ({ cx: xs[i]!, cy: ys[i]!, i }));
    return { linePath: lineM, areaPath: area, dots: d };
  }, [maxY, points]);

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((t) => t * maxY);
  const onMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (points.length < 1) return;
      const el = e.currentTarget;
      const r = el.getBoundingClientRect();
      const xPx = e.clientX - r.left;
      const scaleX = CHART.w / r.width;
      const x = xPx * scaleX;
      const n = points.length;
      const w = CHART.w - CHART.pl - CHART.pr;
      const rel = Math.max(0, Math.min(1, (x - CHART.pl) / w));
      const i = n <= 1 ? 0 : Math.round(rel * (n - 1));
      const xi = n <= 1 ? CHART.pl + w / 2 : CHART.pl + (i / (n - 1)) * w;
      const h = CHART.innerH;
      const y = CHART.pt + h - (points[i]!.value / maxY) * h;
      setHover({ i, x: xi, y });
    },
    [maxY, points],
  );

  if (loading) {
    return (
      <div className="flex h-[220px] items-center justify-center">
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-[#124a3f] border-t-transparent" />
      </div>
    );
  }

  if (points.length === 0) {
    return <p className="py-8 text-center text-sm text-slate-500">{emptyMessage}</p>;
  }

  const active = hover?.i ?? -1;
  const tip = active >= 0 && points[active] ? (points[active]!.longLabel ?? points[active]!.label) : null;

  return (
    <div className="relative w-full min-w-0">
      <svg
        className="h-[220px] w-full"
        viewBox={`0 0 ${CHART.w} ${CHART.h}`}
        preserveAspectRatio="xMidYMid meet"
        onMouseMove={onMove}
        onMouseEnter={onMove}
        onMouseLeave={() => setHover(null)}
        role="img"
        aria-label="Trend chart"
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {yTicks.map((t) => {
          const y = CHART.pt + CHART.innerH - (t / maxY) * CHART.innerH;
          return (
            <g key={t}>
              <line
                x1={CHART.pl}
                y1={y}
                x2={CHART.w - CHART.pr}
                y2={y}
                className="stroke-slate-100"
                strokeWidth="1"
              />
              <text x={4} y={y + 4} className="fill-slate-400 text-[9px]">
                {formatY(t)}
              </text>
            </g>
          );
        })}
        {areaPath ? <path d={areaPath} fill={`url(#${gradientId})`} className="pointer-events-none" /> : null}
        {linePath ? (
          <path d={linePath} fill="none" className="stroke-blue-500" strokeWidth="2.2" strokeLinejoin="round" />
        ) : null}
        {dots.map((d) => (
          <circle
            key={d.i}
            cx={d.cx}
            cy={d.cy}
            r={hover?.i === d.i ? 5 : 3.5}
            className="fill-white stroke-blue-500"
            strokeWidth="2"
          />
        ))}
        {points.map((p, i) => {
          const w = CHART.w - CHART.pl - CHART.pr;
          const n = points.length;
          const x = n <= 1 ? CHART.pl + w / 2 : CHART.pl + (i / (n - 1)) * w;
          const y = CHART.h - 6;
          return (
            <text
              key={p.key}
              x={x}
              y={y}
              textAnchor="middle"
              className="fill-slate-500 text-[8.5px]"
            >
              {p.label}
            </text>
          );
        })}
      </svg>
      {hover && tip != null && points[hover.i] && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] shadow-md"
          style={{
            left: `${(hover.x / CHART.w) * 100}%`,
            top: 4,
            minWidth: '5rem',
          }}
        >
          <div className="font-medium text-slate-700">{tip}</div>
          <div className="mt-0.5 text-slate-900">
            {points[hover.i]!.value.toFixed(valueDecimals)}
            {valueSuffix}
          </div>
        </div>
      )}
    </div>
  );
}

type TrendCardProps = {
  title: string;
  children: React.ReactNode;
  headerRight?: React.ReactNode;
  footnote?: string;
};

function TrendCard({ title, children, headerRight, footnote }: TrendCardProps) {
  return (
    <div className="flex h-full flex-col rounded-[28px] border border-slate-200/90 bg-white p-5 shadow-[0_16px_40px_rgba(15,23,42,0.05)] sm:p-6">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-base font-bold text-slate-900">{title}</h3>
        {headerRight}
      </div>
      {footnote ? <p className="mt-0.5 text-xs text-slate-500">{footnote}</p> : null}
      <div className="mt-3 min-h-[220px] flex-1">{children}</div>
    </div>
  );
}

export function BeneficiaryRegistrationsAreaCard({
  points,
  loading,
  range,
  onRangeChange,
}: {
  points: AreaChartPoint[];
  loading: boolean;
  range: 'this-year' | 'last-12';
  onRangeChange: (r: 'this-year' | 'last-12') => void;
}) {
  const maxV = useMemo(() => Math.max(1, ...points.map((p) => p.value), 1), [points]);
  const yMax = useMemo(() => {
    if (maxV <= 10) return Math.ceil(maxV) + 1;
    if (maxV <= 100) return Math.ceil(maxV / 10) * 10;
    if (maxV <= 2000) return Math.ceil(maxV / 500) * 500;
    return Math.ceil(maxV / 1000) * 1000;
  }, [maxV]);

  const formatY = (n: number) => {
    if (yMax > 200) return n >= 1000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, '')}K` : String(Math.round(n));
    return String(Math.round(n));
  };

  return (
    <TrendCard
      title="Beneficiary registrations over time"
      headerRight={
        <div className="flex items-center gap-2">
          <label className="sr-only" htmlFor="reg-range">
            Range
          </label>
          <select
            id="reg-range"
            value={range}
            onChange={(e) => onRangeChange(e.target.value as 'this-year' | 'last-12')}
            className="max-w-[8.5rem] rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-medium text-slate-700"
          >
            <option value="this-year">This year</option>
            <option value="last-12">Last 12 months</option>
          </select>
        </div>
      }
    >
      <AreaLineChart
        points={points}
        loading={loading}
        yMax={yMax}
        formatY={formatY}
        valueDecimals={0}
        valueSuffix=" registrations"
        emptyMessage="No registration dates in this range."
      />
    </TrendCard>
  );
}

export function ProgrammeCompletionAreaCard({
  points,
  loading,
  range,
  onRangeChange,
}: {
  points: AreaChartPoint[];
  loading: boolean;
  range: '4' | '6' | '12';
  onRangeChange: (value: '4' | '6' | '12') => void;
}) {
  return (
    <TrendCard
      title="Programme completion trend"
      headerRight={
        <select
          value={range}
          onChange={(e) => onRangeChange(e.target.value as '4' | '6' | '12')}
          className="max-w-[8.5rem] rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-medium text-slate-700"
        >
          <option value="4">Last 4 months</option>
          <option value="6">Last 6 months</option>
          <option value="12">Last 12 months</option>
        </select>
      }
    >
      <>
        {points.length > 0 ? (
          <ul className="mb-1 flex flex-wrap justify-center gap-2.5 [writing-mode:horizontal-tb]">
            {points.map((p) => (
              <li key={p.key} className="text-center text-[11px] text-slate-600">
                <div className="text-[10px] text-slate-500">{p.label}</div>
                <div className="font-semibold text-slate-900">{p.value.toFixed(1)}%</div>
              </li>
            ))}
          </ul>
        ) : null}
        <AreaLineChart
          points={points}
          loading={loading}
          yMax={100}
          formatY={(n) => `${Math.round(n)}%`}
          valueDecimals={1}
          valueSuffix="%"
          emptyMessage="No programme enrolment rows in the sample."
        />
      </>
    </TrendCard>
  );
}
