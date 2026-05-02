import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { User } from '../../lib/api';
import { isAdmin, getUser } from '../../lib/auth';
import ConfirmModal from '../../components/ConfirmModal';

interface UserForm {
  email: string;
  role: 'admin' | 'visitor';
}

export default function AdminUsers() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<UserForm>({ email: '', role: 'visitor' });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<User | null>(null);
  const [revokeConfirm, setRevokeConfirm] = useState(false);
  const [revokeSuccess, setRevokeSuccess] = useState<number | null>(null);
  const [revoking, setRevoking] = useState(false);

  const currentUser = getUser();

  useEffect(() => {
    if (!isAdmin()) {
      navigate('/');
      return;
    }
    loadUsers();
  }, []);

  async function loadUsers() {
    try {
      const data = await api.getUsers();
      setUsers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    if (!form.email) {
      setFormError('Email is required');
      return;
    }

    setSaving(true);
    setFormError(null);

    try {
      await api.createUser({ email: form.email, role: form.role });
      setShowModal(false);
      setForm({ email: '', role: 'visitor' });
      await loadUsers();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to create user');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(user: User) {
    try {
      await api.deleteUser(user.email);
      setDeleteConfirm(null);
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete user');
    }
  }

  async function handleRevokeAll() {
    setRevoking(true);
    try {
      const result = await api.revokeAll();
      setRevokeConfirm(false);
      setRevokeSuccess(result.revoked_at);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to revoke sessions');
    } finally {
      setRevoking(false);
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Users</h1>
          <p className="text-slate-400 text-sm mt-1">Manage access to Where's Laurent</p>
        </div>
        <button
          onClick={() => { setForm({ email: '', role: 'visitor' }); setFormError(null); setShowModal(true); }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white font-medium transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add User
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
        <div className="rounded-xl border border-slate-700 overflow-hidden mb-8">
          {users.length === 0 ? (
            <div className="p-12 text-center text-slate-500">No users found.</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="bg-slate-800 border-b border-slate-700">
                  <th className="text-left px-6 py-4 text-sm font-semibold text-slate-400">Email</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-slate-400">Role</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-slate-400">Created</th>
                  <th className="px-6 py-4" />
                </tr>
              </thead>
              <tbody>
                {users.map((user, i) => (
                  <tr key={user.email} className={`border-b border-slate-700/50 hover:bg-slate-700/20 ${i % 2 === 0 ? '' : 'bg-slate-800/20'}`}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-white">{user.email}</span>
                        {user.email === currentUser?.email && (
                          <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full">You</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        user.role === 'admin'
                          ? 'bg-purple-500/20 text-purple-400'
                          : 'bg-slate-700 text-slate-400'
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-400 text-sm">
                      {user.created_at ? new Date(user.created_at).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 justify-end">
                        {user.email !== currentUser?.email && (
                          <button
                            onClick={() => setDeleteConfirm(user)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                            title="Delete"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Security Section */}
      <div className="rounded-xl border border-slate-700 bg-slate-800/30 p-6">
        <h2 className="text-lg font-semibold text-white mb-2">Security</h2>
        <p className="text-slate-400 text-sm mb-4">
          Revoke all active sessions. Users will need to sign in again with a new magic link.
        </p>

        {revokeSuccess && (
          <div className="mb-4 px-4 py-3 rounded-lg bg-green-500/10 border border-green-500/30 text-green-400 text-sm">
            All sessions revoked at {new Date(revokeSuccess * 1000).toLocaleString()}
          </div>
        )}

        <button
          onClick={() => setRevokeConfirm(true)}
          disabled={revoking}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 transition-colors font-medium text-sm disabled:opacity-50"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
          </svg>
          Revoke All Active Sessions
        </button>
      </div>

      {/* Add User Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative bg-slate-800 border border-slate-700 rounded-xl shadow-2xl w-full max-w-md mx-4 p-6">
            <h3 className="text-lg font-semibold text-white mb-5">Add User</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Email *</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="user@example.com"
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-600 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Role *</label>
                <select
                  value={form.role}
                  onChange={e => setForm(f => ({ ...f, role: e.target.value as 'admin' | 'visitor' }))}
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-600 text-white focus:outline-none focus:border-blue-500 text-sm"
                >
                  <option value="visitor">Visitor</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
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
                onClick={handleCreate}
                disabled={saving}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 transition-colors"
              >
                {saving ? 'Adding...' : 'Add User'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      <ConfirmModal
        isOpen={deleteConfirm !== null}
        title="Delete User"
        message={`Are you sure you want to delete ${deleteConfirm?.email}? They will lose access immediately.`}
        confirmLabel="Delete"
        danger
        onConfirm={() => deleteConfirm && handleDelete(deleteConfirm)}
        onCancel={() => setDeleteConfirm(null)}
      />

      {/* Revoke Confirm */}
      <ConfirmModal
        isOpen={revokeConfirm}
        title="Revoke All Sessions"
        message="This will invalidate all active sessions for all users, including yourself. Everyone will need to sign in again."
        confirmLabel="Revoke All"
        danger
        onConfirm={handleRevokeAll}
        onCancel={() => setRevokeConfirm(false)}
      />
    </div>
  );
}
