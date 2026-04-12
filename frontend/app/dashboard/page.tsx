'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';
import { Flame, TrendingUp, Zap, Trophy } from 'lucide-react';

interface UserStats {
  id: string;
  name: string;
  email: string;
  score: number;
  edits_today: number;
  edits_this_week: number;
  current_streak: number;
  longest_streak: number;
  last_activity_at: string;
}

interface LeaderboardEntry {
  rank: number;
  id: string;
  name: string;
  email: string;
  score: number;
  streak: number;
}

interface ActivityDay {
  date: string;
  count: number;
}

interface ActivityData {
  days: ActivityDay[];
  total_this_week: number;
}

// Mock data for development
const MOCK_STATS: UserStats = {
  id: 'dev-user-001',
  name: 'Developer',
  email: 'dev@example.com',
  score: 4250,
  edits_today: 145,
  edits_this_week: 892,
  current_streak: 12,
  longest_streak: 28,
  last_activity_at: new Date().toISOString(),
};

const MOCK_LEADERBOARD: LeaderboardEntry[] = [
  { rank: 1, id: 'user-1', name: 'Alex Chen', email: 'alex@example.com', score: 5840, streak: 42 },
  { rank: 2, id: 'user-2', name: 'Jordan Smith', email: 'jordan@example.com', score: 5320, streak: 35 },
  { rank: 3, id: 'user-3', name: 'Casey Parker', email: 'casey@example.com', score: 4890, streak: 28 },
  { rank: 4, id: 'user-4', name: 'Morgan Lee', email: 'morgan@example.com', score: 4560, streak: 21 },
  { rank: 5, id: 'dev-user-001', name: 'Developer', email: 'dev@example.com', score: 4250, streak: 12 },
];

const MOCK_ACTIVITY: ActivityData = {
  days: [
    { date: 'Mon', count: 120 },
    { date: 'Tue', count: 145 },
    { date: 'Wed', count: 98 },
    { date: 'Thu', count: 167 },
    { date: 'Fri', count: 189 },
    { date: 'Sat', count: 76 },
    { date: 'Sun', count: 145 },
  ],
  total_this_week: 892,
};

interface GameSave {
  player?: {
    gold: number; level: number; hp: number; maxHp: number;
    weapon: { name: string; icon: string } | null;
    armor:  { name: string; icon: string } | null;
  };
}

