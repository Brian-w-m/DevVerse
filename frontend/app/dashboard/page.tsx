'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';

interface UserStats {
  id: string; name: string; email: string; score: number;
  edits_today: number; edits_this_week: number;
  current_streak: number; longest_streak: number;
  last_activity_at: string;
}
interface LeaderboardEntry {
  rank: number; id: string; name: string; email: string; score: number; streak: number;
}
interface ActivityDay  { date: string; count: number; }
interface ActivityData { days: ActivityDay[]; total_this_week: number; }
interface GameSave {
  player?: {
    gold: number; level: number; hp: number; maxHp: number;
    weapon: { name: string; icon: string } | null;
    armor:  { name: string; icon: string } | null;
  };
}

const MOCK_STATS: UserStats = {
  id: 'dev-user-001', name: 'Developer', email: 'dev@example.com',
  score: 4250, edits_today: 145, edits_this_week: 892,
  current_streak: 12, longest_streak: 28,
  last_activity_at: new Date().toISOString(),
};
const MOCK_LEADERBOARD: LeaderboardEntry[] = [
  { rank: 1, id: 'user-1', name: 'Alex Chen',    email: 'alex@example.com',   score: 5840, streak: 42 },
  { rank: 2, id: 'user-2', name: 'Jordan Smith', email: 'jordan@example.com', score: 5320, streak: 35 },
  { rank: 3, id: 'user-3', name: 'Casey Parker', email: 'casey@example.com',  score: 4890, streak: 28 },
  { rank: 4, id: 'user-4', name: 'Morgan Lee',   email: 'morgan@example.com', score: 4560, streak: 21 },
  { rank: 5, id: 'dev-user-001', name: 'Developer', email: 'dev@example.com', score: 4250, streak: 12 },
];
const MOCK_ACTIVITY: ActivityData = {
  days: [
    { date: 'Mon', count: 120 }, { date: 'Tue', count: 145 },
    { date: 'Wed', count: 98  }, { date: 'Thu', count: 167 },
    { date: 'Fri', count: 189 }, { date: 'Sat', count: 76  },
    { date: 'Sun', count: 145 },
  ],
  total_this_week: 892,
};

const RANK_MEDALS = ['🥇', '🥈', '🥉'];
function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

// Animated counter hook
function useCounter(target: number, active: boolean, duration = 1500) {
  const [val, setVal] = useState(0);
  const ran = useRef(false);
  useEffect(() => {
    if (!active || ran.current) return;
    ran.current = true;
    const t0 = Date.now();
    const tick = () => {
      const p = Math.min((Date.now() - t0) / duration, 1);
      setVal(Math.floor((1 - Math.pow(1 - p, 3)) * target));
      if (p < 1) requestAnimationFrame(tick);
      else setVal(target);
    };
    requestAnimationFrame(tick);
  }, [active, target, duration]);
  return val;
}

