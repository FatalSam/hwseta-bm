'use client';

import { useMemo, useState } from 'react';

type ProvinceRow = {
  province: string;
  count: number;
};

type HoveredProvince = {
  name: string;
  count: number;
};

const PROVINCE_TILES = [
  { name: 'Northern Cape', x: 20, y: 108, width: 142, height: 82 },
  { name: 'Western Cape', x: 94, y: 196, width: 112, height: 42 },
  { name: 'Eastern Cape', x: 212, y: 182, width: 128, height: 50 },
  { name: 'Free State', x: 176, y: 108, width: 92, height: 66 },
  { name: 'North West', x: 166, y: 58, width: 84, height: 44 },
  { name: 'Gauteng', x: 256, y: 70, width: 52, height: 34 },
  { name: 'Mpumalanga', x: 316, y: 52, width: 72, height: 46 },
  { name: 'Limpopo', x: 250, y: 16, width: 112, height: 42 },
  { name: 'KwaZulu-Natal', x: 302, y: 120, width: 86, height: 62 },
] as const;

function normalizeProvinceName(value: unknown): string {
  const text = value == null ? '' : String(value);
  return text
    .toLowerCase()
    .replace('nothern', 'northern')
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '');
}

function getFill(count: number, max: number): string {
  if (count <= 0) return '#e8f0fb';
  const ratio = Math.min(1, count / Math.max(1, max));
  if (ratio >= 0.8) return '#1d5fbf';
  if (ratio >= 0.6) return '#3f7ed4';
  if (ratio >= 0.4) return '#6b9be0';
  if (ratio >= 0.2) return '#93b7e8';
  return '#b6cfef';
}

export default function SouthAfricaProvinceMap({ provinceRows }: { provinceRows: ProvinceRow[] }) {
  const [hovered, setHovered] = useState<HoveredProvince | null>(null);
  const { byProvince, max } = useMemo(() => {
    const map = new Map<string, number>();
    let maxCount = 0;
    for (const row of provinceRows) {
      const key = normalizeProvinceName(row.province);
      map.set(key, row.count);
      maxCount = Math.max(maxCount, row.count);
    }
    return { byProvince: map, max: Math.max(1, maxCount) };
  }, [provinceRows]);

  return (
    <div className="relative mx-auto h-[230px] w-full max-w-[390px]">
      <svg
        viewBox="0 0 420 260"
        role="img"
        aria-label="South Africa provinces shaded by beneficiary count"
        className="h-full w-full overflow-visible drop-shadow-sm"
      >
        {PROVINCE_TILES.map((province) => {
          const count = byProvince.get(normalizeProvinceName(province.name)) ?? 0;
          const fill = getFill(count, max);

          return (
            <g
              key={province.name}
              onMouseEnter={() => setHovered({ name: province.name, count })}
              onMouseLeave={() => setHovered(null)}
              className="cursor-pointer outline-none"
              tabIndex={0}
              onFocus={() => setHovered({ name: province.name, count })}
              onBlur={() => setHovered(null)}
            >
              <rect
                x={province.x}
                y={province.y}
                width={province.width}
                height={province.height}
                rx="14"
                fill={fill}
                stroke="#9fb7d7"
                strokeWidth="1"
                className="transition-[filter,fill] duration-150 hover:fill-[#0f4fa8] hover:drop-shadow-md"
              />
              <text
                x={province.x + province.width / 2}
                y={province.y + province.height / 2 - 3}
                textAnchor="middle"
                className="pointer-events-none fill-slate-700 text-[10px] font-semibold"
              >
                {province.name}
              </text>
              <text
                x={province.x + province.width / 2}
                y={province.y + province.height / 2 + 12}
                textAnchor="middle"
                className="pointer-events-none fill-slate-600 text-[10px] tabular-nums"
              >
                {count.toLocaleString('en-ZA')}
              </text>
            </g>
          );
        })}
      </svg>

      {hovered ? (
        <div className="absolute left-3 top-3 rounded-lg border border-slate-200 bg-white/95 px-3 py-2 text-xs shadow-lg">
          <p className="font-semibold text-slate-900">{hovered.name}</p>
          <p className="mt-0.5 tabular-nums text-slate-600">
            {hovered.count.toLocaleString('en-ZA')} beneficiaries
          </p>
        </div>
      ) : null}
    </div>
  );
}
