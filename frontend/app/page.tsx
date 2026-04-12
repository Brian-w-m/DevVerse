'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const LIVE_FEED = [
  { user: 'alex_chen',   file: 'auth/oauth.go',         pts: '+12', ago: '1s' },
  { user: 'j.smith',     file: 'components/dash.tsx',   pts: '+8',  ago: '4s' },
  { user: 'dev_master',  file: 'api/routes.rs',         pts: '+31', ago: '9s' },
  { user: 'c.parker',    file: 'styles/tokens.css',     pts: '+5',  ago: '15s' },
  { user: 'morgan_lee',  file: 'hooks/useAuth.ts',      pts: '+19', ago: '22s' },
  { user: 'riley.dev',   file: 'db/migrations/001.sql', pts: '+44', ago: '28s' },
];

const PREVIEW_BOARD = [
  { name: 'alex_chen',  score: 5840, pct: 100 },
  { name: 'j.smith',    score: 5320, pct: 91 },
  { name: 'c.parker',   score: 4890, pct: 84 },
  { name: 'you',        score: 4250, pct: 73, isYou: true },
];

export default function Home() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [feedCount, setFeedCount] = useState(0);
  const [score, setScore] = useState(0);
  const [barsReady, setBarsReady] = useState(false);

  useEffect(() => {
    localStorage.setItem('devverse.jwt', 'mock-jwt-token');
    localStorage.setItem('devverse.userId', 'dev-user-001');
    setIsLoggedIn(true);

    // Animate score counter
    const target = 4250;
    const duration = 1600;
    const start = Date.now();
    const counter = setInterval(() => {
      const p = Math.min((Date.now() - start) / duration, 1);
      setScore(Math.floor((1 - Math.pow(1 - p, 3)) * target));
      if (p >= 1) clearInterval(counter);
    }, 16);

    // Reveal feed lines one by one
    const feedTimers = LIVE_FEED.map((_, i) =>
      setTimeout(() => setFeedCount(i + 1), i * 500 + 400)
    );

    // Trigger bar animations
    const barTimer = setTimeout(() => setBarsReady(true), 800);

    return () => {
      clearInterval(counter);
      feedTimers.forEach(clearTimeout);
      clearTimeout(barTimer);
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#050810] text-slate-100 flex flex-col overflow-x-hidden">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap');

        .font-display { font-family: 'Rajdhani', sans-serif; }
        .font-mono-custom { font-family: 'IBM Plex Mono', monospace; }

        .hero-headline {
          font-family: 'Rajdhani', sans-serif;
          font-weight: 700;
          font-size: clamp(3.2rem, 6.5vw, 5.5rem);
          line-height: 0.95;
          letter-spacing: -0.01em;
        }

        .dot-grid {
          background-image: radial-gradient(rgba(255,255,255,0.06) 1px, transparent 1px);
          background-size: 28px 28px;
        }

        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeSlideRight {
          from { opacity: 0; transform: translateX(-12px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes cursorBlink {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0; }
        }
        @keyframes pulseGlow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(16,185,129,0); }
          50%       { box-shadow: 0 0 12px 2px rgba(16,185,129,0.15); }
        }

        .anim-up   { animation: fadeSlideUp   0.7s ease-out both; }
        .anim-up-1 { animation: fadeSlideUp   0.7s 0.1s ease-out both; }
        .anim-up-2 { animation: fadeSlideUp   0.7s 0.22s ease-out both; }
        .anim-up-3 { animation: fadeSlideUp   0.7s 0.34s ease-out both; }
        .anim-up-4 { animation: fadeSlideUp   0.7s 0.46s ease-out both; }
        .anim-up-5 { animation: fadeSlideUp   0.7s 0.58s ease-out both; }
        .feed-line { animation: fadeSlideRight 0.35s ease-out both; }

        .cursor { animation: cursorBlink 1.1s step-end infinite; }
        .glow-card { animation: pulseGlow 3s ease-in-out infinite; }

        .bar-fill { transition: width 1.1s cubic-bezier(0.4,0,0.2,1); }

        .btn-primary {
          font-family: 'Rajdhani', sans-serif;
          font-weight: 700;
          letter-spacing: 0.08em;
          position: relative;
          overflow: hidden;
        }
        .btn-primary::after {
          content: '';
          position: absolute;
          inset: 0;
          background: rgba(255,255,255,0);
          transition: background 0.2s;
        }
        .btn-primary:hover::after { background: rgba(255,255,255,0.08); }

        .nav-link {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 0.7rem;
          letter-spacing: 0.12em;
          color: #64748b;
          transition: color 0.2s;
        }
        .nav-link:hover { color: #e2e8f0; }

        .stat-num {
          font-family: 'Rajdhani', sans-serif;
          font-weight: 700;
          line-height: 1;
        }

        .terminal-chrome {
          background: #0a0e1a;
          border: 1px solid rgba(255,255,255,0.1);
        }
        .terminal-body {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 0.72rem;
        }

        .em-badge {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 0.65rem;
          letter-spacing: 0.12em;
        }
      `}</style>

      {/* Dot grid background */}
      <div className="fixed inset-0 dot-grid pointer-events-none opacity-100" />
      {/* Top glow */}
      <div className="fixed top-0 right-0 w-[700px] h-[500px] pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at 80% 0%, rgba(16,185,129,0.055) 0%, transparent 65%)' }} />
      {/* Bottom glow */}
      <div className="fixed bottom-0 left-0 w-[500px] h-[400px] pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at 10% 100%, rgba(56,189,248,0.04) 0%, transparent 65%)' }} />

      {/* ── NAV ── */}
      <nav className="fixed top-0 inset-x-0 z-50 border-b border-white/[0.06] bg-[#050810]/80 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 border border-emerald-500/60 flex items-center justify-center">
              <span className="font-display font-700 text-emerald-400 text-xs leading-none">DV</span>
            </div>
            <span className="font-display font-semibold text-white tracking-[0.18em] text-sm">DEVVERSE</span>
          </div>
          <div className="flex items-center gap-6">
            <a href="https://github.com/Brian-w-m/DevVerse" target="_blank" rel="noopener noreferrer" className="nav-link">GITHUB</a>
            {isLoggedIn && (
              <button onClick={() => router.push('/dashboard')}
                className="nav-link border border-white/10 px-3 py-1.5 hover:border-emerald-500/40 hover:text-emerald-400 transition-all">
                DASHBOARD →
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <main className="relative z-10 flex-1 flex items-center pt-14">
        <div className="mx-auto max-w-7xl px-6 py-16 w-full">
          <div className="grid lg:grid-cols-2 gap-14 items-center">

            {/* Left */}
            <div>
              <div className="em-badge anim-up inline-flex items-center gap-2 border border-emerald-500/30 px-3 py-1 text-emerald-500 mb-7">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" style={{ animation: 'cursorBlink 1.6s ease-in-out infinite' }} />
                LIVE TRACKING ACTIVE
              </div>

              <h1 className="hero-headline text-white mb-6 anim-up-1">
                Every<br />
                <span style={{ color: '#10b981' }}>Keystroke</span><br />
                Counts.
              </h1>

              <p className="font-mono-custom text-slate-400 text-sm leading-relaxed mb-9 max-w-sm anim-up-2">
                Track every edit. Build streaks. Climb the leaderboard.
                Your code becomes gold in Pixel Quest RPG.
              </p>

              {/* Mini stat row */}
              <div className="grid grid-cols-3 gap-3 mb-10 anim-up-3">
                {[
                  { v: '2,847', l: 'ACTIVE DEVS' },
                  { v: '142K',  l: 'EDITS TODAY' },
                  { v: '84d',   l: 'TOP STREAK'  },
                ].map(s => (
                  <div key={s.l} className="border border-white/[0.07] bg-white/[0.02] p-3">
                    <div className="stat-num text-xl text-white">{s.v}</div>
                    <div className="em-badge text-slate-500 mt-0.5 tracking-widest">{s.l}</div>
                  </div>
                ))}
              </div>

              {/* CTAs */}
              <div className="flex flex-wrap gap-3 anim-up-4">
                {isLoggedIn ? (
                  <>
                    <button onClick={() => router.push('/dashboard')}
                      className="btn-primary px-7 py-3 bg-emerald-500 text-black text-sm">
                      OPEN DASHBOARD
                    </button>
                    <a href="/game"
                      className="btn-primary px-7 py-3 border border-yellow-500/50 text-yellow-400 text-sm hover:bg-yellow-500/10 transition-colors flex items-center gap-2">
                      ⚔ PIXEL QUEST
                    </a>
                    <a href="https://github.com/Brian-w-m/DevVerse" target="_blank" rel="noopener noreferrer"
                      className="btn-primary px-7 py-3 border border-white/10 text-slate-400 text-sm hover:text-white hover:border-white/20 transition-colors">
                      GITHUB
                    </a>
                  </>
                ) : (
                  <button onClick={() => {
                    localStorage.setItem('devverse.jwt', 'mock-jwt-token');
                    localStorage.setItem('devverse.userId', 'dev-user-001');
                    setIsLoggedIn(true);
                  }} className="btn-primary px-7 py-3 bg-emerald-500 text-black text-sm">
                    GET STARTED
                  </button>
                )}
              </div>

              <p className="font-mono-custom text-slate-600 text-xs mt-8 anim-up-5">
                Install the VS Code extension → code → watch your score climb.
              </p>
            </div>

            {/* Right */}
            <div className="hidden lg:flex flex-col gap-4 anim-up-2">

              {/* Terminal window */}
              <div className="terminal-chrome">
                <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/[0.06]">
                  <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
                    <div className="w-2.5 h-2.5 rounded-full bg-[#febc2e]" />
                    <div className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
                  </div>
                  <span className="font-mono-custom text-slate-500 text-xs ml-2">devverse — live activity feed</span>
                </div>
                <div className="terminal-body p-4 space-y-2 min-h-[168px]">
                  {LIVE_FEED.slice(0, feedCount).map((line, i) => (
                    <div key={i} className="feed-line flex items-center gap-2">
                      <span className="text-slate-600">$</span>
                      <span className="text-emerald-400 w-24 truncate">{line.user}</span>
                      <span className="text-slate-500">edited</span>
                      <span className="text-sky-400 flex-1 truncate">{line.file}</span>
                      <span className="text-emerald-300 ml-auto">{line.pts}</span>
                      <span className="text-slate-600 w-8 text-right">{line.ago}</span>
                    </div>
                  ))}
                  {feedCount < LIVE_FEED.length && (
                    <div className="flex items-center gap-1 font-mono-custom text-slate-600 text-xs">
                      <span>$</span><span className="cursor">_</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Score card */}
              <div className="glow-card border border-emerald-500/20 bg-[#061410] p-5">
                <div className="flex items-center justify-between mb-1">
                  <span className="em-badge text-slate-500 tracking-widest">YOUR SCORE</span>
                  <span className="em-badge text-emerald-600">RANK #5</span>
                </div>
                <div className="stat-num text-5xl text-white mb-1">{score.toLocaleString()}</div>
                <div className="em-badge text-slate-600 mb-5">total coding edits</div>

                <div className="space-y-2.5">
                  {PREVIEW_BOARD.map((e, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <span className="font-mono-custom text-xs text-slate-600 w-3">{i + 1}</span>
                      <span className={`font-mono-custom text-xs w-20 truncate ${e.isYou ? 'text-emerald-400' : 'text-slate-500'}`}>{e.name}</span>
                      <div className="flex-1 h-[3px] bg-white/[0.05] overflow-hidden">
                        <div className="h-full bar-fill"
                          style={{ width: barsReady ? `${e.pct}%` : '0%', background: e.isYou ? '#10b981' : '#1e293b' }} />
                      </div>
                      <span className={`font-mono-custom text-xs ${e.isYou ? 'text-emerald-400' : 'text-slate-600'}`}>
                        {e.score.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pixel Quest teaser */}
              <div className="border border-yellow-600/25 bg-yellow-950/10 p-4 flex items-center gap-4">
                <span className="text-3xl flex-shrink-0">⚔️</span>
                <div className="flex-1 min-w-0">
                  <div className="font-display font-semibold text-yellow-400 tracking-wide text-sm">PIXEL QUEST RPG</div>
                  <div className="font-mono-custom text-slate-500 text-xs mt-0.5 truncate">
                    Code edits → 🪙 gold → buy gear → defeat the Dragon
                  </div>
                </div>
                <a href="/game"
                  className="font-mono-custom text-xs text-yellow-500 border border-yellow-600/30 px-3 py-1.5 hover:bg-yellow-500/10 transition-colors whitespace-nowrap flex-shrink-0">
                  PLAY →
                </a>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ── FOOTER FEATURE STRIP ── */}
      <footer className="relative z-10 border-t border-white/[0.06] bg-black/20">
        <div className="mx-auto max-w-7xl px-6 py-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { icon: '⚡', title: 'Real-time Tracking',    desc: 'Every keystroke captured' },
              { icon: '🏆', title: 'Global Leaderboard',    desc: 'Compete worldwide'        },
              { icon: '🔥', title: 'Streak Mastery',        desc: 'Build daily habits'       },
              { icon: '⚔️', title: 'Pixel Quest RPG',      desc: 'Code earns in-game gold'  },
            ].map(f => (
              <div key={f.title} className="flex items-start gap-3">
                <span className="text-base mt-0.5 flex-shrink-0">{f.icon}</span>
                <div>
                  <div className="font-display font-semibold text-slate-300 text-sm tracking-wide">{f.title}</div>
                  <div className="font-mono-custom text-slate-600 text-xs mt-0.5">{f.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
