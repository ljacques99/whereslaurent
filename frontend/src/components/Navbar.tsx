import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated: authenticated, isAdmin: admin, logout } = useAuth();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  function isActive(path: string) {
    return location.pathname === path;
  }

  return (
    <nav className="bg-surface border-b border-slate-700 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064" />
                </svg>
              </div>
              <span className="text-white font-bold text-lg tracking-tight">
                Where's <span className="text-blue-400">Laurent</span>
              </span>
            </div>
          </Link>

          {/* Navigation Links */}
          <div className="flex items-center gap-1">
            <Link
              to="/"
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive('/')
                  ? 'bg-blue-500/20 text-blue-400'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700'
              }`}
            >
              Map
            </Link>

            {admin && (
              <>
                <Link
                  to="/admin/locations"
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive('/admin/locations')
                      ? 'bg-blue-500/20 text-blue-400'
                      : 'text-slate-400 hover:text-white hover:bg-slate-700'
                  }`}
                >
                  Locations
                </Link>
                <Link
                  to="/admin/users"
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive('/admin/users')
                      ? 'bg-blue-500/20 text-blue-400'
                      : 'text-slate-400 hover:text-white hover:bg-slate-700'
                  }`}
                >
                  Users
                </Link>
              </>
            )}

            {authenticated ? (
              <button
                onClick={handleLogout}
                className="ml-2 px-4 py-2 rounded-lg text-sm font-medium bg-slate-700 text-slate-300 hover:bg-red-500/20 hover:text-red-400 transition-colors"
              >
                Logout
              </button>
            ) : (
              <Link
                to="/login"
                className={`ml-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive('/login')
                    ? 'bg-blue-500 text-white'
                    : 'bg-blue-500/20 text-blue-400 hover:bg-blue-500 hover:text-white'
                }`}
              >
                Login
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
