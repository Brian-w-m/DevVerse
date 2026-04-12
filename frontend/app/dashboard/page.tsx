'use client';

import React, { useEffect, useState } from 'react';
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
interface ActivityDay { date: string; count: number; }
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
  { rank: 1, id: 'user-1', name: 'Alex Chen',     email: 'alex@example.com',   score: 5840, streak: 42 },
  { rank: 2, id: 'user-2', name: 'Jordan Smith',  email: 'jordan@example.com', score: 5320, streak: 35 },
  { rank: 3, id: 'user-3', name: 'Casey Parker',  email: 'casey@example.com',  score: 4890, streak: 28 },
  { rank: 4, id: 'user-4', name: 'Morgan Lee',    email: 'morgan@example.com', score: 4560, streak: 21 },
  { rank: 5, id: 'dev-user-001', name: 'Developer', email: 'dev@example.com',  score: 4250, streak: 12 },
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

export default function Dashboard() {
  const router = useRouter();
  const [stats, setStats]           = useState<UserStats | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [activity, setActivity]     = useState<ActivityData | null>(null);
  const [loading, setLoading]       = useState(true);
  const [userId, setUserId]         = useState('');
  const [useMockData, setUseMockData] = useState(false);
  const [gameSave, setGameSave]     = useState<GameSave | null>(null);
  const [tab, setTab]               = useState<'activity' | 'leaderboard'>('activity');
  const [mounted, setMounted]       = useState(false);

  useEffect(() => {
    const storedUserId = localStorage.getItem('devverse.userId');
    if (storedUserId) setUserId(storedUserId);
    try {
      const raw = localStorage.getItem('devverse.game');
      if (raw) setGameSave(JSON.parse(raw) as GameSave);
    } catch { /* no save */ }
    setTimeout(() => setMounted(true), 80);
  }, []);

  useEffect(() => {
    if (!userId) return;
    const fetchData = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('devverse.jwt');
        let backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
        if (!backendUrl || backendUrl.includes('backend:8080')) backendUrl = 'http://localhost:8080';
        const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
        const [sRes, lRes, aRes] = await Promise.all([
          fetch(`${backendUrl}/stats/${userId}`,      { headers }),
          fetch(`${backendUrl}/leaderboard?limit=10`, { headers }),
          fetch(`${backendUrl}/activity/${userId}`,   { headers }),
        ]);
        if (!sRes.ok || !lRes.ok || !aRes.ok) throw new Error('API error');
        setStats(await sRes.json());
        setLeaderboard((await lRes.json()) || []);
        setActivity(await aRes.json());
        setUseMockData(false);
      } catch {
        setStats(MOCK_STATS); setLeaderboard(MOCK_LEADERBOARD); setActivity(MOCK_ACTIVITY);
        setUseMockData(true);
      } finally { setLoading(false); }
    };
    fetchData();
  }, [userId]);

  const handleLogout = () => {
    localStorage.removeItem('devverse.jwt');
    localStorage.removeItem('devverse.userId');
    router.push('/');
  };

  const topScore = leaderboard[0]?.score || stats?.score || 1;
  const gameCodingGold = Math.floor((stats?.score ?? 0) / 20);

  // Loading / not-ready states
  if (!userId || loading) {
    return (
      <div className="min-h-screen bg-[#050810] flex items-center justify-center">
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@600;700&family=IBM+Plex+Mono:wght@400;500&display=swap');`}</style>
        <div className="text-center" style={{ fontFamily: 'IBM Plex Mono, monospace' }}>
          <div className="w-8 h-8 border border-emerald-500/40 border-t-emerald-400 rounded-full mx-auto mb-4"
            style={{ animation: 'spin 0.8s linear infinite' }} />
          <p className="text-slate-500 text-xs tracking-widest">{!userId ? 'AUTHENTICATING' : 'LOADING STATS'}</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050810] text-slate-100" style={{ fontFamily: 'IBM Plex Mono, monospace' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap');
        .font-display { font-family: 'Rajdhani', sans-serif; }
        .font-mono-custom { font-family: 'IBM Plex Mono', monospace; }

        .dot-grid {
          background-image: radial-gradient(rgba(255,255,255,0.05) 1px, transparent 1px);
          background-size: 28px 28px;
        }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fillBar {
          from { width: 0%; }
        }

        .card-reveal { animation: fadeUp 0.5s ease-out both; }
        .bar-animated { animation: fillBar 1s cubic-bezier(0.4,0,0.2,1) both; }

        .stat-card {
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.07);
          position: relative;
          overflow: hidden;
          transition: border-color 0.2s;
        }
        .stat-card:hover { border-color: rgba(255,255,255,0.12); }
        .stat-card::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 2px;
        }
        .stat-card.accent-emerald::before { background: #10b981; }
        .stat-card.accent-sky::before     { background: #38bdf8; }
        .stat-card.accent-violet::before  { background: #8b5cf6; }
        .stat-card.accent-orange::before  { background: #f97316; }
        .stat-card.accent-amber::before   { background: linear-gradient(90deg, #f59e0b, #d97706); }

        .tab-btn {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 0.7rem;
          letter-spacing: 0.1em;
          padding: 0.5rem 1.25rem;
          border-bottom: 2px solid transparent;
          color: #64748b;
          transition: color 0.2s, border-color 0.2s;
          background: none;
          cursor: pointer;
        }
        .tab-btn.active { color: #10b981; border-bottom-color: #10b981; }
        .tab-btn:hover:not(.active) { color: #94a3b8; }

        .lb-row {
          display: flex; align-items: center; gap: 12px;
          padding: 10px 14px;
          border-bottom: 1px solid rgba(255,255,255,0.04);
          transition: background 0.15s;
        }
        .lb-row:last-child { border-bottom: none; }
        .lb-row:hover { background: rgba(255,255,255,0.025); }
        .lb-row.is-you { background: rgba(16,185,129,0.05); }

        .progress-track {
          height: 3px; background: rgba(255,255,255,0.06); overflow: hidden; flex: 1;
        }
        .progress-fill { height: 100%; transition: width 1s cubic-bezier(0.4,0,0.2,1); }
      `}</style>

      {/* Dot grid */}
      <div className="fixed inset-0 dot-grid pointer-events-none" />

      {/* ── TOP NAV ── */}
      <nav className="sticky top-0 z-40 border-b border-white/[0.06] bg-[#050810]/90 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <a href="/" className="flex items-center gap-2 group">
              <div className="w-5 h-5 border border-emerald-500/50 flex items-center justify-center">
                <span className="font-display text-emerald-400 text-[10px] font-bold leading-none">DV</span>
              </div>
              <span className="font-display font-semibold text-slate-400 group-hover:text-white text-sm tracking-widest transition-colors">DEVVERSE</span>
            </a>
            <span className="text-slate-700 text-xs">/</span>
            <span className="font-display text-white text-sm font-semibold tracking-wide">Dashboard</span>
          </div>
          <div className="flex items-center gap-4">
            {useMockData && (
              <span className="text-xs text-amber-500/70 border border-amber-500/20 px-2 py-0.5 font-mono-custom">
                DEMO DATA
              </span>
            )}
            <a href="/game" className="text-xs text-yellow-500/80 border border-yellow-600/20 px-3 py-1.5 hover:bg-yellow-500/10 transition-colors font-mono-custom tracking-wider">
              ⚔ GAME
            </a>
            <button onClick={handleLogout}
              className="text-xs text-slate-500 hover:text-slate-300 transition-colors font-mono-custom tracking-wider">
              LOGOUT
            </button>
          </div>
        </div>
      </nav>

      <div className="relative z-10 mx-auto max-w-7xl px-6 py-10">

        {/* ── PAGE HEADER ── */}
        <div className="mb-10" style={{ animation: 'fadeUp 0.5s ease-out both' }}>
          <div className="text-xs text-slate-600 font-mono-custom tracking-widest mb-2">DEVELOPER STATS</div>
          <h1 className="font-display font-bold text-white mb-1" style={{ fontSize: '2.4rem', letterSpacing: '-0.01em', lineHeight: 1 }}>
            {stats?.name || 'Your'} Dashboard
          </h1>
          <p className="text-slate-500 text-xs font-mono-custom mt-2">
            Last active: {stats?.last_activity_at
              ? new Date(stats.last_activity_at).toLocaleString()
              : '—'}
          </p>
        </div>

        {/* ── STAT CARDS ── */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-10">
          {/* Score */}
          <div className="stat-card accent-emerald p-5 card-reveal col-span-1" style={{ animationDelay: '0.05s' }}>
            <div className="text-xs text-slate-500 tracking-widest font-mono-custom mb-3">TOTAL SCORE</div>
            <div className="font-display font-bold text-4xl text-white leading-none mb-1">{(stats?.score ?? 0).toLocaleString()}</div>
            <div className="text-xs text-emerald-600 font-mono-custom mt-2">all-time edits</div>
            {/* Score vs leader bar */}
            <div className="progress-track mt-4">
              <div className="progress-fill bg-emerald-500"
                style={{ width: mounted ? `${Math.min(100, ((stats?.score ?? 0) / topScore) * 100)}%` : '0%' }} />
            </div>
            <div className="text-[10px] text-slate-600 font-mono-custom mt-1">
              {Math.round(((stats?.score ?? 0) / topScore) * 100)}% of leader
            </div>
          </div>

          {/* Today */}
          <div className="stat-card accent-sky p-5 card-reveal" style={{ animationDelay: '0.1s' }}>
            <div className="text-xs text-slate-500 tracking-widest font-mono-custom mb-3">TODAY</div>
            <div className="font-display font-bold text-4xl text-white leading-none mb-1">{stats?.edits_today ?? 0}</div>
            <div className="text-xs text-sky-600 font-mono-custom mt-2">edits</div>
          </div>

          {/* This week */}
          <div className="stat-card accent-violet p-5 card-reveal" style={{ animationDelay: '0.15s' }}>
            <div className="text-xs text-slate-500 tracking-widest font-mono-custom mb-3">THIS WEEK</div>
            <div className="font-display font-bold text-4xl text-white leading-none mb-1">{stats?.edits_this_week ?? 0}</div>
            <div className="text-xs text-violet-500 font-mono-custom mt-2">edits</div>
          </div>

          {/* Streak */}
          <div className="stat-card accent-orange p-5 card-reveal" style={{ animationDelay: '0.2s' }}>
            <div className="text-xs text-slate-500 tracking-widest font-mono-custom mb-3">STREAK</div>
            <div className="font-display font-bold text-4xl text-white leading-none mb-1">{stats?.current_streak ?? 0}</div>
            <div className="text-xs text-orange-500 font-mono-custom mt-2">day streak</div>
            <div className="text-[10px] text-slate-600 font-mono-custom mt-1">
              best: {stats?.longest_streak ?? 0}d
            </div>
          </div>

          {/* Pixel Quest */}
          <a href="/game" className="block group card-reveal" style={{ animationDelay: '0.25s' }}>
            <div className="stat-card accent-amber h-full p-5 group-hover:border-yellow-600/40 transition-all">
              <div className="text-xs text-slate-500 tracking-widest font-mono-custom mb-3 flex items-center justify-between">
                <span>PIXEL QUEST</span>
                <span className="text-yellow-600/60">⚔</span>
              </div>
              {gameSave?.player ? (
                <>
                  <div className="font-display font-bold text-3xl text-yellow-400 leading-none mb-1">
                    🪙 {gameSave.player.gold.toLocaleString()}
                  </div>
                  <div className="text-xs text-slate-500 font-mono-custom mt-2">
                    Lv.{gameSave.player.level} &nbsp;·&nbsp; {gameSave.player.hp}/{gameSave.player.maxHp} HP
                  </div>
                  <div className="text-[10px] text-slate-600 font-mono-custom mt-2 truncate">
                    {gameSave.player.weapon?.icon ?? '✊'} {gameSave.player.weapon?.name ?? 'unarmed'}
                  </div>
                </>
              ) : (
                <>
                  <div className="font-display font-bold text-3xl text-yellow-600 leading-none mb-1">Play</div>
                  <div className="text-xs text-slate-600 font-mono-custom mt-2">No save found</div>
                </>
              )}
              <div className="text-[10px] text-yellow-700 font-mono-custom mt-2">
                +{gameCodingGold}g from coding
              </div>
            </div>
          </a>
        </div>

        {/* ── TABS ── */}
        <div className="border border-white/[0.07] bg-white/[0.015]">
          {/* Tab bar */}
          <div className="flex border-b border-white/[0.07]">
            <button className={`tab-btn ${tab === 'activity' ? 'active' : ''}`} onClick={() => setTab('activity')}>
              ACTIVITY
            </button>
            <button className={`tab-btn ${tab === 'leaderboard' ? 'active' : ''}`} onClick={() => setTab('leaderboard')}>
              LEADERBOARD
            </button>
          </div>

          {/* Activity tab */}
          {tab === 'activity' && (
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <div className="font-display font-semibold text-white text-xl tracking-wide">Weekly Activity</div>
                  <div className="text-xs text-slate-500 font-mono-custom mt-1">
                    {activity?.total_this_week ?? 0} edits this week
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-display font-bold text-3xl text-emerald-400">{activity?.total_this_week ?? 0}</div>
                  <div className="text-xs text-slate-600 font-mono-custom">total</div>
                </div>
              </div>
              {activity && (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={activity.days} barCategoryGap="35%">
                    <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,0.04)" vertical={false} />
                    <XAxis
                      dataKey="date" stroke="#374151" tick={{ fill: '#4b5563', fontSize: 10, fontFamily: 'IBM Plex Mono' }}
                      axisLine={{ stroke: 'rgba(255,255,255,0.06)' }} tickLine={false}
                    />
                    <YAxis
                      stroke="#374151" tick={{ fill: '#4b5563', fontSize: 10, fontFamily: 'IBM Plex Mono' }}
                      axisLine={false} tickLine={false} width={32}
                    />
                    <Tooltip
                      cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                      contentStyle={{
                        background: '#0c0f1e', border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: 0, fontFamily: 'IBM Plex Mono', fontSize: 11,
                      }}
                      labelStyle={{ color: '#9ca3af' }}
                      itemStyle={{ color: '#10b981' }}
                    />
                    <Bar dataKey="count" radius={[2, 2, 0, 0]}>
                      {(activity.days).map((entry, i) => (
                        <Cell
                          key={i}
                          fill={entry.count === Math.max(...activity.days.map(d => d.count))
                            ? '#10b981' : 'rgba(16,185,129,0.25)'}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          )}

          {/* Leaderboard tab */}
          {tab === 'leaderboard' && (
            <div className="p-6">
              <div className="mb-6">
                <div className="font-display font-semibold text-white text-xl tracking-wide">Top Developers</div>
                <div className="text-xs text-slate-500 font-mono-custom mt-1">ranked by total score</div>
              </div>
              {leaderboard.length > 0 ? (
                <div className="border border-white/[0.06]">
                  {leaderboard.map((entry, i) => {
                    const isYou = entry.id === userId;
                    const pct = Math.round((entry.score / topScore) * 100);
                    return (
                      <div key={entry.id} className={`lb-row ${isYou ? 'is-you' : ''}`}>
                        {/* Rank */}
                        <div className="w-8 flex-shrink-0 text-center">
                          {i < 3
                            ? <span className="text-base">{RANK_MEDALS[i]}</span>
                            : <span className="font-mono-custom text-xs text-slate-600">{entry.rank}</span>}
                        </div>
                        {/* Avatar */}
                        <div className={`w-8 h-8 flex-shrink-0 flex items-center justify-center text-xs font-bold border font-display
                          ${isYou ? 'border-emerald-500/50 text-emerald-400 bg-emerald-950/50' : 'border-white/10 text-slate-500 bg-white/[0.03]'}`}>
                          {initials(entry.name)}
                        </div>
                        {/* Name + email */}
                        <div className="flex-1 min-w-0">
                          <div className={`font-display font-semibold text-sm ${isYou ? 'text-emerald-400' : 'text-slate-200'}`}>
                            {entry.name} {isYou && <span className="text-emerald-600 text-xs font-mono-custom">(you)</span>}
                          </div>
                          <div className="text-xs text-slate-600 font-mono-custom truncate">{entry.email}</div>
                        </div>
                        {/* Score bar + number */}
                        <div className="flex items-center gap-3 w-48 flex-shrink-0">
                          <div className="progress-track flex-1">
                            <div className="progress-fill"
                              style={{
                                width: mounted ? `${pct}%` : '0%',
                                background: isYou ? '#10b981' : i === 0 ? '#f59e0b' : i === 1 ? '#94a3b8' : i === 2 ? '#b45309' : '#1e293b',
                              }} />
                          </div>
                          <div className="text-right w-16">
                            <div className={`font-display font-bold text-sm ${isYou ? 'text-emerald-400' : 'text-slate-300'}`}>
                              {entry.score.toLocaleString()}
                            </div>
                          </div>
                        </div>
                        {/* Streak */}
                        <div className="w-20 text-right flex-shrink-0">
                          <span className={`font-mono-custom text-xs px-2 py-0.5 border
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
                <p className="text-slate-500 text-xs font-mono-custom">No leaderboard data</p>
              )}
            </div>
          )}
        </div>

        {/* ── PIXEL QUEST PROMO (if no save) ── */}
        {!gameSave?.player && (
          <div className="mt-6 border border-yellow-600/20 bg-yellow-950/10 p-6 flex items-center gap-6">
            <span className="text-5xl flex-shrink-0">⚔️</span>
            <div className="flex-1">
              <div className="font-display font-bold text-yellow-400 text-lg tracking-wide mb-1">Start Your Adventure</div>
              <div className="text-slate-400 text-xs font-mono-custom">
                Your {stats?.score ?? 0} coding edits have earned you{' '}
                <span className="text-yellow-400 font-bold">🪙 {gameCodingGold} gold</span> in Pixel Quest.
                <br />Buy gear, fight monsters, and defeat the Cave Dragon.
              </div>
            </div>
            <a href="/game"
              className="font-display font-bold text-sm tracking-wide px-6 py-3 bg-yellow-500 text-black hover:bg-yellow-400 transition-colors flex-shrink-0">
              PLAY NOW
            </a>
          </div>
        )}

        <div className="mt-8 text-center text-xs text-slate-700 font-mono-custom">
          DevVerse — code more, rank higher
        </div>
      </div>
    </div>
  );
}
