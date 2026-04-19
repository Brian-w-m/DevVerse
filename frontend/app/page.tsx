'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';

const LIVE_FEED = [
  { user: 'alex_chen',   file: 'auth/oauth.go',         pts: '+12', ago: '1s'  },
  { user: 'j.smith',     file: 'components/dash.tsx',   pts: '+8',  ago: '4s'  },
  { user: 'dev_master',  file: 'api/routes.rs',         pts: '+31', ago: '9s'  },
  { user: 'c.parker',    file: 'styles/tokens.css',     pts: '+5',  ago: '15s' },
  { user: 'morgan_lee',  file: 'hooks/useAuth.ts',      pts: '+19', ago: '22s' },
  { user: 'riley.dev',   file: 'db/migrations/001.sql', pts: '+44', ago: '28s' },
];

const PREVIEW_BOARD = [
  { name: 'alex_chen', score: 5840, pct: 100 },
  { name: 'j.smith',   score: 5320, pct: 91  },
  { name: 'c.parker',  score: 4890, pct: 84  },
  { name: 'you',       score: 4250, pct: 73, isYou: true },
];

const CODE_FRAGMENTS = [
  { text: 'const streak = 42;',       left: '6%',  top: '20%', depth: 0.22 },
  { text: 'func AddScore(pts int)',    left: '70%', top: '14%', depth: 0.42 },
  { text: 'SELECT * FROM sessions',   left: '8%',  top: '65%', depth: 0.18 },
  { text: 'git commit -m "feat: +"',  left: '74%', top: '58%', depth: 0.35 },
  { text: '⚡ +31 pts earned',        left: '84%', top: '32%', depth: 0.52 },
  { text: 'type Session struct {',    left: '2%',  top: '42%', depth: 0.28 },
];

const STAT_ITEMS = [
  { end: 2847, label: 'ACTIVE DEVS',   suffix: '',  color: '#10b981' },
  { end: 142,  label: 'K EDITS / DAY', suffix: 'K', color: '#38bdf8' },
  { end: 84,   label: 'TOP STREAK',    suffix: 'd', color: '#f97316' },
  { end: 99,   label: 'UPTIME',        suffix: '%', color: '#8b5cf6' },
];

const FEATURES = [
  { icon: '⚡', title: 'Weighted Scoring',   desc: 'Language multipliers reward harder work. Go and Rust score higher than YAML config.',     accent: '#10b981', tag: 'SMART POINTS' },
  { icon: '🏆', title: 'Live Leaderboard',   desc: 'Real-time global rankings. See exactly who\'s shipping code right now.',                  accent: '#38bdf8', tag: 'COMPETE'      },
  { icon: '🔥', title: 'Streak Bonuses',     desc: 'Code daily to unlock up to 2× streak multipliers. Consistency compounds.',                accent: '#f97316', tag: 'HABIT LOOP'   },
  { icon: '⚔️', title: 'Pixel Quest RPG',   desc: 'Convert your coding score to gold. Level up characters, buy gear, slay the Cave Dragon.', accent: '#f59e0b', tag: 'PLAY'         },
];

const STEPS = [
  { n: '01', icon: '📦', title: 'Install Extension',  desc: 'Add DevVerse to VS Code. Login with GitHub. Takes under 30 seconds.',                          color: '#10b981' },
  { n: '02', icon: '⌨️', title: 'Code & Earn Points', desc: 'Every character earns weighted points. 30-min sessions unlock a 20% duration bonus.',            color: '#38bdf8' },
  { n: '03', icon: '🏆', title: 'Compete & Play',     desc: 'Climb the leaderboard. Convert your score to in-game gold and build your RPG character.',        color: '#f59e0b' },
];