export default function Dashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [activity, setActivity] = useState<ActivityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string>('');
  const [useMockData, setUseMockData] = useState(false);
  const [gameSave, setGameSave] = useState<GameSave | null>(null);

  useEffect(() => {
    const storedUserId = localStorage.getItem('devverse.userId');
    if (storedUserId) setUserId(storedUserId);

    // Load game save for the Pixel Quest card
    try {
      const raw = localStorage.getItem('devverse.game');
      if (raw) setGameSave(JSON.parse(raw) as GameSave);
    } catch { /* no save */ }
  }, []);

  useEffect(() => {
    if (!userId) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('devverse.jwt');
        
        // Determine backend URL
        let backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
        
        // If running locally (outside Docker), override to localhost
        if (!backendUrl || backendUrl.includes('backend:8080')) {
          // Try to use localhost if backend service name fails
          backendUrl = 'http://localhost:8080';
        }
        
        const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};

        console.log(`Fetching stats from ${backendUrl} for user ${userId}`);

        const statsPromise = fetch(`${backendUrl}/stats/${userId}`, { 
          headers,
          method: 'GET',
        }).catch(err => {
          console.error('Stats fetch error:', err);
          throw err;
        });
        
        const leaderboardPromise = fetch(`${backendUrl}/leaderboard?limit=10`, { 
          headers,
          method: 'GET', 
        }).catch(err => {
          console.error('Leaderboard fetch error:', err);
          throw err;
        });
        
        const activityPromise = fetch(`${backendUrl}/activity/${userId}`, { 
          headers,
          method: 'GET',
        }).catch(err => {
          console.error('Activity fetch error:', err);
          throw err;
        });

        const [statsRes, leaderboardRes, activityRes] = await Promise.all([
          statsPromise,
          leaderboardPromise,
          activityPromise,
        ]);

        // Check if responses are successful
        if (!statsRes.ok) {
          const text = await statsRes.text();
          throw new Error(`Stats request failed: ${statsRes.status} ${statsRes.statusText} - ${text}`);
        }
        if (!leaderboardRes.ok) {
          const text = await leaderboardRes.text();
          throw new Error(`Leaderboard request failed: ${leaderboardRes.status} ${leaderboardRes.statusText} - ${text}`);
        }
        if (!activityRes.ok) {
          const text = await activityRes.text();
          throw new Error(`Activity request failed: ${activityRes.status} ${activityRes.statusText} - ${text}`);
        }

        const statsData = await statsRes.json();
        const leaderboardData = await leaderboardRes.json();
        const activityData = await activityRes.json();

        console.log('Stats data:', statsData);
        console.log('Leaderboard data:', leaderboardData);
        console.log('Activity data:', activityData);

        setStats(statsData);
        setLeaderboard(leaderboardData || []);
        setActivity(activityData);
        setUseMockData(false);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load dashboard');
        // Use mock data as fallback for development
        console.warn('Using mock data as fallback');
        setStats(MOCK_STATS);
        setLeaderboard(MOCK_LEADERBOARD);
        setActivity(MOCK_ACTIVITY);
        setUseMockData(true);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userId]);

  const handleLogout = () => {
    localStorage.removeItem('devverse.jwt');
    localStorage.removeItem('devverse.userId');
    router.push('/');
  };

  if (!userId) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-8">
            <p className="text-slate-300">Loading...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-8">
            <p className="text-slate-300">Loading dashboard...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2">{stats?.name || 'Your'} Dashboard</h1>
            <p className="text-slate-400">Track your coding activity and compete on the leaderboard</p>
            {useMockData && (
              <p className="text-xs text-amber-300 mt-2">📡 Using demo data (backend unavailable)</p>
            )}
          </div>
          <button
            onClick={handleLogout}
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-300 hover:text-white hover:border-slate-600 transition-colors"
          >
            Logout
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium">Total Score</CardTitle>
              <Trophy className="h-4 w-4 text-amber-300" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.score || 0}</div>
              <p className="text-xs text-slate-400 mt-1">Total edits</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium">Today</CardTitle>
              <Zap className="h-4 w-4 text-sky-300" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.edits_today || 0}</div>
              <p className="text-xs text-slate-400 mt-1">Edits today</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium">This Week</CardTitle>
              <TrendingUp className="h-4 w-4 text-emerald-300" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.edits_this_week || 0}</div>
              <p className="text-xs text-slate-400 mt-1">Weekly edits</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium">Streak</CardTitle>
              <Flame className="h-4 w-4 text-orange-300" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.current_streak || 0}</div>
              <p className="text-xs text-slate-400 mt-1">Days</p>
            </CardContent>
          </Card>

          {/* Pixel Quest card */}
          <a href="/game" className="block group">
            <Card className="h-full border-yellow-800/50 bg-gradient-to-br from-slate-900 to-yellow-950/20 hover:border-yellow-600 transition-all duration-200 group-hover:shadow-lg group-hover:shadow-yellow-900/30">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
                <CardTitle className="text-sm font-medium text-yellow-300">⚔️ Pixel Quest</CardTitle>
                <span className="text-lg">🎮</span>
              </CardHeader>
              <CardContent>
                {gameSave?.player ? (
                  <>
                    <div className="text-2xl font-bold text-yellow-400">
                      🪙 {gameSave.player.gold.toLocaleString()}
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      Lv.{gameSave.player.level} &nbsp;·&nbsp;
                      {gameSave.player.hp}/{gameSave.player.maxHp} HP
                    </p>
                    <div className="mt-2 text-xs text-slate-500 truncate">
                      {gameSave.player.weapon?.icon ?? '✊'} {gameSave.player.weapon?.name ?? 'No weapon'}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-2xl font-bold text-yellow-600">Play</div>
                    <p className="text-xs text-slate-400 mt-1">No save found</p>
                  </>
                )}
                <p className="text-xs text-yellow-700 mt-2">
                  {Math.floor((stats?.score ?? 0) / 20)}g earned from coding
                </p>
              </CardContent>
            </Card>
          </a>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="activity" className="space-y-4">
          <TabsList>
            <TabsTrigger value="activity">Activity</TabsTrigger>
            <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
          </TabsList>

          {/* Activity Tab */}
          <TabsContent value="activity">
            <Card>
              <CardHeader>
                <CardTitle>Weekly Activity</CardTitle>
              </CardHeader>
              <CardContent>
                {activity && (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={activity.days}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="date" stroke="#94a3b8" />
                      <YAxis stroke="#94a3b8" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#1e293b',
                          border: '1px solid #475569',
                          borderRadius: '8px',
                        }}
                        labelStyle={{ color: '#fff' }}
                      />
                      <Bar dataKey="count" fill="#fbbf24" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
                <div className="mt-4 text-sm">
                  <p className="text-slate-400">
                    Total this week: <span className="text-amber-300 font-semibold">{activity?.total_this_week || 0}</span> edits
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Leaderboard Tab */}
          <TabsContent value="leaderboard">
            <Card>
              <CardHeader>
                <CardTitle>Top Devs This Week</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {leaderboard.length > 0 ? (
                    leaderboard.map((entry) => (
                      <div
                        key={entry.id}
                        className="flex items-center justify-between p-3 rounded-lg border border-slate-800/50 bg-slate-950/50"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-amber-300/20 flex items-center justify-center text-amber-300 font-bold text-sm">
                            {entry.rank}
                          </div>
                          <div>
                            <p className="font-medium text-white">{entry.name}</p>
                            <p className="text-xs text-slate-400">{entry.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="font-bold text-amber-300">{entry.score}</p>
                            <p className="text-xs text-slate-400">points</p>
                          </div>
                          <Badge variant="success">{entry.streak} day streak</Badge>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-slate-400">No leaderboard data available</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
