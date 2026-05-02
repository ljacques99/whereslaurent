const API_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem('wl_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...getAuthHeader(),
  };

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }

  return res.json();
}

export interface Location {
  id: string;
  city: string;
  country: string;
  arrival_date: string;
  departure_date: string;
  lat: number | null;
  lng: number | null;
  created_at?: string;
  updated_at?: string;
}

export interface User {
  email: string;
  role: 'admin' | 'visitor';
  created_at?: string;
  updated_at?: string;
}

export interface AuthResponse {
  token: string;
  email: string;
  role: string;
}

export interface MagicLinkResponse {
  message: string;
  devLink?: string;
}

export interface RevocationResponse {
  message: string;
  revoked_at: number;
}

const api = {
  // Auth
  sendMagicLink: (email: string) =>
    request<MagicLinkResponse>('POST', '/auth/magic-link', { email }),

  verifyMagicLink: (token: string) =>
    request<AuthResponse>('GET', `/auth/verify?token=${encodeURIComponent(token)}`),

  revokeAll: () =>
    request<RevocationResponse>('POST', '/auth/revoke-all'),

  // Locations
  getLocations: () =>
    request<Location[]>('GET', '/locations'),

  getAllLocations: () =>
    request<Location[]>('GET', '/locations/all'),

  createLocation: (data: Omit<Location, 'id' | 'created_at' | 'updated_at'>) =>
    request<Location>('POST', '/locations', data),

  updateLocation: (id: string, data: Partial<Omit<Location, 'id'>>) =>
    request<Location>('PUT', `/locations/${id}`, data),

  deleteLocation: (id: string) =>
    request<{ message: string }>('DELETE', `/locations/${id}`),

  // Users
  getUsers: () =>
    request<User[]>('GET', '/users'),

  createUser: (data: { email: string; role: string }) =>
    request<User>('POST', '/users', data),

  updateUser: (email: string, data: { role: string }) =>
    request<User>('PUT', `/users/${encodeURIComponent(email)}`, data),

  deleteUser: (email: string) =>
    request<{ message: string }>('DELETE', `/users/${encodeURIComponent(email)}`),
};

export default api;
