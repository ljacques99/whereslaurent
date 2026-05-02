import React, { useEffect, useState } from 'react';
import api, { Location } from '../lib/api';
import { isAdmin } from '../lib/auth';
import WorldMap from '../components/WorldMap';
import LocationTable from '../components/LocationTable';

export default function Home() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const admin = isAdmin();

  useEffect(() => {
    async function load() {
      try {
        const data = admin ? await api.getAllLocations() : await api.getLocations();
        setLocations(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load locations');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [admin]);

  const today = new Date().toISOString().split('T')[0];
  const current = locations.find(loc => loc.arrival_date <= today && loc.departure_date >= today);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">
          Where's <span className="text-blue-400">Laurent</span>?
        </h1>
        {current ? (
          <p className="text-slate-400 mt-2">
            Currently in{' '}
            <span className="text-green-400 font-semibold">
              {current.city}, {current.country}
            </span>
          </p>
        ) : (
          <p className="text-slate-400 mt-2">
            Track Laurent's travels around the world
          </p>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-96">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-slate-400">Loading locations...</span>
          </div>
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-6 text-red-400">
          {error}
        </div>
      ) : (
        <div className="space-y-8">
          {/* World Map */}
          <div>
            <WorldMap locations={locations} />
          </div>

          {/* Location Table */}
          <div>
            <h2 className="text-xl font-semibold text-white mb-4">
              {admin ? 'All Locations' : 'Upcoming & Current Locations'}
            </h2>
            <LocationTable locations={locations} />
          </div>
        </div>
      )}
    </div>
  );
}
