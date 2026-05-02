const TOKEN_KEY = 'wl_token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function removeToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

interface JwtPayload {
  email: string;
  role: string;
  issued_at: number;
  iat: number;
  exp: number;
}

export function getUser(): JwtPayload | null {
  const token = getToken();
  if (!token) return null;

  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    return payload as JwtPayload;
  } catch {
    return null;
  }
}

export function isAuthenticated(): boolean {
  const user = getUser();
  if (!user) return false;
  // Check if token is expired
  return user.exp > Math.floor(Date.now() / 1000);
}

export function isAdmin(): boolean {
  const user = getUser();
  return user?.role === 'admin';
}