export default function Home() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn]   = useState(false);
  const [feedCount, setFeedCount]     = useState(0);
  const [score, setScore]             = useState(0);
  const [barsReady, setBarsReady]     = useState(false);
  const [statValues, setStatValues]   = useState(STAT_ITEMS.map(() => 0));
  const statsRef    = useRef<HTMLDivElement>(null);
  const statsAnimated = useRef(false);
  const rafRef      = useRef<number>(0);

  // ── boot animations + parallax setup ────────────────────────────────────
  useEffect(() => {
    localStorage.setItem('devverse.jwt', 'mock-jwt-token');
    localStorage.setItem('devverse.userId', 'dev-user-001');
    setIsLoggedIn(true);

    const target = 4250, duration = 1800, start = Date.now();
    const counter = setInterval(() => {
      const p = Math.min((Date.now() - start) / duration, 1);
      setScore(Math.floor((1 - Math.pow(1 - p, 3)) * target));
      if (p >= 1) clearInterval(counter);
    }, 16);

    const feedTimers = LIVE_FEED.map((_, i) =>
      setTimeout(() => setFeedCount(i + 1), i * 500 + 400)
    );
    const barTimer = setTimeout(() => setBarsReady(true), 800);

    // mouse + scroll → CSS custom properties (no React re-renders in hot path)
    const root = document.documentElement;
    root.style.setProperty('--mx', '0');
    root.style.setProperty('--my', '0');
    root.style.setProperty('--sy', '0');

    const onMouse = (e: MouseEvent) => {
      root.style.setProperty('--mx', ((e.clientX / window.innerWidth  - 0.5) * 2).toFixed(3));
      root.style.setProperty('--my', ((e.clientY / window.innerHeight - 0.5) * 2).toFixed(3));
    };
    const onScroll = () => {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() =>
        root.style.setProperty('--sy', window.scrollY.toFixed(0))
      );
    };

    window.addEventListener('mousemove', onMouse,  { passive: true });
    window.addEventListener('scroll',    onScroll,  { passive: true });

    return () => {
      clearInterval(counter);
      feedTimers.forEach(clearTimeout);
      clearTimeout(barTimer);
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('mousemove', onMouse);
      window.removeEventListener('scroll',    onScroll);
    };
  }, []);

  // ── scroll-triggered reveals (direct DOM mutation, no React state) ───────
  useEffect(() => {
    const obs = new IntersectionObserver(
      entries => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); }),
      { threshold: 0.1, rootMargin: '-30px' }
    );
    document.querySelectorAll('.reveal').forEach(el => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  // ── stats counter ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!statsRef.current) return;
    const obs = new IntersectionObserver(entries => {
      if (!entries[0].isIntersecting || statsAnimated.current) return;
      statsAnimated.current = true;
      STAT_ITEMS.forEach((item, i) => {
        const dur = 1600, t0 = Date.now();
        const tick = () => {
          const p = Math.min((Date.now() - t0) / dur, 1);
          setStatValues(prev => { const n = [...prev]; n[i] = Math.floor((1 - Math.pow(1 - p, 3)) * item.end); return n; });
          if (p < 1) requestAnimationFrame(tick);
        };
        setTimeout(() => requestAnimationFrame(tick), i * 120);
      });
    }, { threshold: 0.3 });
    obs.observe(statsRef.current);
    return () => obs.disconnect();
  }, []);

  // ── 3-D card tilt ────────────────────────────────────────────────────────
  const onTilt = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width  - 0.5) * 2;
    const y = ((e.clientY - r.top)  / r.height - 0.5) * 2;
    e.currentTarget.style.transform  = `perspective(900px) rotateY(${x*9}deg) rotateX(${-y*9}deg) translateZ(10px)`;
    e.currentTarget.style.boxShadow  = `${-x*12}px ${y*12}px 40px rgba(0,0,0,0.5)`;
  };
  const onTiltEnd = (e: React.MouseEvent<HTMLDivElement>) => {
    e.currentTarget.style.transform = '';
    e.currentTarget.style.boxShadow = '';
  };

  // ── magnetic button ──────────────────────────────────────────────────────
  const onMag = (e: React.MouseEvent<HTMLElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - r.left - r.width  / 2) * 0.28;
    const y = (e.clientY - r.top  - r.height / 2) * 0.28;
    e.currentTarget.style.transform = `translate(${x}px,${y}px)`;
  };
  const onMagEnd = (e: React.MouseEvent<HTMLElement>) => {
    e.currentTarget.style.transform = '';
  };

  return (
    <div className="min-h-screen bg-[#050810] text-slate-100 overflow-x-hidden">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap');

        :root { --mx: 0; --my: 0; --sy: 0; }

        .f-disp { font-family: 'Rajdhani',    sans-serif; }
        .f-mono  { font-family: 'IBM Plex Mono', monospace; }

        /* ── parallax layers ── */
        .bg-dots {
          background-image: radial-gradient(rgba(255,255,255,0.055) 1px, transparent 1px);
          background-size: 28px 28px;
        }
        /* Each aurora is 200px larger than its container (100px bleed on every side)
           so translation of ±35px never reaches the div edge and exposes the border. */
        .aurora-a {
          position: absolute;
          inset: -100px;
          background: radial-gradient(ellipse at 68% 8%,  rgba(16,185,129,0.09) 0%, transparent 55%);
          transform: translate(
            calc(var(--mx) * 35px),
            calc(var(--my) * 25px)
          );
          transition: transform 0.7s cubic-bezier(.25,.46,.45,.94);
          will-change: transform;
        }
        .aurora-b {
          position: absolute;
          inset: -100px;
          background: radial-gradient(ellipse at 17% 83%, rgba(56,189,248,0.06) 0%, transparent 55%);
          transform: translate(
            calc(var(--mx) * -22px),
            calc(var(--my) * -18px)
          );
          transition: transform 0.9s cubic-bezier(.25,.46,.45,.94);
          will-change: transform;
        }
        .aurora-c {
          position: absolute;
          inset: -100px;
          background: radial-gradient(ellipse at 50% 50%, rgba(139,92,246,0.04) 0%, transparent 50%);
          transform: translate(
            calc(var(--mx) * 12px),
            calc(var(--my) * 10px + var(--sy) * 0.06px)
          );
          transition: transform 1.1s cubic-bezier(.25,.46,.45,.94);
          will-change: transform;
        }

        /* hero content subtle upward parallax */
        .hero-layer {
          transform: translateY(calc(var(--sy) * -0.12px));
          will-change: transform;
        }

        /* ── code fragments ── */
        .frag-wrap {
          position: fixed;
          pointer-events: none;
          transition: transform 0.45s cubic-bezier(.25,.46,.45,.94);
          will-change: transform;
        }

        @keyframes fragFloat {
          0%,100% { transform: translateY(0px); }
          50%      { transform: translateY(-8px); }
        }
        .frag-inner {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 0.62rem;
          letter-spacing: 0.1em;
          padding: 6px 10px;
          white-space: nowrap;
          border: 1px solid rgba(255,255,255,0.06);
          background: rgba(255,255,255,0.018);
          backdrop-filter: blur(6px);
        }

        /* ── glitch headline ── */
        @keyframes g1 {
          0%   { clip-path: inset(80% 0 0 0);   transform: translate(-3px,0); color: #f97316; }
          20%  { clip-path: inset(10% 0 60% 0);  transform: translate(2px,0);  }
          40%  { clip-path: inset(40% 0 30% 0);  transform: translate(-2px,0); }
          60%  { clip-path: inset(70% 0  5% 0);  transform: translate(3px,0);  }
          80%  { clip-path: inset(20% 0 65% 0);  transform: translate(-1px,0); }
          100% { clip-path: inset(80% 0 0 0);    transform: translate(0,0);    color: #f97316; }
        }
        @keyframes g2 {
          0%   { clip-path: inset(0 0 85% 0);    transform: translate(2px,0);  color: #38bdf8; }
          25%  { clip-path: inset(55% 0 20% 0);  transform: translate(-2px,0); }
          50%  { clip-path: inset(10% 0 70% 0);  transform: translate(1px,0);  color: #10b981; }
          100% { clip-path: inset(0 0 85% 0);    transform: translate(0,0);    color: #38bdf8; }
        }
        .glitch { position: relative; display: block; }
        .glitch::before, .glitch::after {
          content: attr(data-text);
          position: absolute; inset: 0;
          pointer-events: none; opacity: 0.65;
        }
        .glitch::before { animation: g1 4s 1.8s infinite; }
        .glitch::after  { animation: g2 4s 2.1s infinite; }

        /* ── hero headline ── */
        .h1 {
          font-family: 'Rajdhani', sans-serif;
          font-weight: 700;
          font-size: clamp(3.4rem, 7.2vw, 6.2rem);
          line-height: 0.91;
          letter-spacing: -0.01em;
        }

        /* ── pulse dot ── */
        @keyframes pulse-out {
          0%   { transform: scale(1); opacity: 0.8; }
          100% { transform: scale(2.4); opacity: 0; }
        }
        .pulse-dot {
          position: relative;
          width: 6px; height: 6px;
          border-radius: 50%;
          background: #10b981;
          flex-shrink: 0;
        }
        .pulse-dot::after {
          content: '';
          position: absolute;
          inset: -3px;
          border-radius: 50%;
          background: #10b981;
          animation: pulse-out 1.9s ease-out infinite;
        }

        /* ── cursor blink ── */
        @keyframes blink { 0%,100% { opacity:1; } 50% { opacity:0; } }
        .cursor { animation: blink 1.1s step-end infinite; }

        /* ── feed line ── */
        @keyframes slideInX {
          from { opacity:0; transform: translateX(-14px); }
          to   { opacity:1; transform: translateX(0); }
        }
        .feed-ln { animation: slideInX .3s ease-out both; }

        /* ── score glow ── */
        @keyframes scoreGlow {
          0%,100% { text-shadow: none; }
          50%      { text-shadow: 0 0 28px rgba(16,185,129,.35), 0 0 60px rgba(16,185,129,.1); }
        }
        .score-glow { animation: scoreGlow 2.8s ease-in-out infinite; }

        /* ── bar fill ── */
        .bar-fill { transition: width 1.3s cubic-bezier(.4,0,.2,1); }

        /* ── spinning gradient border ── */
        @keyframes spin-grad { to { background-position: 200% center; } }
        .spin-border {
          background: linear-gradient(90deg,#10b981,#38bdf8,#8b5cf6,#10b981);
          background-size: 200% auto;
          animation: spin-grad 3s linear infinite;
        }

        /* ── scroll reveal ── */
        @keyframes fadeUp {
          from { opacity:0; transform: translateY(28px); }
          to   { opacity:1; transform: translateY(0);    }
        }
        .anim-up   { animation: fadeUp .7s ease-out both; }
        .d1 { animation-delay: .08s;  }
        .d2 { animation-delay: .18s;  }
        .d3 { animation-delay: .3s;   }
        .d4 { animation-delay: .44s;  }
        .d5 { animation-delay: .58s;  }

        /* Reveal uses translate (separate CSS property from transform)
           so the animation fill-mode never fights the JS tilt handler,
           which sets transform. --rd controls per-card stagger delay. */
        @keyframes revealUp {
          from { opacity: 0; translate: 0 28px; }
          to   { opacity: 1; translate: 0 0px;  }
        }
        .reveal { opacity: 0; }
        .reveal.visible {
          animation: revealUp .75s var(--rd, 0s) ease-out both;
        }

        /* ── 3-D tilt card ── */
        .tilt {
          transition: transform .18s ease, box-shadow .18s ease;
          will-change: transform;
        }

        /* ── magnetic button ── */
        .mag {
          cursor: pointer;
          transition: transform .22s cubic-bezier(.25,.46,.45,.94);
          will-change: transform;
        }

        /* ── nav link ── */
        .nav-a {
          font-family: 'IBM Plex Mono', monospace;
          font-size: .7rem;
          letter-spacing: .12em;
          color: #64748b;
          transition: color .2s;
          text-decoration: none;
          position: relative;
        }
        .nav-a::after {
          content:''; position:absolute; bottom:-2px; left:0;
          width:0; height:1px; background:#10b981;
          transition: width .3s ease;
        }
        .nav-a:hover { color:#e2e8f0; }
        .nav-a:hover::after { width:100%; }

        /* ── label ── */
        .lbl {
          font-family: 'IBM Plex Mono', monospace;
          font-size: .62rem;
          letter-spacing: .2em;
          text-transform: uppercase;
          color: #334155;
        }

        /* ── em badge ── */
        .em {
          font-family: 'IBM Plex Mono', monospace;
          font-size: .62rem;
          letter-spacing: .13em;
        }

        /* ── stat card hover ── */
        .s-card {
          transition: transform .2s ease, background .2s ease, border-color .2s ease;
        }
        .s-card:hover {
          transform: translateY(-5px);
          background: rgba(255,255,255,0.04) !important;
          border-color: rgba(255,255,255,0.12) !important;
        }

        /* ── feature card ── */
        .f-card {
          transition: transform .18s ease, box-shadow .18s ease, border-color .2s ease;
          will-change: transform;
        }
        .f-card:hover { border-color: rgba(255,255,255,0.12) !important; }

        /* ── cta glow pulse ── */
        @keyframes ctaPulse {
          0%,100% { opacity:.35; }
          50%      { opacity:.65; }
        }
        .cta-glow { animation: ctaPulse 3.5s ease-in-out infinite; }

        /* ── terminal ── */
        .term {
          background: #080c18;
          border: 1px solid rgba(255,255,255,0.08);
        }

        /* ── scan lines ── */
        .scan::after {
          content:'';
          position:absolute; inset:0;
          background: repeating-linear-gradient(
            to bottom,
            transparent 0px, transparent 2px,
            rgba(0,0,0,.09) 2px, rgba(0,0,0,.09) 4px
          );
          pointer-events:none;
        }
      `}</style>

      {/* ── STATIC BG (fixed, no scroll) ── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute inset-0 bg-dots opacity-100" />
        <div className="aurora-a" />
        <div className="aurora-b" />
        <div className="aurora-c" />
      </div>

      {/* ── FLOATING CODE FRAGMENTS ── */}
      {CODE_FRAGMENTS.map((fr, i) => (
        <div
          key={i}
          className="frag-wrap"
          style={{
            left: fr.left, top: fr.top,
            transform: `translate(calc(var(--mx)*${(fr.depth*42).toFixed(0)}px), calc(var(--my)*${(fr.depth*30).toFixed(0)}px))`,
          }}
        >
          <div
            className="frag-inner"
            style={{
              color: `rgba(${i % 2 === 0 ? '16,185,129' : '56,189,248'},${(0.12 + fr.depth * 0.22).toFixed(2)})`,
              animation: `fragFloat ${4.2 + i * 0.6}s ease-in-out ${i * 0.55}s infinite`,
            }}
          >
            {fr.text}
          </div>
        </div>
      ))}

      {/* ── NAV ── */}
      <nav className="fixed top-0 inset-x-0 z-50 border-b border-white/[0.05] bg-[#050810]/88 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 border border-emerald-500/50 flex items-center justify-center">
              <span className="f-disp font-bold text-emerald-400 text-[10px] leading-none">DV</span>
            </div>
            <span className="f-disp font-semibold text-white tracking-[0.18em] text-sm">DEVVERSE</span>
          </div>
          <div className="flex items-center gap-6">
            <a href="https://github.com/Brian-w-m/DevVerse" target="_blank" rel="noopener noreferrer" className="nav-a">GITHUB</a>
            {isLoggedIn && (
              <button
                onClick={() => router.push('/dashboard')}
                className="mag nav-a border border-white/10 px-3 py-1.5 hover:border-emerald-500/40 hover:text-emerald-400 transition-all"
                onMouseMove={onMag} onMouseLeave={onMagEnd}
              >
                DASHBOARD →
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="relative z-10 min-h-screen flex items-center pt-14">
        <div className="hero-layer mx-auto max-w-7xl px-6 py-20 w-full">
          <div className="grid lg:grid-cols-[1fr_490px] gap-16 items-center">

            {/* Left */}
            <div>
              <div className="em anim-up inline-flex items-center gap-2.5 border border-emerald-500/25 px-3 py-1.5 text-emerald-500 mb-8">
                <span className="pulse-dot" />
                LIVE TRACKING ACTIVE
              </div>

              <h1 className="h1 text-white mb-6 anim-up d1">
                Every<br />
                <span
                  className="glitch"
                  data-text="Keystroke"
                  style={{ color: '#10b981' }}
                >
                  Keystroke
                </span>
                Counts.
              </h1>

              <p className="f-mono text-slate-400 text-sm leading-relaxed mb-10 max-w-[340px] anim-up d2">
                Track every edit. Build streaks. Climb the global leaderboard.
                Your code becomes gold in Pixel Quest RPG.
              </p>

              <div className="flex flex-wrap gap-3 mb-12 anim-up d3">
                {isLoggedIn ? (
                  <>
                    <button
                      onClick={() => router.push('/dashboard')}
                      className="mag f-disp font-bold tracking-wider px-7 py-3 bg-emerald-500 text-black text-sm hover:bg-emerald-400 transition-colors"
                      onMouseMove={onMag} onMouseLeave={onMagEnd}
                    >
                      OPEN DASHBOARD
                    </button>
                    <a
                      href="/game"
                      className="mag f-disp font-bold tracking-wider px-7 py-3 border border-yellow-500/40 text-yellow-400 text-sm hover:bg-yellow-500/10 transition-colors flex items-center gap-2"
                      onMouseMove={onMag} onMouseLeave={onMagEnd}
                    >
                      ⚔ PIXEL QUEST
                    </a>
                    <a
                      href="https://github.com/Brian-w-m/DevVerse"
                      target="_blank" rel="noopener noreferrer"
                      className="mag f-disp font-bold tracking-wider px-7 py-3 border border-white/10 text-slate-400 text-sm hover:text-white hover:border-white/20 transition-colors"
                      onMouseMove={onMag} onMouseLeave={onMagEnd}
                    >
                      GITHUB
                    </a>
                  </>
                ) : (
                  <button
                    onClick={() => {
                      localStorage.setItem('devverse.jwt', 'mock-jwt-token');
                      localStorage.setItem('devverse.userId', 'dev-user-001');
                      setIsLoggedIn(true);
                    }}
                    className="mag f-disp font-bold tracking-wider px-7 py-3 bg-emerald-500 text-black text-sm"
                    onMouseMove={onMag} onMouseLeave={onMagEnd}
                  >
                    GET STARTED
                  </button>
                )}
              </div>

              <p className="f-mono text-slate-600 text-xs anim-up d4">
                Install VS Code extension → code → watch your score climb ↑
              </p>
            </div>

            {/* Right – stacked cards */}
            <div className="hidden lg:flex flex-col gap-4 anim-up d2">

              {/* Terminal window */}
              <div className="tilt term scan relative" onMouseMove={onTilt} onMouseLeave={onTiltEnd}>
                <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/[0.05]">
                  <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#ff5f57', opacity: 0.7 }} />
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#febc2e', opacity: 0.7 }} />
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#28c840', opacity: 0.7 }} />
                  </div>
                  <span className="f-mono text-slate-600 text-xs ml-2 tracking-wider">devverse — live activity</span>
                </div>
                <div className="f-mono p-4 text-xs space-y-2 min-h-[172px]">
                  {LIVE_FEED.slice(0, feedCount).map((ln, i) => (
                    <div key={i} className="feed-ln flex items-center gap-2">
                      <span className="text-slate-700">$</span>
                      <span className="text-emerald-400 w-[88px] truncate">{ln.user}</span>
                      <span className="text-slate-600">edited</span>
                      <span className="text-sky-400/80 flex-1 truncate">{ln.file}</span>
                      <span className="text-emerald-300 ml-auto">{ln.pts}</span>
                      <span className="text-slate-700 w-8 text-right">{ln.ago}</span>
                    </div>
                  ))}
                  {feedCount < LIVE_FEED.length && (
                    <div className="flex items-center gap-1 text-slate-700">
                      <span>$</span><span className="cursor text-emerald-700">_</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Score card */}
              <div
                className="tilt border border-emerald-500/15 bg-[#060f0d] p-5 relative overflow-hidden"
                onMouseMove={onTilt} onMouseLeave={onTiltEnd}
              >
                <div className="absolute inset-x-0 bottom-0 h-[1px] spin-border" />
                <div className="flex items-center justify-between mb-1">
                  <span className="em text-slate-600 tracking-widest">YOUR SCORE</span>
                  <span className="em text-emerald-700">RANK #5</span>
                </div>
                <div className="f-disp font-bold text-5xl text-white score-glow mb-1">{score.toLocaleString()}</div>
                <div className="em text-slate-700 mb-5">total coding points</div>
                <div className="space-y-2">
                  {PREVIEW_BOARD.map((e, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <span className="f-mono text-xs text-slate-700 w-3">{i + 1}</span>
                      <span className={`f-mono text-xs w-20 truncate ${e.isYou ? 'text-emerald-400' : 'text-slate-500'}`}>{e.name}</span>
                      <div className="flex-1 h-[2px] bg-white/[0.04] overflow-hidden">
                        <div
                          className="h-full bar-fill"
                          style={{ width: barsReady ? `${e.pct}%` : '0%', background: e.isYou ? '#10b981' : 'rgba(255,255,255,0.1)' }}
                        />
                      </div>
                      <span className={`f-mono text-xs ${e.isYou ? 'text-emerald-400' : 'text-slate-600'}`}>{e.score.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Game teaser */}
              <div
                className="tilt border border-yellow-600/20 bg-yellow-950/10 p-4 flex items-center gap-4"
                onMouseMove={onTilt} onMouseLeave={onTiltEnd}
              >
                <span className="text-3xl flex-shrink-0">⚔️</span>
                <div className="flex-1 min-w-0">
                  <div className="f-disp font-semibold text-yellow-400 tracking-wide text-sm">PIXEL QUEST RPG</div>
                  <div className="f-mono text-slate-500 text-xs mt-0.5 truncate">Code edits → 🪙 gold → buy gear → defeat Dragon</div>
                </div>
                <a href="/game" className="f-mono text-xs text-yellow-500/80 border border-yellow-600/25 px-3 py-1.5 hover:bg-yellow-500/10 transition-colors whitespace-nowrap flex-shrink-0">
                  PLAY →
                </a>
              </div>
            </div>

          </div>
        </div>

        {/* scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2" style={{ opacity: 0.3 }}>
          <span className="f-mono text-xs text-slate-600 tracking-widest">SCROLL</span>
          <div className="w-px h-8" style={{ background: 'linear-gradient(to bottom, #64748b, transparent)' }} />
        </div>
      </section>

      {/* ── STATS STRIP ── */}
      <section className="relative z-10 border-y border-white/[0.05] bg-black/25">
        <div ref={statsRef} className="mx-auto max-w-7xl px-6 py-14">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
            {STAT_ITEMS.map((item, i) => (
              <div
                key={i}
                className="s-card p-5 border border-white/[0.06] bg-white/[0.02]"
              >
                <div className="f-disp font-bold text-5xl leading-none" style={{ color: item.color }}>
                  {statValues[i].toLocaleString()}{item.suffix}
                </div>
                <div className="em text-slate-600 mt-2 tracking-widest">{item.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="relative z-10 py-28">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center mb-16 reveal">
            <div className="lbl mb-4">WHY DEVVERSE</div>
            <h2 className="f-disp font-bold text-white tracking-tight" style={{ fontSize: 'clamp(2.2rem,4.5vw,3.6rem)', lineHeight: 0.95 }}>
              Code Smarter.<br />
              <span style={{ color: '#10b981' }}>Score Higher.</span>
            </h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {FEATURES.map((f, i) => (
              <div
                key={i}
                className="f-card reveal tilt p-6 border border-white/[0.06] bg-white/[0.015] relative overflow-hidden"
                style={{ '--rd': `${i * 0.08}s` } as React.CSSProperties}
                onMouseMove={onTilt} onMouseLeave={onTiltEnd}
              >
                <div className="absolute top-0 inset-x-0 h-[2px]" style={{ background: f.accent }} />
                <div className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                  style={{ background: `radial-gradient(circle at 50% 0%, ${f.accent}08 0%, transparent 70%)` }} />
                <div className="text-3xl mb-4">{f.icon}</div>
                <div className="em mb-2 tracking-widest" style={{ color: f.accent }}>{f.tag}</div>
                <div className="f-disp font-semibold text-white text-lg tracking-wide mb-2">{f.title}</div>
                <div className="f-mono text-slate-500 text-xs leading-relaxed">{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="relative z-10 py-24 border-t border-white/[0.04]">
        <div className="mx-auto max-w-7xl px-6">
          <div className="lbl mb-14 text-center reveal">HOW IT WORKS</div>
          <div className="grid md:grid-cols-3 gap-6">
            {STEPS.map((s, i) => (
              <div
                key={i}
                className="f-card reveal tilt p-8 border border-white/[0.06] bg-white/[0.015] relative overflow-hidden"
                style={{ '--rd': `${i * 0.12}s` } as React.CSSProperties}
                onMouseMove={onTilt} onMouseLeave={onTiltEnd}
              >
                <div className="f-disp font-bold mb-4" style={{ fontSize: '5rem', lineHeight: 1, color: 'rgba(255,255,255,0.035)' }}>{s.n}</div>
                <div className="text-2xl mb-3">{s.icon}</div>
                <div className="f-disp font-semibold text-white text-xl tracking-wide mb-2">{s.title}</div>
                <div className="f-mono text-slate-500 text-xs leading-relaxed">{s.desc}</div>
                <div className="absolute bottom-0 inset-x-0 h-[2px]" style={{ background: `linear-gradient(90deg, ${s.color}55, transparent)` }} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="relative z-10 py-36 overflow-hidden">
        <div
          className="cta-glow absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at 50% 50%, rgba(16,185,129,0.08) 0%, transparent 65%)' }}
        />
        <div className="relative mx-auto max-w-2xl px-6 text-center reveal">
          <div className="lbl mb-6">GET STARTED</div>
          <h2 className="f-disp font-bold text-white mb-6" style={{ fontSize: 'clamp(2.5rem,5.5vw,4.2rem)', lineHeight: 0.93 }}>
            Turn Code Into<br />
            <span style={{ color: '#10b981' }}>Progress.</span>
          </h2>
          <p className="f-mono text-slate-500 text-sm mb-12 leading-relaxed">
            Join developers who track their output, build consistency,<br />
            and play the game they&apos;re already playing.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <button
              onClick={() => router.push('/dashboard')}
              className="mag f-disp font-bold tracking-wider px-9 py-4 bg-emerald-500 text-black text-sm hover:bg-emerald-400 transition-colors"
              onMouseMove={onMag} onMouseLeave={onMagEnd}
            >
              OPEN DASHBOARD →
            </button>
            <a
              href="/game"
              className="mag f-disp font-bold tracking-wider px-9 py-4 border border-yellow-500/40 text-yellow-400 text-sm hover:bg-yellow-500/10 transition-colors"
              onMouseMove={onMag} onMouseLeave={onMagEnd}
            >
              ⚔ PLAY PIXEL QUEST
            </a>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="relative z-10 border-t border-white/[0.05] bg-black/35">
        <div className="mx-auto max-w-7xl px-6 py-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-5 h-5 border border-emerald-500/40 flex items-center justify-center">
              <span className="f-disp text-emerald-400 text-[9px] font-bold">DV</span>
            </div>
            <span className="f-disp font-semibold text-slate-500 tracking-widest text-xs">DEVVERSE</span>
          </div>
          <div className="f-mono text-slate-700 text-xs">code more · rank higher · play harder</div>
          <a href="https://github.com/Brian-w-m/DevVerse" target="_blank" rel="noopener noreferrer" className="nav-a text-xs">
            ★ star on github
          </a>
        </div>
      </footer>
    </div>
  );
}
