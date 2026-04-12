'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Code, MessageCircle, X, Zap, Award, Bolt } from 'lucide-react';

export default function Home() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState<Array<{ type: 'user' | 'bot'; text: string }>>([
    { type: 'bot', text: 'Hey there! 👋 Ready to track your code journey?' }
  ]);

  useEffect(() => {
    // Auto-login with mock user for development
    const mockUserId = 'dev-user-001';
    const mockJWT = 'mock-jwt-token';

    localStorage.setItem('devverse.jwt', mockJWT);
    localStorage.setItem('devverse.userId', mockUserId);
    setIsLoggedIn(true);
  }, []);

  const goToDashboard = () => {
    router.push('/dashboard');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100 flex flex-col">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-40 backdrop-blur-md bg-slate-950/80 border-b border-slate-800">
        <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-400 to-purple-600 flex items-center justify-center">
              <Code className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-black text-white">DevVerse</span>
          </div>
          <div className="flex items-center gap-6">
            <a href="https://github.com/Brian-w-m/DevVerse" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-white transition-colors text-sm font-medium">GitHub</a>
            {isLoggedIn && (
              <button onClick={goToDashboard} className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:shadow-lg hover:shadow-purple-500/50 transition-all text-sm font-medium">Dashboard</button>
            )}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-6 pt-20 pb-6">
        <div className="w-full max-w-6xl">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left: Content */}
            <div className="space-y-8">
              {/* Tag */}
              <div className="inline-block">
                <span className="px-4 py-2 rounded-full bg-slate-800/50 border border-slate-700 text-slate-300 text-xs font-semibold tracking-widest">BUILD YOUR LEGEND</span>
              </div>

              {/* Title */}
              <h1 className="text-5xl lg:text-6xl font-black tracking-tight leading-tight text-white">
                Master Your
                <br />
                <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-blue-400 bg-clip-text text-transparent">Code Journey</span>
              </h1>

              {/* Description */}
              <p className="text-lg text-slate-400 leading-relaxed">
                Track every keystroke. Compete globally. Build unstoppable streaks. DevVerse is your precision-engineered platform for developer excellence.
              </p>

              {/* Features Grid */}
              <div className="grid md:grid-cols-3 gap-4 py-6">
                <div className="flex items-center gap-3">
                  <Bolt className="w-5 h-5 text-blue-400" />
                  <span className="text-sm text-slate-300">Real-time Tracking</span>
                </div>
                <div className="flex items-center gap-3">
                  <Award className="w-5 h-5 text-purple-400" />
                  <span className="text-sm text-slate-300">Global Leaderboard</span>
                </div>
                <div className="flex items-center gap-3">
                  <Zap className="w-5 h-5 text-pink-400" />
                  <span className="text-sm text-slate-300">Streak Mastery</span>
                </div>
                <div className="flex items-center gap-3 md:col-span-3 mt-2 p-3 rounded-lg bg-yellow-950/30 border border-yellow-800/40">
                  <span className="text-xl">⚔️</span>
                  <span className="text-sm text-yellow-300 font-medium">Pixel Quest RPG</span>
                  <span className="text-xs text-slate-400">— Your coding edits become in-game gold. Spend them on gear and defeat the Dragon.</span>
                </div>
              </div>

              {/* CTA Buttons */}
              <div className="flex flex-wrap gap-4 pt-4">
                {isLoggedIn ? (
                  <>
                  <button 
                    onClick={goToDashboard} 
                    className="px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-purple-500/40 transition-all duration-300"
                  >
                    Open Dashboard
                  </button>
                  <a
                    href="/game"
                    className="px-8 py-4 bg-gradient-to-r from-yellow-600 to-amber-500 text-black font-semibold rounded-xl hover:shadow-lg hover:shadow-yellow-500/40 transition-all duration-300 flex items-center gap-2"
                  >
                    ⚔️ Play Pixel Quest
                  </a>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => {
                        localStorage.setItem('devverse.jwt', 'mock-jwt-token');
                        localStorage.setItem('devverse.userId', 'dev-user-001');
                        setIsLoggedIn(true);
                      }}
                      className="px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-purple-500/40 transition-all duration-300"
                    >
                      Get Started
                    </button>
                    <a 
                      href="https://github.com/Brian-w-m/DevVerse" 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="px-8 py-4 border-2 border-slate-700 text-slate-300 font-semibold rounded-xl hover:bg-slate-800/50 transition-all duration-300"
                    >
                      View on GitHub
                    </a>
                  </>
                )}
              </div>

              {/* Tagline */}
              <p className="text-sm text-slate-500 pt-4">CSS-First. JS-Light. Performance First. 60FPS optimized.</p>
            </div>

            {/* Right: Visual */}
            <div className="hidden lg:flex items-center justify-center relative h-96">
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-0 left-1/2 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl opacity-40 -translate-x-1/2"></div>
                <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl opacity-30"></div>
              </div>
              
              <div className="relative z-10 bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-slate-700 rounded-3xl p-8 backdrop-blur-sm space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-blue-400"></div>
                  <span className="text-sm text-slate-300">DevVerse Status</span>
                </div>
                <div className="text-2xl font-black text-white">4,250</div>
                <div className="text-xs text-slate-400">Your Current Score</div>
                <div className="w-32 h-2 bg-slate-700 rounded-full overflow-hidden mt-4">
                  <div className="h-full w-2/3 bg-gradient-to-r from-blue-500 to-purple-600"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Floating Chat Widget */}
      <div className="fixed bottom-6 right-6 z-50">
        {/* Chat Window */}
        {chatOpen && (
          <div className="mb-4 w-80 bg-slate-900 rounded-2xl shadow-2xl border border-slate-800 flex flex-col h-96">
            {/* Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-600 flex items-center justify-center text-white font-black text-sm">D</div>
                <div>
                  <p className="text-sm font-semibold text-white">DevVerse Guide</p>
                  <p className="text-xs text-slate-400">Always here to help</p>
                </div>
              </div>
              <button onClick={() => setChatOpen(false)} className="text-slate-500 hover:text-slate-200 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-xs px-4 py-2 rounded-xl ${msg.type === 'user' ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white' : 'bg-slate-800 text-slate-100'}`}>
                    <p className="text-sm">{msg.text}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Input */}
            <div className="p-4 border-t border-slate-800">
              <input type="text" placeholder="Ask me anything..." className="w-full px-3 py-2 text-sm rounded-lg bg-slate-800 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500" />
            </div>
          </div>
        )}

        {/* Chat Button */}
        <button
          onClick={() => setChatOpen(!chatOpen)}
          className="w-14 h-14 bg-gradient-to-br from-blue-500 to-purple-600 text-white rounded-full shadow-lg hover:shadow-xl hover:shadow-purple-500/50 transition-all duration-300 flex items-center justify-center hover:scale-110"
        >
          {chatOpen ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
        </button>
      </div>
    </div>
  );
}