export default function Dashboard() {
  const router = useRouter();
  const [stats, setStats]             = useState<UserStats | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [activity, setActivity]       = useState<ActivityData | null>(null);
  const [loading, setLoading]         = useState(true);
  const [userId, setUserId]           = useState('');
  const [useMockData, setUseMockData] = useState(false);
  const [gameSave, setGameSave]       = useState<GameSave | null>(null);
  const [tab, setTab]                 = useState<'activity' | 'leaderboard'>('activity');
  const [mounted, setMounted]         = useState(false);
  const [cardsVisible, setCardsVisible] = useState(false);
  const cardsRef = useRef<HTMLDivElement>(null);

  // animated counters (trigger once cards section is visible)
  const scoreCount   = useCounter(stats?.score          ?? 0, cardsVisible, 1800);
  const todayCount   = useCounter(stats?.edits_today    ?? 0, cardsVisible, 1200);
  const weekCount    = useCounter(stats?.edits_this_week ?? 0, cardsVisible, 1400);
  const streakCount  = useCounter(stats?.current_streak ?? 0, cardsVisible, 900);

  useEffect(() => {
    const id = localStorage.getItem('devverse.userId');
    if (id) setUserId(id);
    try {
      const raw = localStorage.getItem('devverse.game');
      if (raw) setGameSave(JSON.parse(raw) as GameSave);
    } catch { /* no save */ }
    setTimeout(() => setMounted(true), 80);
  }, []);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('devverse.jwt');
        let url = process.env.NEXT_PUBLIC_BACKEND_URL;
        if (!url || url.includes('backend:8080')) url = 'http://localhost:8080';
        const h: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
        const [sR, lR, aR] = await Promise.all([
          fetch(`${url}/stats/${userId}`, { headers: h }),
          fetch(`${url}/leaderboard?limit=10`, { headers: h }),
          fetch(`${url}/activity/${userId}`, { headers: h }),
        ]);
        if (!sR.ok || !lR.ok || !aR.ok) throw new Error();
        setStats(await sR.json());
        setLeaderboard((await lR.json()) || []);
        setActivity(await aR.json());
        setUseMockData(false);
      } catch {
        setStats(MOCK_STATS); setLeaderboard(MOCK_LEADERBOARD); setActivity(MOCK_ACTIVITY);
        setUseMockData(true);
      } finally { setLoading(false); }
    })();
  }, [userId]);

  // scroll-reveal for cards
  useEffect(() => {
    if (!cardsRef.current) return;
    const obs = new IntersectionObserver(
      entries => { if (entries[0].isIntersecting) setCardsVisible(true); },
      { threshold: 0.1 }
    );
    obs.observe(cardsRef.current);
    return () => obs.disconnect();
  }, [stats]);

  // generic scroll reveals
  useEffect(() => {
    const obs = new IntersectionObserver(
      entries => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); }),
      { threshold: 0.08, rootMargin: '-20px' }
    );
    document.querySelectorAll('.reveal').forEach(el => obs.observe(el));
    return () => obs.disconnect();
  }, [loading]);

  // mouse parallax on bg
  useEffect(() => {
    const root = document.documentElement;
    const onM = (e: MouseEvent) => {
      root.style.setProperty('--mx', ((e.clientX / window.innerWidth  - 0.5) * 2).toFixed(3));
      root.style.setProperty('--my', ((e.clientY / window.innerHeight - 0.5) * 2).toFixed(3));
    };
    window.addEventListener('mousemove', onM, { passive: true });
    return () => window.removeEventListener('mousemove', onM);
  }, []);

  // 3-D tilt
  const onTilt = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width  - 0.5) * 2;
    const y = ((e.clientY - r.top)  / r.height - 0.5) * 2;
    e.currentTarget.style.transform  = `perspective(900px) rotateY(${x*7}deg) rotateX(${-y*7}deg) translateZ(8px)`;
    e.currentTarget.style.boxShadow  = `${-x*10}px ${y*10}px 30px rgba(0,0,0,0.45)`;
  };
  const onTiltEnd = (e: React.MouseEvent<HTMLDivElement>) => {
    e.currentTarget.style.transform = '';
    e.currentTarget.style.boxShadow = '';
  };

  // magnetic
  const onMag = (e: React.MouseEvent<HTMLElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - r.left - r.width  / 2) * 0.25;
    const y = (e.clientY - r.top  - r.height / 2) * 0.25;
    e.currentTarget.style.transform = `translate(${x}px,${y}px)`;
  };
  const onMagEnd = (e: React.MouseEvent<HTMLElement>) => { e.currentTarget.style.transform = ''; };

  const topScore       = leaderboard[0]?.score || stats?.score || 1;
  const gameCodingGold = Math.floor((stats?.score ?? 0) / 20);

  // ── Loading ──────────────────────────────────────────────────────────────
  if (!userId || loading) return (
    <div className="min-h-screen bg-[#050810] flex items-center justify-center" style={{ fontFamily: 'IBM Plex Mono, monospace' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:none; } }
      `}</style>
      <div className="text-center" style={{ animation: 'fadeIn .5s ease-out' }}>
        <div className="w-8 h-8 border border-emerald-500/40 border-t-emerald-400 rounded-full mx-auto mb-4"
          style={{ animation: 'spin .8s linear infinite' }} />
        <p className="text-slate-500 text-xs tracking-widest">{!userId ? 'AUTHENTICATING' : 'LOADING STATS'}</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#050810] text-slate-100" style={{ fontFamily: 'IBM Plex Mono, monospace' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap');
        :root { --mx: 0; --my: 0; }

        .f-disp { font-family: 'Rajdhani', sans-serif; }
        .f-mono  { font-family: 'IBM Plex Mono', monospace; }

        /* dot grid */
        .dot-grid {
          background-image: radial-gradient(rgba(255,255,255,0.045) 1px, transparent 1px);
          background-size: 28px 28px;
        }
        /* aurora */
        .dash-aurora {
          position: absolute;
          inset: -100px;
          background: radial-gradient(ellipse at 73% 8%, rgba(16,185,129,0.065) 0%, transparent 50%);
          transform: translate(calc(var(--mx)*25px), calc(var(--my)*18px));
          transition: transform .8s cubic-bezier(.25,.46,.45,.94);
          will-change: transform;
        }
        .dash-aurora-b {
          position: absolute;
          inset: -100px;
          background: radial-gradient(ellipse at 12% 92%, rgba(56,189,248,0.04) 0%, transparent 50%);
          transform: translate(calc(var(--mx)*-15px), calc(var(--my)*-10px));
          transition: transform 1s cubic-bezier(.25,.46,.45,.94);
          will-change: transform;
        }

        /* ── stat cards ── */
        .stat-card {
          position: relative;
          overflow: hidden;
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.07);
          transition: transform .18s ease, box-shadow .18s ease, border-color .22s ease;
          will-change: transform;
        }
        .stat-card:hover { border-color: rgba(255,255,255,0.14) !important; }
        .stat-card::before {
          content: '';
          position: absolute; top:0; left:0; right:0; height:2px;
        }
        .stat-card.em-a::before  { background: #10b981; }
        .stat-card.em-b::before  { background: #38bdf8; }
        .stat-card.em-c::before  { background: #8b5cf6; }
        .stat-card.em-d::before  { background: #f97316; }
        .stat-card.em-e::before  { background: linear-gradient(90deg,#f59e0b,#d97706); }

        /* inner glow on hover */
        .stat-card::after {
          content: '';
          position: absolute; inset: 0;
          opacity: 0;
          transition: opacity .3s ease;
          pointer-events: none;
        }
        .stat-card.em-a::after { background: radial-gradient(circle at 50% 0%, rgba(16,185,129,.06) 0%, transparent 70%); }
        .stat-card.em-b::after { background: radial-gradient(circle at 50% 0%, rgba(56,189,248,.06) 0%, transparent 70%); }
        .stat-card.em-c::after { background: radial-gradient(circle at 50% 0%, rgba(139,92,246,.06) 0%, transparent 70%); }
        .stat-card.em-d::after { background: radial-gradient(circle at 50% 0%, rgba(249,115,22,.06) 0%, transparent 70%); }
        .stat-card.em-e::after { background: radial-gradient(circle at 50% 0%, rgba(245,158,11,.06) 0%, transparent 70%); }
        .stat-card:hover::after { opacity: 1; }

        /* ── stagger reveal ── */
        @keyframes fadeUp {
          from { opacity:0; transform:translateY(20px); }
          to   { opacity:1; transform:translateY(0); }
        }
        .card-reveal { animation: fadeUp .55s ease-out both; }

        /* ── scroll reveal ── */
        .reveal {
          opacity:0; transform:translateY(24px);
          transition: opacity .7s ease, transform .7s ease;
        }
        .reveal.visible { opacity:1; transform:translateY(0); }

        /* ── progress ── */
        .prog-track { height:3px; background:rgba(255,255,255,0.06); overflow:hidden; flex:1; }
        .prog-fill   { height:100%; transition: width 1.1s cubic-bezier(.4,0,.2,1); }

        /* ── spinning gradient border ── */
        @keyframes spin-grad { to { background-position: 200% center; } }
        .spin-border {
          background: linear-gradient(90deg,#10b981,#38bdf8,#8b5cf6,#10b981);
          background-size: 200% auto;
          animation: spin-grad 3s linear infinite;
        }

        /* ── tabs ── */
        .tab-btn {
          font-family: 'IBM Plex Mono', monospace;
          font-size: .7rem; letter-spacing: .1em;
          padding: .55rem 1.4rem;
          border-bottom: 2px solid transparent;
          color: #64748b; cursor: pointer; background: none;
          transition: color .2s, border-color .2s;
        }
        .tab-btn.active  { color:#10b981; border-bottom-color:#10b981; }
        .tab-btn:hover:not(.active) { color:#94a3b8; }

        /* ── leaderboard row ── */
        .lb-row {
          display:flex; align-items:center; gap:12px;
          padding:11px 16px;
          border-bottom:1px solid rgba(255,255,255,0.04);
          transition: background .15s, transform .15s;
          cursor: default;
        }
        .lb-row:last-child { border-bottom:none; }
        .lb-row:hover { background:rgba(255,255,255,0.028); transform: translateX(3px); }
        .lb-row.is-you { background:rgba(16,185,129,0.05); }
        .lb-row.is-you:hover { background:rgba(16,185,129,0.08); }

        /* ── nav link ── */
        .nav-lnk {
          font-family: 'IBM Plex Mono', monospace;
          font-size: .7rem; letter-spacing: .12em; color:#64748b;
          transition: color .2s; text-decoration:none;
          position: relative;
        }
        .nav-lnk::after {
          content:''; position:absolute; bottom:-2px; left:0;
          width:0; height:1px; background:#10b981;
          transition: width .3s ease;
        }
        .nav-lnk:hover { color:#e2e8f0; }
        .nav-lnk:hover::after { width:100%; }

        /* ── score hero glow ── */
        @keyframes scoreGlow {
          0%,100% { text-shadow: none; }
          50%      { text-shadow: 0 0 24px rgba(16,185,129,.3); }
        }
        .score-glow { animation: scoreGlow 3s ease-in-out infinite; }

        /* ── mag ── */
        .mag { cursor: pointer; transition: transform .22s cubic-bezier(.25,.46,.45,.94); will-change: transform; }

        /* ── pulse ── */
        @keyframes pulse-out {
          0%   { transform:scale(1); opacity:.7; }
          100% { transform:scale(2.2); opacity:0; }
        }
        .pulse-dot {
          position:relative; width:6px; height:6px;
          border-radius:50%; background:#10b981; flex-shrink:0;
        }
        .pulse-dot::after {
          content:''; position:absolute; inset:-3px;
          border-radius:50%; background:#10b981;
          animation: pulse-out 2s ease-out infinite;
        }
      `}</style>

      {/* BG layers */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 dot-grid" />
        <div className="dash-aurora" />
        <div className="dash-aurora-b" />
      </div>

      {/* ── NAV ── */}
      <nav className="sticky top-0 z-40 border-b border-white/[0.05] bg-[#050810]/92 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-5">
            <a href="/" className="flex items-center gap-2 group">
              <div className="w-5 h-5 border border-emerald-500/50 flex items-center justify-center">
                <span className="f-disp text-emerald-400 text-[10px] font-bold leading-none">DV</span>
              </div>
              <span className="f-disp font-semibold text-slate-400 group-hover:text-white text-sm tracking-widest transition-colors">DEVVERSE</span>
            </a>
            <span className="text-slate-700 text-xs">/</span>
            <span className="f-disp text-white text-sm font-semibold tracking-wide">Dashboard</span>
          </div>
          <div className="flex items-center gap-4">
            {useMockData && (
              <span className="text-xs text-amber-500/70 border border-amber-500/20 px-2 py-0.5 f-mono">DEMO DATA</span>
            )}
            <div className="flex items-center gap-1.5">
              <span className="pulse-dot" />
              <span className="f-mono text-xs text-emerald-600 tracking-wider">LIVE</span>
            </div>
            <a href="/game" className="mag nav-lnk border border-yellow-600/20 px-3 py-1.5 hover:bg-yellow-500/10 hover:border-yellow-500/40 transition-all text-yellow-500/80"
              onMouseMove={onMag} onMouseLeave={onMagEnd}>
              ⚔ GAME
            </a>
            <button
              onClick={() => {
                localStorage.removeItem('devverse.jwt');
                localStorage.removeItem('devverse.userId');
                router.push('/');
              }}
              className="mag nav-lnk hover:text-slate-300"
              onMouseMove={onMag} onMouseLeave={onMagEnd}
            >
              LOGOUT
            </button>
          </div>
        </div>
      </nav>

      <div className="relative z-10 mx-auto max-w-7xl px-6 py-10">

        {/* ── PAGE HEADER ── */}
        <div className="mb-10 reveal">
          <div className="f-mono text-xs text-slate-600 tracking-widest mb-2">DEVELOPER STATS</div>
          <h1 className="f-disp font-bold text-white mb-1" style={{ fontSize: '2.5rem', letterSpacing: '-0.01em', lineHeight: 1 }}>
            {stats?.name || 'Your'}&nbsp;
            <span style={{ color: '#10b981' }}>Dashboard</span>
          </h1>
          <p className="f-mono text-slate-500 text-xs mt-2">
            Last active:&nbsp;
            {stats?.last_activity_at
              ? new Date(stats.last_activity_at).toLocaleString()
              : '—'}
          </p>
        </div>

        {/* ── STAT CARDS ── */}
        <div ref={cardsRef} className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-10">

          {/* Score */}
          <div
            className="stat-card em-a p-5 card-reveal col-span-1 tilt"
            style={{ animationDelay: '0.04s' }}
            onMouseMove={onTilt} onMouseLeave={onTiltEnd}
          >
            <div className="f-mono text-xs text-slate-500 tracking-widest mb-3">TOTAL SCORE</div>
            <div className="f-disp font-bold text-4xl text-white leading-none mb-1 score-glow">{scoreCount.toLocaleString()}</div>
            <div className="f-mono text-xs text-emerald-700 mt-2">all-time points</div>
            <div className="prog-track mt-4">
              <div className="prog-fill bg-emerald-500"
                style={{ width: mounted ? `${Math.min(100, ((stats?.score ?? 0) / topScore) * 100)}%` : '0%' }} />
            </div>
            <div className="f-mono text-[10px] text-slate-600 mt-1">
              {Math.round(((stats?.score ?? 0) / topScore) * 100)}% of leader
            </div>
          </div>

          {/* Today */}
          <div
            className="stat-card em-b p-5 card-reveal tilt"
            style={{ animationDelay: '0.09s' }}
            onMouseMove={onTilt} onMouseLeave={onTiltEnd}
          >
            <div className="f-mono text-xs text-slate-500 tracking-widest mb-3">TODAY</div>
            <div className="f-disp font-bold text-4xl text-white leading-none mb-1">{todayCount}</div>
            <div className="f-mono text-xs text-sky-600 mt-2">edits</div>
          </div>

          {/* Week */}
          <div
            className="stat-card em-c p-5 card-reveal tilt"
            style={{ animationDelay: '0.14s' }}
            onMouseMove={onTilt} onMouseLeave={onTiltEnd}
          >
            <div className="f-mono text-xs text-slate-500 tracking-widest mb-3">THIS WEEK</div>
            <div className="f-disp font-bold text-4xl text-white leading-none mb-1">{weekCount}</div>
            <div className="f-mono text-xs text-violet-500 mt-2">edits</div>
          </div>

          {/* Streak */}
          <div
            className="stat-card em-d p-5 card-reveal tilt"
            style={{ animationDelay: '0.19s' }}
            onMouseMove={onTilt} onMouseLeave={onTiltEnd}
          >
            <div className="f-mono text-xs text-slate-500 tracking-widest mb-3">STREAK</div>
            <div className="f-disp font-bold text-4xl text-white leading-none mb-1">{streakCount}</div>
            <div className="f-mono text-xs text-orange-500 mt-2">day streak</div>
            <div className="f-mono text-[10px] text-slate-600 mt-1">best: {stats?.longest_streak ?? 0}d</div>
          </div>

          {/* Pixel Quest */}
          <a href="/game" className="block group card-reveal" style={{ animationDelay: '0.24s' }}>
            <div
              className="stat-card em-e h-full p-5 group-hover:border-yellow-600/40 transition-all tilt"
              onMouseMove={onTilt} onMouseLeave={onTiltEnd}
            >
              <div className="f-mono text-xs text-slate-500 tracking-widest mb-3 flex items-center justify-between">
                <span>PIXEL QUEST</span>
                <span className="text-yellow-600/50">⚔</span>
              </div>
              {gameSave?.player ? (
                <>
                  <div className="f-disp font-bold text-3xl text-yellow-400 leading-none mb-1">
                    🪙 {gameSave.player.gold.toLocaleString()}
                  </div>
                  <div className="f-mono text-xs text-slate-500 mt-2">
                    Lv.{gameSave.player.level} · {gameSave.player.hp}/{gameSave.player.maxHp} HP
                  </div>
                  <div className="f-mono text-[10px] text-slate-600 mt-2 truncate">
                    {gameSave.player.weapon?.icon ?? '✊'} {gameSave.player.weapon?.name ?? 'unarmed'}
                  </div>
                </>
              ) : (
                <>
                  <div className="f-disp font-bold text-3xl text-yellow-600 leading-none mb-1">Play</div>
                  <div className="f-mono text-xs text-slate-600 mt-2">No save found</div>
                </>
              )}
              <div className="f-mono text-[10px] text-yellow-700 mt-2">+{gameCodingGold}g from coding</div>
            </div>
          </a>
        </div>

        {/* ── TABS ── */}
        <div className="reveal border border-white/[0.07] bg-white/[0.012]">
          <div className="flex border-b border-white/[0.07]">
            <button className={`tab-btn ${tab === 'activity'    ? 'active' : ''}`} onClick={() => setTab('activity')}>ACTIVITY</button>
            <button className={`tab-btn ${tab === 'leaderboard' ? 'active' : ''}`} onClick={() => setTab('leaderboard')}>LEADERBOARD</button>
          </div>

          {/* ── Activity ── */}
          {tab === 'activity' && (
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <div className="f-disp font-semibold text-white text-xl tracking-wide">Weekly Activity</div>
                  <div className="f-mono text-xs text-slate-500 mt-1">{activity?.total_this_week ?? 0} edits this week</div>
                </div>
                <div className="text-right">
                  <div className="f-disp font-bold text-3xl text-emerald-400">{activity?.total_this_week ?? 0}</div>
                  <div className="f-mono text-xs text-slate-600">total</div>
                </div>
              </div>
              {activity && (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={activity.days} barCategoryGap="35%">
                    <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,0.04)" vertical={false} />
                    <XAxis dataKey="date" stroke="#374151"
                      tick={{ fill: '#4b5563', fontSize: 10, fontFamily: 'IBM Plex Mono' }}
                      axisLine={{ stroke: 'rgba(255,255,255,0.06)' }} tickLine={false} />
                    <YAxis stroke="#374151"
                      tick={{ fill: '#4b5563', fontSize: 10, fontFamily: 'IBM Plex Mono' }}
                      axisLine={false} tickLine={false} width={32} />
                    <Tooltip
                      cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                      contentStyle={{ background: '#0c0f1e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 0, fontFamily: 'IBM Plex Mono', fontSize: 11 }}
                      labelStyle={{ color: '#9ca3af' }}
                      itemStyle={{ color: '#10b981' }}
                    />
                    <Bar dataKey="count" radius={[2, 2, 0, 0]}>
                      {activity.days.map((entry, i) => (
                        <Cell
                          key={i}
                          fill={entry.count === Math.max(...activity.days.map(d => d.count))
                            ? '#10b981' : 'rgba(16,185,129,0.22)'}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          )}

          {/* ── Leaderboard ── */}
          {tab === 'leaderboard' && (
            <div className="p-6">
              <div className="mb-6">
                <div className="f-disp font-semibold text-white text-xl tracking-wide">Top Developers</div>
                <div className="f-mono text-xs text-slate-500 mt-1">ranked by total score</div>
              </div>
              {leaderboard.length > 0 ? (
                <div className="border border-white/[0.06]">
                  {leaderboard.map((entry, i) => {
                    const isYou = entry.id === userId;
                    const pct   = Math.round((entry.score / topScore) * 100);
                    return (
                      <div key={entry.id} className={`lb-row ${isYou ? 'is-you' : ''}`}>
                        <div className="w-8 flex-shrink-0 text-center">
                          {i < 3
                            ? <span className="text-base">{RANK_MEDALS[i]}</span>
                            : <span className="f-mono text-xs text-slate-600">{entry.rank}</span>}
                        </div>
                        <div className={`w-8 h-8 flex-shrink-0 flex items-center justify-center text-xs font-bold border f-disp
                          ${isYou ? 'border-emerald-500/50 text-emerald-400 bg-emerald-950/50' : 'border-white/10 text-slate-500 bg-white/[0.03]'}`}>
                          {initials(entry.name)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className={`f-disp font-semibold text-sm ${isYou ? 'text-emerald-400' : 'text-slate-200'}`}>
                            {entry.name}{isYou && <span className="text-emerald-600 text-xs f-mono ml-2">(you)</span>}
                          </div>
                          <div className="f-mono text-xs text-slate-600 truncate">{entry.email}</div>
                        </div>
                        <div className="flex items-center gap-3 w-48 flex-shrink-0">
                          <div className="prog-track flex-1">
                            <div className="prog-fill"
                              style={{
                                width: mounted ? `${pct}%` : '0%',
                                background: isYou ? '#10b981' : i === 0 ? '#f59e0b' : i === 1 ? '#94a3b8' : i === 2 ? '#b45309' : 'rgba(255,255,255,0.12)',
                              }} />
                          </div>
                          <div className="w-16 text-right">
                            <div className={`f-disp font-bold text-sm ${isYou ? 'text-emerald-400' : 'text-slate-300'}`}>
                              {entry.score.toLocaleString()}
                            </div>
                          </div>
                        </div>
                        <div className="w-20 text-right flex-shrink-0">
                          <span className={`f-mono text-xs px-2 py-0.5 border
                            ${entry.streak >= 30 ? 'border-orange-500/40 text-orange-400'
                              : entry.streak >= 14 ? 'border-yellow-600/40 text-yellow-500'
                              : 'border-white/10 text-slate-500'}`}>
                            🔥 {entry.streak}d
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="f-mono text-slate-500 text-xs">No leaderboard data</p>
              )}
            </div>
          )}
        </div>

        {/* ── PIXEL QUEST PROMO ── */}
        {!gameSave?.player && (
          <div className="mt-6 reveal border border-yellow-600/20 bg-yellow-950/10 p-6 flex items-center gap-6 relative overflow-hidden">
            <div className="absolute inset-0 pointer-events-none"
              style={{ background: 'radial-gradient(ellipse at 0% 50%, rgba(245,158,11,0.06) 0%, transparent 60%)' }} />
            <span className="text-5xl flex-shrink-0">⚔️</span>
            <div className="flex-1 relative">
              <div className="f-disp font-bold text-yellow-400 text-lg tracking-wide mb-1">Start Your Adventure</div>
              <div className="f-mono text-slate-400 text-xs leading-relaxed">
                Your {stats?.score ?? 0} coding points have earned you{' '}
                <span className="text-yellow-400 font-bold">🪙 {gameCodingGold} gold</span> in Pixel Quest.
                <br />Buy gear, fight monsters, and defeat the Cave Dragon.
              </div>
            </div>
            <a
              href="/game"
              className="mag f-disp font-bold text-sm tracking-wide px-6 py-3 bg-yellow-500 text-black hover:bg-yellow-400 transition-colors flex-shrink-0"
              onMouseMove={onMag} onMouseLeave={onMagEnd}
            >
              PLAY NOW
            </a>
          </div>
        )}

        <div className="mt-10 text-center f-mono text-xs text-slate-700">
          DevVerse — code more · rank higher · play harder
        </div>
      </div>
    </div>
  );
}
