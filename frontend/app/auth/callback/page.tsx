'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function AuthCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get authorization code from GitHub redirect
        const code = searchParams.get('code');
        const state = searchParams.get('state');

        if (!code) {
          setError('No authorization code received');
          return;
        }

        // Exchange code for access token
        const tokenResponse = await fetch('/api/auth/github/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code, state }),
        });

        if (!tokenResponse.ok) {
          const data = await tokenResponse.json();
          setError(data.error || 'Failed to exchange authorization code');
          return;
        }

        const { access_token } = await tokenResponse.json();

        // Send access token to backend to get JWT
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080';
        const authResponse = await fetch(`${backendUrl}/auth/github`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accessToken: access_token }),
        });

        if (!authResponse.ok) {
          setError('Failed to authenticate with backend');
          return;
        }

        const authData = await authResponse.json();

        // Store JWT and userId in localStorage
        localStorage.setItem('devverse.jwt', authData.token);
        localStorage.setItem('devverse.userId', authData.user.id);

        // Redirect to dashboard
        router.push('/dashboard');
      } catch (err: any) {
        setError(err.message || 'Authentication failed');
      }
    };

    handleCallback();
  }, [searchParams, router]);

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center px-6">
        <div className="max-w-md w-full">
          <div className="rounded-lg bg-red-950/30 border border-red-900/50 p-6">
            <h2 className="text-lg font-semibold text-red-300 mb-2">Authentication Failed</h2>
            <p className="text-red-200 mb-4">{error}</p>
            <a
              href="/"
              className="inline-flex items-center justify-center rounded-lg bg-slate-700 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-600 transition-colors"
            >
              Back to Home
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center px-6">
      <div className="max-w-md w-full">
        <div className="rounded-lg bg-slate-900/80 border border-slate-800/70 p-6 text-center">
          <div className="inline-flex items-center justify-center mb-4">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-amber-300 border-t-transparent"></div>
          </div>
          <p className="text-slate-300">Authenticating...</p>
        </div>
      </div>
    </div>
  );
}
