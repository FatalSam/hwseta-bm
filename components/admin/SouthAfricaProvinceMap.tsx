'use client';

import { useMemo, useState } from 'react';
import { ComposableMap, Geographies, Geography } from 'react-simple-maps';

type ProvinceRow = {
  province: string;
  count: number;
};

type GeographyShape = {
  rsmKey: string;
  properties?: Record<string, unknown>;
};

type HoveredProvince = {
  name: string;
  count: number;
};

const GEOGRAPHY_URL = '/data/south-africa-provinces.json';

function normalizeProvinceName(value: unknown): string {
  const text = value == null ? '' : String(value);
  return text
    .toLowerCase()
    .replace('nothern', 'northern')
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '');
}

function getProvinceName(geo: GeographyShape): string {
  const p = geo.properties ?? {};
  const name = String(
    p.ADM1_EN ??
      p.name ??
      p.Name ??
      p.NAME_1 ??
      p.province ??
      p.PROVINCE ??
      p.shapeName ??
      'Unknown province',
  );
  return name.replace('Nothern Cape', 'Northern Cape');
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
      <ComposableMap
        projection="geoMercator"
        projectionConfig={{ scale: 38.2 }}
        width={420}
        height={260}
        className="h-full w-full overflow-visible drop-shadow-sm"
        aria-label="South Africa provinces shaded by beneficiary count"
      >
        <Geographies geography={GEOGRAPHY_URL}>
          {({ geographies }: { geographies: GeographyShape[] }) =>
            geographies.map((geo) => {
              const name = getProvinceName(geo);
              const count = byProvince.get(normalizeProvinceName(name)) ?? 0;
              const fill = getFill(count, max);
              return (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  fill={fill}
                  stroke="#9fb7d7"
                  strokeWidth={0.75}
                  onMouseEnter={() => setHovered({ name, count })}
                  onMouseLeave={() => setHovered(null)}
                  style={{
                    default: { fill, outline: 'none', transition: 'fill 160ms ease, filter 160ms ease' },
                    hover: {
                      fill: count > 0 ? '#0f4fa8' : '#cbdcf4',
                      outline: 'none',
                      cursor: 'pointer',
                      filter: 'drop-shadow(0 4px 8px rgba(15, 79, 168, 0.22))',
                    },
                    pressed: { fill: '#0f4fa8', outline: 'none' },
                  }}
                />
              );
            })
          }
        </Geographies>
      </ComposableMap>

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
