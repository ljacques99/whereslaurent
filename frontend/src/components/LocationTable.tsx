import React from 'react';
import { Location } from '../lib/api';

interface LocationTableProps {
  locations: Location[];
}

function getStatus(loc: Location): 'current' | 'future' | 'past' {
  const today = new Date().toISOString().split('T')[0];
  if (loc.arrival_date <= today && loc.departure_date >= today) return 'current';
  if (loc.arrival_date > today) return 'future';
  return 'past';
}

function formatDate(dateStr: string) {
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
}

const statusConfig = {
  current: { label: 'En cours', className: 'bg-green-500/20 text-green-400 border border-green-500/30' },
  future: { label: 'À venir', className: 'bg-blue-500/20 text-blue-400 border border-blue-500/30' },
  past: { label: 'Passé', className: 'bg-slate-700/50 text-slate-400 border border-slate-600/30' },
};

export default function LocationTable({ locations }: LocationTableProps) {
  if (locations.length === 0) {
    return (
      <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-12 text-center">
        <div className="text-slate-500 text-lg">No locations to display</div>
        <div className="text-slate-600 text-sm mt-1">Locations will appear here once added</div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-700 overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="bg-slate-800 border-b border-slate-700">
            <th className="text-left px-6 py-4 text-sm font-semibold text-slate-400">City</th>
            <th className="text-left px-6 py-4 text-sm font-semibold text-slate-400">Country</th>
            <th className="text-left px-6 py-4 text-sm font-semibold text-slate-400">Arrival</th>
            <th className="text-left px-6 py-4 text-sm font-semibold text-slate-400">Departure</th>
            <th className="text-left px-6 py-4 text-sm font-semibold text-slate-400">Status</th>
          </tr>
        </thead>
        <tbody>
          {locations.map((loc, index) => {
            const status = getStatus(loc);
            const config = statusConfig[status];
            return (
              <tr
                key={loc.id}
                className={`border-b border-slate-700/50 transition-colors hover:bg-slate-700/20 ${
                  index % 2 === 0 ? 'bg-slate-800/20' : 'bg-slate-800/40'
                }`}
              >
                <td className="px-6 py-4">
                  <span className="font-medium text-white">{loc.city}</span>
                </td>
                <td className="px-6 py-4 text-slate-300">{loc.country}</td>
                <td className="px-6 py-4 text-slate-300 font-mono text-sm">{formatDate(loc.arrival_date)}</td>
                <td className="px-6 py-4 text-slate-300 font-mono text-sm">{formatDate(loc.departure_date)}</td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.className}`}>
                    {config.label}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
