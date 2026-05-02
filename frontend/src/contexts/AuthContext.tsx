import React, { createContext, useCallback, useContext, useState } from 'react';
import { getToken, removeToken, setToken as storeToken, getUser } from '../lib/auth';

interface AuthContextType {
  isAuthenticated: boolean;
  isAdmin: boolean;
  email: string | null;
  login: (token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  isAdmin: false,
  email: null,
  login: () => {},
  logout: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setTokenState] = useState<string | null>(getToken);

  const user = token ? getUser() : null;
  const isAuthenticated = !!user && user.exp > Math.floor(Date.now() / 1000);
  const isAdmin = user?.role === 'admin';

  const login = useCallback((newToken: string) => {
    storeToken(newToken);
    setTokenState(newToken);
  }, []);

  const logout = useCallback(() => {
    removeToken();
    setTokenState(null);
  }, []);

  return (
    <AuthContext.Provider value={{ isAuthenticated, isAdmin, email: user?.email ?? null, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
