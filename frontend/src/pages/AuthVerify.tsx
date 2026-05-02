import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../lib/api';
import { setToken } from '../lib/auth';

export default function AuthVerify() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setError('No token found in URL');
      setStatus('error');
      return;
    }

    async function verify() {
      try {
        const result = await api.verifyMagicLink(token!);
        setToken(result.token);
        setStatus('success');
        // Redirect after a short delay
        setTimeout(() => {
          if (result.role === 'admin') {
            navigate('/admin/locations');
          } else {
            navigate('/');
          }
        }, 1200);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Verification failed');
        setStatus('error');
      }
    }

    verify();
  }, []);

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 shadow-2xl text-center">
          {status === 'verifying' && (
            <>
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-500/20 border border-blue-500/30 mb-4">
                <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              </div>
              <h2 className="text-xl font-semibold text-white">Verifying your link...</h2>
              <p className="text-slate-400 text-sm mt-2">Please wait a moment</p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/20 border border-green-500/30 mb-4">
                <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-white">Welcome back!</h2>
              <p className="text-slate-400 text-sm mt-2">Redirecting you now...</p>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-500/20 border border-red-500/30 mb-4">
                <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-white">Verification failed</h2>
              <p className="text-red-400 text-sm mt-2">{error}</p>
              <button
                onClick={() => navigate('/login')}
                className="mt-6 px-6 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white font-medium transition-colors"
              >
                Try again
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
