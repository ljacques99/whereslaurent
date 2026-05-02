import React, { useState } from 'react';
import {
  ComposableMap,
  Geographies,
  Geography,
  Marker,
  ZoomableGroup,
} from 'react-simple-maps';
import { Location } from '../lib/api';

const GEO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';

type Status = 'current' | 'future' | 'past';

interface CityGroup {
  key: string;
  city: string;
  country: string;
  lat: number;
  lng: number;
  passages: Location[];
  dominantStatus: Status;
}

interface TooltipState {
  group: CityGroup;
  x: number;
  y: number;
}

interface WorldMapProps {
  locations: Location[];
}

const STATUS_PRIORITY: Record<Status, number> = { current: 0, future: 1, past: 2 };

const STATUS_LABELS: Record<Status, string> = {
  current: 'En cours',
  future: 'À venir',
  past: 'Passé',
};

const STATUS_COLORS: Record<Status, string> = {
  current: 'text-green-400',
  future: 'text-blue-400',
  past: 'text-slate-400',
};

const MARKER_COLORS: Record<Status, string> = {
  current: '#22c55e',
  future: '#3b82f6',
  past: '#64748b',
};

function getStatus(loc: Location): Status {
  const today = new Date().toISOString().split('T')[0];
  if (loc.arrival_date <= today && loc.departure_date >= today) return 'current';
  if (loc.arrival_date > today) return 'future';
  return 'past';
}

function formatDate(dateStr: string) {
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
}

// Group locations by geographic position (rounded to ~1km precision)
function groupByCity(locations: Location[]): CityGroup[] {
  const map = new Map<string, CityGroup>();

  for (const loc of locations) {
    if (loc.lat == null || loc.lng == null) continue;
    const key = `${loc.lat.toFixed(2)},${loc.lng.toFixed(2)}`;
    const status = getStatus(loc);

    if (!map.has(key)) {
      map.set(key, {
        key,
        city: loc.city,
        country: loc.country,
        lat: loc.lat,
        lng: loc.lng,
        passages: [],
        dominantStatus: status,
      });
    }

    const group = map.get(key)!;
    group.passages.push(loc);

    // Best status wins: current > future > past
    if (STATUS_PRIORITY[status] < STATUS_PRIORITY[group.dominantStatus]) {
      group.dominantStatus = status;
    }
  }

  // Sort passages chronologically within each group
  for (const group of map.values()) {
    group.passages.sort((a, b) => a.arrival_date.localeCompare(b.arrival_date));
  }

  return Array.from(map.values());
}

export default function WorldMap({ locations }: WorldMapProps) {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [position, setPosition] = useState<{ coordinates: [number, number]; zoom: number }>({
    coordinates: [10, 20],
    zoom: 1,
  });

  const cityGroups = groupByCity(locations);

  return (
    <div className="relative w-full rounded-xl overflow-hidden border border-slate-700 bg-slate-900">
      <ComposableMap
        projection="geoMercator"
        projectionConfig={{ scale: 140 }}
        style={{ width: '100%', height: 'auto' }}
        height={500}
      >
        <ZoomableGroup
          zoom={position.zoom}
          center={position.coordinates}
          onMoveEnd={({ zoom, coordinates }) => setPosition({ zoom, coordinates })}
          minZoom={0.8}
          maxZoom={8}
        >
          <Geographies geography={GEO_URL}>
            {({ geographies }) =>
              geographies.map((geo) => (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  fill="#1e293b"
                  stroke="#334155"
                  strokeWidth={0.5}
                  style={{
                    default: { outline: 'none' },
                    hover: { fill: '#253347', outline: 'none' },
                    pressed: { outline: 'none' },
                  }}
                />
              ))
            }
          </Geographies>

          {cityGroups.map((group) => {
            const color = MARKER_COLORS[group.dominantStatus];
            return (
              <Marker
                key={group.key}
                coordinates={[group.lng, group.lat]}
                onMouseEnter={(e) => {
                  const ev = e as unknown as { clientX: number; clientY: number; target: SVGElement };
                  const rect = ev.target.closest('svg')?.getBoundingClientRect();
                  if (rect) {
                    setTooltip({ group, x: ev.clientX - rect.left, y: ev.clientY - rect.top });
                  }
                }}
                onMouseLeave={() => setTooltip(null)}
              >
                <circle
                  r={6 / position.zoom}
                  fill={color}
                  fillOpacity={0.9}
                  stroke="white"
                  strokeWidth={1.5 / position.zoom}
                  style={{ filter: `drop-shadow(0 0 ${4 / position.zoom}px ${color})` }}
                />
              </Marker>
            );
          })}
        </ZoomableGroup>
      </ComposableMap>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="absolute z-10 pointer-events-none"
          style={{ left: tooltip.x + 12, top: tooltip.y - 10 }}
        >
          <div className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 shadow-xl text-sm min-w-[180px]">
            <div className="font-semibold text-white mb-2">
              {tooltip.group.city}, {tooltip.group.country}
            </div>
            <div className="space-y-1.5">
              {tooltip.group.passages.map((loc) => {
                const status = getStatus(loc);
                return (
                  <div key={loc.id} className="flex items-center justify-between gap-3">
                    <span className="text-slate-400 text-xs tabular-nums">
                      {formatDate(loc.arrival_date)} — {formatDate(loc.departure_date)}
                    </span>
                    <span className={`text-xs font-medium shrink-0 ${STATUS_COLORS[status]}`}>
                      {STATUS_LABELS[status]}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-3 left-3 flex flex-col gap-1.5 bg-slate-900/80 backdrop-blur-sm rounded-lg px-3 py-2 border border-slate-700">
        <div className="text-xs text-slate-500 font-medium mb-0.5">Legend</div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span className="text-xs text-slate-300">En cours</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-blue-500" />
          <span className="text-xs text-slate-300">À venir</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-slate-500" />
          <span className="text-xs text-slate-300">Passé</span>
        </div>
      </div>

      <div className="absolute bottom-3 right-3 text-xs text-slate-600 bg-slate-900/60 px-2 py-1 rounded">
        Scroll to zoom · Drag to pan
      </div>
    </div>
  );
}
