import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { Location } from '../../lib/api';
import { isAdmin } from '../../lib/auth';
import ConfirmModal from '../../components/ConfirmModal';

interface LocationForm {
  city: string;
  country: string;
  arrival_date: string;
  departure_date: string;
  lat: string;
  lng: string;
}

const emptyForm: LocationForm = {
  city: '',
  country: '',
  arrival_date: '',
  departure_date: '',
  lat: '',
  lng: '',
};

function getStatus(loc: Location): 'current' | 'future' | 'past' {
  const today = new Date().toISOString().split('T')[0];
  if (loc.arrival_date <= today && loc.departure_date >= today) return 'current';
  if (loc.arrival_date > today) return 'future';
  return 'past';
}

const statusConfig = {
  current: { label: 'En cours', className: 'bg-green-500/20 text-green-400' },
  future: { label: 'À venir', className: 'bg-blue-500/20 text-blue-400' },
  past: { label: 'Passé', className: 'bg-slate-700 text-slate-400' },
};

export default function AdminLocations() {
  const navigate = useNavigate();
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<LocationForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<Location | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAdmin()) {
      navigate('/');
      return;
    }
    loadLocations();
  }, []);

  async function loadLocations() {
    try {
      const data = await api.getAllLocations();
      setLocations(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load locations');
    } finally {
      setLoading(false);
    }
  }

  function openCreate() {
    setForm(emptyForm);
    setEditingId(null);
    setFormError(null);
    setShowModal(true);
  }

  function openEdit(loc: Location) {
    setForm({
      city: loc.city,
      country: loc.country,
      arrival_date: loc.arrival_date,
      departure_date: loc.departure_date,
      lat: loc.lat != null ? String(loc.lat) : '',
      lng: loc.lng != null ? String(loc.lng) : '',
    });
    setEditingId(loc.id);
    setFormError(null);
    setShowModal(true);
  }

  async function handleSave() {
    if (!form.city || !form.country || !form.arrival_date || !form.departure_date) {
      setFormError('City, country, arrival date and departure date are required');
      return;
    }

    setSaving(true);
    setFormError(null);

    const data = {
      city: form.city,
      country: form.country,
      arrival_date: form.arrival_date,
      departure_date: form.departure_date,
      lat: form.lat ? parseFloat(form.lat) : undefined,
      lng: form.lng ? parseFloat(form.lng) : undefined,
    };

    try {
      if (editingId) {
        await api.updateLocation(editingId, data);
      } else {
        await api.createLocation(data as Parameters<typeof api.createLocation>[0]);
      }
      setShowModal(false);
      await loadLocations();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(loc: Location) {
    try {
      await api.deleteLocation(loc.id);
      setDeleteConfirm(null);
      await loadLocations();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Locations</h1>
          <p className="text-slate-400 text-sm mt-1">Manage Laurent's travel locations</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white font-medium transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Location
        </button>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="rounded-xl border border-slate-700 overflow-hidden">
          {locations.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              No locations yet. Click "Add Location" to get started.
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="bg-slate-800 border-b border-slate-700">
                  <th className="text-left px-6 py-4 text-sm font-semibold text-slate-400">City</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-slate-400">Country</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-slate-400">Arrival</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-slate-400">Departure</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-slate-400">Status</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-slate-400">Coords</th>
                  <th className="px-6 py-4" />
                </tr>
              </thead>
              <tbody>
                {locations.map((loc, i) => {
                  const status = getStatus(loc);
                  const config = statusConfig[status];
                  return (
                    <tr key={loc.id} className={`border-b border-slate-700/50 hover:bg-slate-700/20 ${i % 2 === 0 ? '' : 'bg-slate-800/20'}`}>
                      <td className="px-6 py-4 font-medium text-white">{loc.city}</td>
                      <td className="px-6 py-4 text-slate-300">{loc.country}</td>
                      <td className="px-6 py-4 text-slate-300 font-mono text-sm">{loc.arrival_date}</td>
                      <td className="px-6 py-4 text-slate-300 font-mono text-sm">{loc.departure_date}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.className}`}>
                          {config.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-500 text-xs font-mono">
                        {loc.lat != null ? `${loc.lat.toFixed(2)}, ${loc.lng?.toFixed(2)}` : '—'}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 justify-end">
                          <button
                            onClick={() => openEdit(loc)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 transition-colors"
                            title="Edit"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(loc)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                            title="Delete"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Location Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative bg-slate-800 border border-slate-700 rounded-xl shadow-2xl w-full max-w-lg mx-4 p-6">
            <h3 className="text-lg font-semibold text-white mb-5">
              {editingId ? 'Edit Location' : 'Add Location'}
            </h3>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">City *</label>
                  <input
                    type="text"
                    value={form.city}
                    onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
                    placeholder="e.g. Paris"
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-600 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Country *</label>
                  <input
                    type="text"
                    value={form.country}
                    onChange={e => setForm(f => ({ ...f, country: e.target.value }))}
                    placeholder="e.g. France"
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-600 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Arrival Date *</label>
                  <input
                    type="date"
                    value={form.arrival_date}
                    onChange={e => setForm(f => ({ ...f, arrival_date: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-600 text-white focus:outline-none focus:border-blue-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Departure Date *</label>
                  <input
                    type="date"
                    value={form.departure_date}
                    onChange={e => setForm(f => ({ ...f, departure_date: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-600 text-white focus:outline-none focus:border-blue-500 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">
                    Latitude <span className="text-slate-500">(optional)</span>
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={form.lat}
                    onChange={e => setForm(f => ({ ...f, lat: e.target.value }))}
                    placeholder="e.g. 48.8566"
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-600 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">
                    Longitude <span className="text-slate-500">(optional)</span>
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={form.lng}
                    onChange={e => setForm(f => ({ ...f, lng: e.target.value }))}
                    placeholder="e.g. 2.3522"
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-600 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 text-sm"
                  />
                </div>
              </div>
              <p className="text-slate-500 text-xs">Coordinates are auto-filled for known cities.</p>
            </div>

            {formError && (
              <div className="mt-4 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                {formError}
              </div>
            )}

            <div className="flex gap-3 justify-end mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 transition-colors"
              >
                {saving ? 'Saving...' : editingId ? 'Save Changes' : 'Add Location'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      <ConfirmModal
        isOpen={deleteConfirm !== null}
        title="Delete Location"
        message={`Are you sure you want to delete ${deleteConfirm?.city}, ${deleteConfirm?.country}? This cannot be undone.`}
        confirmLabel="Delete"
        danger
        onConfirm={() => deleteConfirm && handleDelete(deleteConfirm)}
        onCancel={() => setDeleteConfirm(null)}
      />
    </div>
  );
}
