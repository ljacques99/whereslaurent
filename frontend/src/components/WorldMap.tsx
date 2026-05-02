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

interface WorldMapProps {
  locations: Location[];
}

function getStatus(loc: Location): 'current' | 'future' | 'past' {
  const today = new Date().toISOString().split('T')[0];
  if (loc.arrival_date <= today && loc.departure_date >= today) return 'current';
  if (loc.arrival_date > today) return 'future';
  return 'past';
}

function getMarkerColor(status: 'current' | 'future' | 'past') {
  switch (status) {
    case 'current': return '#22c55e';
    case 'future': return '#3b82f6';
    case 'past': return '#64748b';
  }
}

function formatDate(dateStr: string) {
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
}

interface TooltipState {
  location: Location;
  x: number;
  y: number;
}

export default function WorldMap({ locations }: WorldMapProps) {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [position, setPosition] = useState<{ coordinates: [number, number]; zoom: number }>({
    coordinates: [10, 20],
    zoom: 1,
  });

  const validLocations = locations.filter(loc => loc.lat != null && loc.lng != null);

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
          onMoveEnd={({ zoom, coordinates }) =>
            setPosition({ zoom, coordinates })
          }
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

          {validLocations.map((loc) => {
            const status = getStatus(loc);
            const color = getMarkerColor(status);
            return (
              <Marker
                key={loc.id}
                coordinates={[loc.lng!, loc.lat!]}
                onMouseEnter={(e) => {
                  const nativeEvent = (e as unknown as { clientX: number; clientY: number; target: SVGElement });
                  const rect = nativeEvent.target.closest('svg')?.getBoundingClientRect();
                  if (rect) {
                    setTooltip({
                      location: loc,
                      x: nativeEvent.clientX - rect.left,
                      y: nativeEvent.clientY - rect.top,
                    });
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
          style={{
            left: tooltip.x + 12,
            top: tooltip.y - 10,
          }}
        >
          <div className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 shadow-xl text-sm">
            <div className="font-semibold text-white">
              {tooltip.location.city}, {tooltip.location.country}
            </div>
            <div className="text-slate-400 text-xs mt-0.5">
              {formatDate(tooltip.location.arrival_date)} — {formatDate(tooltip.location.departure_date)}
            </div>
            <div className="mt-1">
              {(() => {
                const status = getStatus(tooltip.location);
                const labels = { current: 'En cours', future: 'À venir', past: 'Passé' };
                const colors = { current: 'text-green-400', future: 'text-blue-400', past: 'text-slate-400' };
                return (
                  <span className={`text-xs font-medium ${colors[status]}`}>
                    {labels[status]}
                  </span>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-3 left-3 flex flex-col gap-1.5 bg-slate-900/80 backdrop-blur-sm rounded-lg px-3 py-2 border border-slate-700">
        <div className="text-xs text-slate-500 font-medium mb-0.5">Legend</div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500 shadow-green-500/50 shadow-sm" />
          <span className="text-xs text-slate-300">En cours</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-blue-500 shadow-blue-500/50 shadow-sm" />
          <span className="text-xs text-slate-300">À venir</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-slate-500" />
          <span className="text-xs text-slate-300">Passé</span>
        </div>
      </div>

      {/* Zoom hint */}
      <div className="absolute bottom-3 right-3 text-xs text-slate-600 bg-slate-900/60 px-2 py-1 rounded">
        Scroll to zoom · Drag to pan
      </div>
    </div>
  );
}
