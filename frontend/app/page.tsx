'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Flame, TrendingUp, Trophy, Zap } from 'lucide-react';

export default function Home() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    // Auto-login with mock user for development
    const mockUserId = 'dev-user-001';
    const mockJWT = 'mock-jwt-token';

    localStorage.setItem('devverse.jwt', mockJWT);
    localStorage.setItem('devverse.userId', mockUserId);
    setIsLoggedIn(true);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('devverse.jwt');
    localStorage.removeItem('devverse.userId');
    setIsLoggedIn(false);
  };

  const goToDashboard = () => {
    router.push('/dashboard');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-100 overflow-hidden">
      {/* Animated background gradient */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl"></div>
      </div>

      {/* Navigation */}
      <nav className="relative z-10 border-b border-slate-800/50 backdrop-blur-sm sticky top-0">
        <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center">
              <Flame className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold bg-gradient-to-r from-amber-300 to-amber-400 bg-clip-text text-transparent">
              DevVerse
            </span>
          </div>
          <div className="flex items-center gap-4">
            <a
              href="https://github.com/Brian-w-m/DevVerse"
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-300 hover:text-white transition-colors text-sm font-medium"
            >
              GitHub
            </a>
            {isLoggedIn && (
              <button
                onClick={handleLogout}
                className="text-slate-300 hover:text-white transition-colors text-sm font-medium"
              >
                Logout
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 mx-auto max-w-7xl px-6 py-20 sm:py-32">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left: Content */}
          <div className="space-y-8">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/20 w-fit">
                <Zap className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-semibold text-amber-300">Real-time Activity Tracking</span>
              </div>
              
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight">
                <span className="bg-gradient-to-r from-white via-amber-100 to-amber-200 bg-clip-text text-transparent">
                  Visualize
                </span>
                <br />
                <span className="bg-gradient-to-r from-amber-300 to-amber-400 bg-clip-text text-transparent">
                  Your Code
                </span>
              </h1>
              
              <p className="text-lg text-slate-400 max-w-lg leading-relaxed">
                Track every keystroke, celebrate your streaks, and compete with developers worldwide. Your coding activity deserves to be seen.
              </p>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              {isLoggedIn ? (
                <>
                  <button
                    onClick={goToDashboard}
                    className="px-8 py-4 bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 font-bold rounded-lg hover:shadow-lg hover:shadow-amber-500/30 transition-all duration-300 hover:scale-105"
                  >
                    Open Dashboard
                  </button>
                  <button
                    onClick={handleLogout}
                    className="px-8 py-4 border border-slate-700 text-slate-100 font-semibold rounded-lg hover:bg-slate-800/50 transition-colors"
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => {
                      localStorage.setItem('devverse.jwt', 'mock-jwt-token');
                      localStorage.setItem('devverse.userId', 'dev-user-001');
                      setIsLoggedIn(true);
                    }}
                    className="px-8 py-4 bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 font-bold rounded-lg hover:shadow-lg hover:shadow-amber-500/30 transition-all duration-300 hover:scale-105"
                  >
                    Launch Demo
                  </button>
                  <a
                    href="https://github.com/Brian-w-m/DevVerse"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-8 py-4 border border-slate-700 text-slate-100 font-semibold rounded-lg hover:bg-slate-800/50 transition-colors flex items-center justify-center gap-2"
                  >
                    View on GitHub
                  </a>
                </>
              )}
            </div>

            {/* Stats Row */}
            <div className="flex gap-8 pt-8 border-t border-slate-800/50">
              <div>
                <div className="text-2xl font-bold text-amber-400">∞</div>
                <p className="text-sm text-slate-400">Real-time Tracking</p>
              </div>
              <div>
                <div className="text-2xl font-bold text-amber-400">🎯</div>
                <p className="text-sm text-slate-400">Global Leaderboard</p>
              </div>
              <div>
                <div className="text-2xl font-bold text-amber-400">🔥</div>
                <p className="text-sm text-slate-400">Streak Tracking</p>
              </div>
            </div>
          </div>

          {/* Right: Visual */}
          <div className="hidden lg:block">
            <div className="relative">
              {/* Gradient card with glow */}
              <div className="absolute inset-0 bg-gradient-to-r from-amber-500/20 to-blue-500/20 rounded-2xl blur-2xl"></div>
              <div className="relative bg-slate-900/80 backdrop-blur border border-slate-800/50 rounded-2xl p-8 space-y-6">
                {/* Mock stats display */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-400">Today's Edits</span>
                    <span className="text-2xl font-bold text-amber-400">145</span>
                  </div>
                  <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-amber-400 to-amber-500 w-3/4 rounded-full"></div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-400">Weekly Activity</span>
                    <span className="text-2xl font-bold text-blue-400">892</span>
                  </div>
                  <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-blue-400 to-blue-500 w-5/6 rounded-full"></div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-400">Current Streak</span>
                    <span className="text-2xl font-bold text-orange-400">12 days</span>
                  </div>
                  <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-orange-400 to-orange-500 w-1/2 rounded-full"></div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-800/50 text-xs text-slate-400 text-center">
                  Live from VS Code
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative z-10 mx-auto max-w-7xl px-6 py-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl sm:text-5xl font-bold mb-4">Why DevVerse?</h2>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto">
            Everything you need to track your progress and stay motivated
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[
            {
              icon: TrendingUp,
              title: 'Real Stats',
              description: 'Every keystroke counts. Watch your metrics in real-time as you code.',
              color: 'from-blue-500 to-blue-600',
            },
            {
              icon: Trophy,
              title: 'Global Leaderboard',
              description: 'Compete with developers worldwide and see where you rank.',
              color: 'from-purple-500 to-purple-600',
            },
            {
              icon: Flame,
              title: 'Streak Tracking',
              description: 'Build and maintain streaks. Challenge yourself to code every day.',
              color: 'from-orange-500 to-orange-600',
            },
          ].map((feature, idx) => {
            const Icon = feature.icon;
            return (
              <div
                key={idx}
                className="group relative bg-slate-900/50 backdrop-blur border border-slate-800/50 rounded-xl p-8 hover:border-slate-700/50 transition-all duration-300"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-5 rounded-xl transition-opacity duration-300`}></div>
                <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-bold mb-2">{feature.title}</h3>
                <p className="text-slate-400">{feature.description}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 mx-auto max-w-7xl px-6 py-20">
        <div className="bg-gradient-to-r from-amber-500/10 to-blue-500/10 border border-slate-800/50 rounded-2xl p-12 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">Ready to track your code?</h2>
          <p className="text-lg text-slate-400 mb-8">Start your DevVerse journey today</p>
          {!isLoggedIn && (
            <button
              onClick={() => {
                localStorage.setItem('devverse.jwt', 'mock-jwt-token');
                localStorage.setItem('devverse.userId', 'dev-user-001');
                setIsLoggedIn(true);
              }}
              className="px-8 py-4 bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 font-bold rounded-lg hover:shadow-lg hover:shadow-amber-500/30 transition-all duration-300 hover:scale-105"
            >
              Get Started
            </button>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-slate-800/50 py-8 mt-20">
        <div className="mx-auto max-w-7xl px-6 text-center text-sm text-slate-400">
          <p>DevVerse © 2026 • Track, Compete, Achieve</p>
        </div>
      </footer>
    </div>
  );
}
