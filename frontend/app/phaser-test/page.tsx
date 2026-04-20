'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import type { GS, Item, Enemy, Player, Combat, Dialogue } from './types';
import {
  ITEMS, ENEMY_DEFS, NPCS, PORTALS, GET_TILE, AREA_NAMES,
  ENEMY_POOL, ENEMY_COUNT, GW, GH, TS, CW, CH,
} from './gameData';

// PhaserCanvas uses dynamic import internally, but ssr:false here as an extra guard
const PhaserCanvas = dynamic(() => import('./PhaserCanvas'), {
  ssr: false,
  loading: () => (
    <div style={{ width: CW, height: CH, background: '#0a120a' }}
      className="flex items-center justify-center">
      <span className="text-emerald-600 text-xs tracking-widest animate-pulse">LOADING ENGINE...</span>
    </div>
  ),
});

// ── Helpers ───────────────────────────────────────────────────────────────
function rand(min: number, max: number) { return Math.floor(Math.random()*(max-min+1))+min; }
function playerAtk(p: Player) { return p.atk + (p.weapon?.atkBonus ?? 0); }
function playerDef(p: Player) { return p.def + (p.armor?.defBonus ?? 0); }
function xpForLevel(lvl: number) { return lvl * lvl * 20; }

function spawnEnemies(area: 'town'|'forest'|'dungeon'): Enemy[] {
  const pool = ENEMY_POOL[area];
  const count = ENEMY_COUNT[area];
  const out: Enemy[] = [];
  const taken = new Set<string>();
  for (let i = 0; i < count * 5 && out.length < count; i++) {
    const defId = pool[rand(0, pool.length-1)];
    const def = ENEMY_DEFS[defId];
    const x = rand(2, GW-3), y = rand(2, GH-3);
    const tile = GET_TILE[area](x, y);
    if (['wall','tree','stone','water','portal'].includes(tile)) continue;
    if (taken.has(`${x},${y}`)) continue;
    if (NPCS.some(n => n.area===area && n.x===x && n.y===y)) continue;
    if (PORTALS[area].some(p => Math.abs(p.x-x)<=1 && Math.abs(p.y-y)<=1)) continue;
    taken.add(`${x},${y}`);
    out.push({ uid:`${area}_${defId}_${i}`, def, hp:def.hp, x, y, area });
  }
  return out;
}

function initPlayer(): Player {
  return {
    x:10, y:10, area:'town',
    hp:80, maxHp:80, mp:40, maxMp:40,
    atk:8, def:4, level:1, xp:0, xpNeeded:20,
    gold:50, bag:[{ ...ITEMS.potion },{ ...ITEMS.potion }],
    weapon:null, armor:null,
  };
}

function initGS(): GS {
  return {
    player: initPlayer(),
    enemies: [
      ...spawnEnemies('town'), ...spawnEnemies('forest'), ...spawnEnemies('dungeon'),
    ],
    combat: null, dialogue: null, showBag: false,
    msgs: ['Welcome to Pixel Quest!', 'Move with WASD. Talk to the Elder near the center.'],
    defeatedIds: [],
  };
}

// ── Constants ─────────────────────────────────────────────────────────────
const BACKEND_URL = (process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:8080')
  .replace('backend:8080', 'localhost:8080');
const SAVE_KEY = 'devverse.game.phaser';
const AWARDED_GOLD_KEY = 'devverse.game.phaser.awardedGold';

// ═══════════════════════════════════════════════════════════════════════════
// PAGE COMPONENT
// ═══════════════════════════════════════════════════════════════════════════
export default function PhaserGamePage() {
  const gsRef = useRef<GS>(initGS());
  const [tick, setTick] = useState(0);
  const [codingScore, setCodingScore] = useState<number | null>(null);
  const rerender = useCallback(() => setTick(n => n+1), []);

  function gs() { return gsRef.current; }
  function addMsg(msg: string) { gsRef.current.msgs = [msg, ...gsRef.current.msgs].slice(0, 10); }

  function saveGame() {
    const { player, enemies, defeatedIds, msgs } = gsRef.current;
    try { localStorage.setItem(SAVE_KEY, JSON.stringify({ player, enemies, defeatedIds, msgs })); }
    catch { /* storage full */ }
  }

  // ── Init ──────────────────────────────────────────────────────────────
  useEffect(() => {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as Partial<GS>;
        if (saved.player)      gsRef.current.player      = saved.player;
        if (saved.enemies)     gsRef.current.enemies     = saved.enemies;
        if (saved.defeatedIds) gsRef.current.defeatedIds = saved.defeatedIds;
        if (saved.msgs)        gsRef.current.msgs        = saved.msgs;
      }
    } catch { /* corrupted save */ }

    const userId = localStorage.getItem('devverse.userId') ?? '111062353';
    const alreadyAwarded = parseInt(localStorage.getItem(AWARDED_GOLD_KEY) ?? '0', 10);

    (async () => {
      let totalPts = 0;
      try {
        const res = await fetch(`${BACKEND_URL}/users/${encodeURIComponent(userId)}/activity?days=90`);
        if (res.ok) {
          const rows = await res.json() as Array<{ points: number }>;
          totalPts = rows.reduce((s, r) => s + (r.points ?? 0), 0);
        }
      } catch { /* backend offline */ }

      setCodingScore(totalPts);
      const goldEarned = Math.floor(totalPts / 50);
      const newGold = Math.max(0, goldEarned - alreadyAwarded);
      if (newGold > 0) {
        gsRef.current.player.gold += newGold;
        addMsg(`💻 Coding reward: +${newGold} gold! (${totalPts} session pts)`);
        localStorage.setItem(AWARDED_GOLD_KEY, String(goldEarned));
      } else if (alreadyAwarded === 0 && totalPts === 0) {
        addMsg('💻 Code in VS Code to earn gold here!');
      }
      saveGame(); rerender();
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Combat ────────────────────────────────────────────────────────────
  function startCombat(enemy: Enemy) {
    gs().combat = {
      enemy: { ...enemy, def: { ...enemy.def } },
      log: [`A wild ${enemy.def.name} appears!`],
      turn: 'player', defending: false, done: false, won: false,
    };
    addMsg(`⚔️ Encountered ${enemy.def.name}!`);
    rerender();
  }

  function doEnemyTurn() {
    const { player, combat } = gs();
    if (!combat || combat.done) return;
    let dmg = Math.max(1, combat.enemy.def.atk - playerDef(player) + rand(-2,3));
    if (combat.defending) { dmg = Math.floor(dmg/2); combat.defending = false; }
    player.hp = Math.max(0, player.hp - dmg);
    combat.log = [`${combat.enemy.def.name} hits for ${dmg} dmg!`, ...combat.log].slice(0, 5);
    if (player.hp <= 0) {
      combat.log = ['You were defeated...', ...combat.log].slice(0, 5);
      combat.done = true;
      setTimeout(() => {
        const g = gs();
        g.combat = null;
        g.player.hp = Math.floor(g.player.maxHp / 4);
        g.player.x = 10; g.player.y = 10; g.player.area = 'town';
        addMsg('💀 Defeated! Respawned in town with low HP.');
        saveGame(); rerender();
      }, 1400);
    } else {
      combat.turn = 'player';
    }
    rerender();
  }

  function endCombatWin() {
    const { player, combat } = gs();
    if (!combat) return;
    const gold = rand(combat.enemy.def.goldMin, combat.enemy.def.goldMax);
    const xp = combat.enemy.def.xp;
    player.gold += gold; player.xp += xp;
    combat.log = [`Victory! +${xp} XP +${gold}g`, ...combat.log].slice(0, 5);
    combat.done = true; combat.won = true;
    gs().enemies = gs().enemies.filter(e => e.uid !== combat.enemy.uid);
    gs().defeatedIds.push(combat.enemy.uid);
    while (player.xp >= player.xpNeeded) {
      player.xp -= player.xpNeeded;
      player.level++; player.xpNeeded = xpForLevel(player.level);
      player.maxHp += 15; player.maxMp += 8; player.atk += 3; player.def += 2;
      player.hp = player.maxHp; player.mp = player.maxMp;
      combat.log = [`🌟 LEVEL UP! Now Lv.${player.level}!`, ...combat.log].slice(0, 5);
      addMsg(`🌟 Level Up! You are now Level ${player.level}!`);
    }
    setTimeout(() => { gs().combat = null; addMsg(`Defeated ${combat.enemy.def.name}!`); saveGame(); rerender(); }, 1400);
    rerender();
  }

  function combatAction(action: 'attack'|'magic'|'defend'|'flee') {
    const { player, combat } = gs();
    if (!combat || combat.turn !== 'player' || combat.done) return;
    if (action === 'attack') {
      const dmg = Math.max(1, playerAtk(player) - combat.enemy.def.def + rand(-2,3));
      combat.enemy.hp = Math.max(0, combat.enemy.hp - dmg);
      combat.log = [`You strike for ${dmg} dmg!`, ...combat.log].slice(0, 5);
    } else if (action === 'magic') {
      if (player.mp < 20) { combat.log = ['Not enough MP!', ...combat.log].slice(0,5); rerender(); return; }
      player.mp = Math.max(0, player.mp - 20);
      const dmg = Math.max(2, Math.floor(playerAtk(player)*1.6) + rand(-3,4));
      combat.enemy.hp = Math.max(0, combat.enemy.hp - dmg);
      combat.log = [`✨ Magic blast: ${dmg} dmg!`, ...combat.log].slice(0, 5);
    } else if (action === 'defend') {
      combat.defending = true;
      combat.log = ['🛡 Defensive stance!', ...combat.log].slice(0, 5);
    } else if (action === 'flee') {
      if (Math.random() > 0.45) {
        combat.log = ['You fled!', ...combat.log].slice(0, 5);
        combat.done = true;
        setTimeout(() => { gs().combat = null; addMsg('Escaped!'); rerender(); }, 800);
        rerender(); return;
      } else {
        combat.log = ['Flee failed!', ...combat.log].slice(0, 5);
      }
    }
    if (combat.enemy.hp <= 0) { endCombatWin(); return; }
    combat.turn = 'enemy';
    setTimeout(doEnemyTurn, 700);
    rerender();
  }

  function useCombatItem(item: Item) {
    const { player, combat } = gs();
    if (!combat || combat.turn !== 'player' || combat.done) return;
    if (item.kind !== 'potion') return;
    if (item.healHp) player.hp = Math.min(player.maxHp, player.hp + item.healHp);
    if (item.healMp) player.mp = Math.min(player.maxMp, player.mp + item.healMp);
    combat.log = [`Used ${item.name}!`, ...combat.log].slice(0, 5);
    const idx = player.bag.findIndex(i => i.id === item.id);
    if (idx !== -1) player.bag.splice(idx, 1);
    combat.turn = 'enemy';
    setTimeout(doEnemyTurn, 700);
    rerender();
  }

  // ── Movement ──────────────────────────────────────────────────────────
  function tryMove(dx: number, dy: number) {
    const { player, combat, dialogue } = gs();
    if (combat || dialogue) return;
    const nx = player.x + dx, ny = player.y + dy;
    if (nx < 0 || nx >= GW || ny < 0 || ny >= GH) return;
    const tile = GET_TILE[player.area](nx, ny);
    if (['wall','tree','stone','water'].includes(tile)) return;

    const npc = NPCS.find(n => n.area===player.area && n.x===nx && n.y===ny);
    if (npc) { gs().dialogue = { npc, line:0, mode:'talk' }; addMsg(`💬 ${npc.name}`); rerender(); return; }

    const enemy = gs().enemies.find(e => e.area===player.area && e.x===nx && e.y===ny);
    if (enemy) { startCombat(enemy); return; }

    player.x = nx; player.y = ny;

    if (tile === 'portal') {
      const portal = PORTALS[player.area].find(p => p.x===nx && p.y===ny);
      if (portal) {
        player.area = portal.to; player.x = portal.tx; player.y = portal.ty;
        addMsg(`🌀 Entered ${AREA_NAMES[portal.to]}`);
      }
    }
    rerender();
  }

  // ── Dialogue ──────────────────────────────────────────────────────────
  function advanceDialogue() {
    const { dialogue } = gs();
    if (!dialogue) return;
    if (dialogue.mode === 'talk') {
      if (dialogue.line < dialogue.npc.lines.length - 1) {
        dialogue.line++;
      } else if (dialogue.npc.sells) {
        dialogue.mode = 'shop';
      } else if (dialogue.npc.healer) {
        dialogue.mode = 'heal';
      } else {
        gs().dialogue = null;
      }
    }
    rerender();
  }

  function buyItem(itemId: string) {
    const item = ITEMS[itemId];
    const { player } = gs();
    if (player.gold < item.price) { addMsg('Not enough gold!'); rerender(); return; }
    player.gold -= item.price;
    player.bag.push({ ...item });
    addMsg(`Bought ${item.name} (${item.price}g)`);
    saveGame(); rerender();
  }

  function healPlayer() {
    const { player, dialogue } = gs();
    if (!dialogue?.npc.healer) return;
    const cost = dialogue.npc.healer.cost;
    if (player.gold < cost) { addMsg('Not enough gold!'); rerender(); return; }
    player.gold -= cost;
    player.hp = player.maxHp; player.mp = player.maxMp;
    addMsg(`💚 Fully healed! (${cost}g)`);
    saveGame(); rerender();
  }

  function useFromBag(item: Item) {
    const { player } = gs();
    if (item.kind === 'potion') {
      if (item.healHp) player.hp = Math.min(player.maxHp, player.hp + item.healHp);
      if (item.healMp) player.mp = Math.min(player.maxMp, player.mp + item.healMp);
      const idx = player.bag.findIndex(i => i.id === item.id);
      if (idx !== -1) player.bag.splice(idx, 1);
      addMsg(`Used ${item.name}`);
    } else if (item.kind === 'weapon') {
      player.weapon = item; addMsg(`Equipped ${item.name}`);
    } else if (item.kind === 'armor') {
      player.armor = item; addMsg(`Equipped ${item.name}`);
    }
    saveGame(); rerender();
  }

  // ── Keyboard ──────────────────────────────────────────────────────────
  useEffect(() => {
    const pressed = new Set<string>();
    const onDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (pressed.has(k)) return;
      pressed.add(k);
      const { dialogue, combat, showBag } = gsRef.current;
      if (dialogue) {
        if (k === 'e' || k === 'enter' || k === ' ') advanceDialogue();
        if (k === 'escape') { gsRef.current.dialogue = null; rerender(); }
        return;
      }
      if (k === 'i') { gsRef.current.showBag = !showBag; rerender(); return; }
      if (!combat) {
        if (k === 'arrowup'    || k === 'w') { e.preventDefault(); tryMove(0,-1); }
        if (k === 'arrowdown'  || k === 's') { e.preventDefault(); tryMove(0,1); }
        if (k === 'arrowleft'  || k === 'a') { e.preventDefault(); tryMove(-1,0); }
        if (k === 'arrowright' || k === 'd') { e.preventDefault(); tryMove(1,0); }
        if (k === 'e') {
          const p = gsRef.current.player;
          const npc = NPCS.find(n =>
            n.area === p.area &&
            [{x:0,y:-1},{x:0,y:1},{x:-1,y:0},{x:1,y:0}].some(d => n.x===p.x+d.x && n.y===p.y+d.y)
          );
          if (npc) { gsRef.current.dialogue = { npc, line:0, mode:'talk' }; addMsg(`💬 ${npc.name}`); rerender(); }
        }
      }
    };
    const onUp = (e: KeyboardEvent) => pressed.delete(e.key.toLowerCase());
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    return () => { window.removeEventListener('keydown', onDown); window.removeEventListener('keyup', onUp); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Derived state for render ──────────────────────────────────────────
  const { player, combat, dialogue, showBag, msgs, enemies } = gsRef.current;
  const hpPct = player.hp / player.maxHp;
  const mpPct = player.mp / player.maxMp;
  const xpPct = player.xp / player.xpNeeded;
  const potions = player.bag.filter(i => i.kind === 'potion');
  const areaEnemies = enemies.filter(e => e.area === player.area).length;
  // Suppress unused variable lint from tick (it exists only to trigger re-renders)
  void tick;

  return (
    <div className="h-screen overflow-hidden bg-[#050810] text-white flex flex-col"
      style={{ fontFamily:'IBM Plex Mono, monospace' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap');
        * { cursor: crosshair; }
        .font-display { font-family: 'Rajdhani', sans-serif; }
        .dot-grid-game {
          background-image: radial-gradient(rgba(255,255,255,0.05) 1px, transparent 1px);
          background-size: 28px 28px;
        }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes pulseAmber { 0%,100%{opacity:1} 50%{opacity:0.5} }
        .blink { animation: blink 1s step-end infinite; }
        .pulse-amber { animation: pulseAmber 1.2s ease-in-out infinite; }
        ::-webkit-scrollbar { width: 3px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); }
        .side-card {
          background: rgba(255,255,255,0.015);
          border: 1px solid rgba(255,255,255,0.07);
          position: relative;
        }
        .side-card::before {
          content: ''; position: absolute;
          top: 0; left: 0; right: 0; height: 2px;
        }
        .side-card.c-emerald::before { background: #10b981; }
        .side-card.c-orange::before  { background: #f97316; }
        .side-card.c-violet::before  { background: #8b5cf6; }
        .side-card.c-amber::before   { background: #f59e0b; }
        .bar-track { height: 3px; background: rgba(255,255,255,0.07); }
        .bar-fill-t { height: 3px; transition: width 0.4s ease; }
        .label { font-size: 0.6rem; letter-spacing: 0.12em; color: #4b5563; }
        .combat-btn {
          font-family: 'Rajdhani', sans-serif; font-weight: 700;
          font-size: 0.8rem; letter-spacing: 0.08em;
          padding: 0.5rem; border: 1px solid; transition: opacity 0.15s;
          cursor: pointer;
        }
        .combat-btn:hover:not(:disabled) { opacity: 0.8; }
        .combat-btn:disabled { opacity: 0.3; cursor: not-allowed; }
      `}</style>

      <div className="fixed inset-0 dot-grid-game pointer-events-none" />

      {/* ── NAV BAR ── */}
      <nav className="sticky top-0 z-50 border-b border-white/[0.06] bg-[#050810]/90 backdrop-blur-md flex-shrink-0">
        <div className="mx-auto max-w-7xl px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <a href="/" className="flex items-center gap-2 group">
              <div className="w-5 h-5 border border-emerald-500/50 flex items-center justify-center">
                <span className="font-display text-emerald-400 text-[10px] font-bold leading-none">DV</span>
              </div>
              <span className="font-display font-semibold text-slate-400 group-hover:text-white text-sm tracking-widest transition-colors">DEVVERSE</span>
            </a>
            <span className="text-slate-700 text-xs">/</span>
            <a href="/dashboard" className="font-display text-slate-400 hover:text-white text-sm font-semibold tracking-wide transition-colors">Dashboard</a>
            <span className="text-slate-700 text-xs">/</span>
            <span className="font-display text-white text-sm font-semibold tracking-wide">⚔ Pixel Quest</span>
            <span className="label text-emerald-700 border border-emerald-900/50 px-1.5 py-0.5">PHASER</span>
            {codingScore !== null && (
              <div className="border border-emerald-500/25 bg-emerald-950/20 px-2 py-1 flex items-center gap-1.5"
                title="Every 50 session pts = 1 game gold">
                <span className="text-emerald-500 text-[10px]">💻</span>
                <span className="label text-emerald-600">{codingScore.toLocaleString()} pts</span>
                <span className="label text-slate-700 mx-0.5">→</span>
                <span className="label text-amber-500">🪙 {Math.floor(codingScore / 50)}g</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs text-slate-600 tracking-wider hidden lg:block">WASD — MOVE &nbsp;|&nbsp; E — TALK &nbsp;|&nbsp; I — BAG</span>
            <button onClick={() => {
              if (!confirm('Reset save?')) return;
              localStorage.removeItem(SAVE_KEY);
              localStorage.removeItem(AWARDED_GOLD_KEY);
              gsRef.current = initGS();
              setCodingScore(null);
              addMsg('Save reset.');
              rerender();
            }} className="text-xs text-slate-500 hover:text-red-400 transition-colors tracking-wider cursor-pointer">RESET</button>
          </div>
        </div>
      </nav>

      {/* ── MAIN CONTENT ── */}
      <div className="relative z-10 flex-1 flex items-center justify-center p-1 min-h-0">
        <div className="flex gap-3 items-start">

          {/* ── PHASER CANVAS + OVERLAYS ── */}
          <div className="relative flex-shrink-0 self-start"
            style={{ width: CW, height: CH, border:'1px solid rgba(255,255,255,0.1)', boxShadow:'0 0 40px rgba(16,185,129,0.07), inset 0 0 0 1px rgba(255,255,255,0.03)' }}>

            <PhaserCanvas gsRef={gsRef} />

            {/* Area + enemy badges */}
            <div className="absolute top-2 left-2 bg-[#050810]/90 border border-white/[0.08] px-2 py-1 flex items-center gap-1.5 pointer-events-none">
              <span className="label text-emerald-500 tracking-widest">📍 {AREA_NAMES[player.area].toUpperCase()}</span>
            </div>
            <div className="absolute top-2 right-2 bg-[#050810]/90 border border-white/[0.08] px-2 py-1 pointer-events-none">
              <span className="label text-red-500">{areaEnemies} ENEMIES</span>
            </div>

            {/* ── DIALOGUE: TALK ── */}
            {dialogue && dialogue.mode === 'talk' && (
              <div className="absolute bottom-0 left-0 right-0 bg-[#050810]/97 border-t border-emerald-500/40 p-4">
                <div className="flex items-start gap-3">
                  <div className="text-3xl flex-shrink-0 border border-white/[0.07] p-1 bg-white/[0.02]">{dialogue.npc.sprite}</div>
                  <div className="flex-1">
                    <div className="font-display font-bold text-emerald-400 text-sm tracking-wide mb-1">{dialogue.npc.name}</div>
                    <div className="text-slate-300 text-xs leading-relaxed">{dialogue.npc.lines[dialogue.line]}</div>
                    <div className="label text-slate-600 mt-2 blink">
                      {dialogue.line < dialogue.npc.lines.length - 1 ? '▶ PRESS E TO CONTINUE'
                        : dialogue.npc.sells ? '▶ PRESS E FOR SHOP'
                        : dialogue.npc.healer ? '▶ PRESS E TO HEAL'
                        : '▶ PRESS E OR ESC TO CLOSE'}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── DIALOGUE: SHOP ── */}
            {dialogue && dialogue.mode === 'shop' && (
              <div className="absolute bottom-0 left-0 right-0 bg-[#050810]/97 border-t border-amber-500/40 p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-display font-bold text-amber-400 text-sm tracking-wide">{dialogue.npc.sprite} {dialogue.npc.name}</span>
                    <span className="label text-slate-600">— SHOP</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="label text-amber-500">🪙 {player.gold}g available</span>
                    <button onClick={() => { gsRef.current.dialogue = null; rerender(); }}
                      className="label text-slate-600 hover:text-white cursor-pointer transition">✕ ESC</button>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {(dialogue.npc.sells ?? []).map(id => {
                    const item = ITEMS[id];
                    const canAfford = player.gold >= item.price;
                    return (
                      <button key={id} onClick={() => buyItem(id)} disabled={!canAfford}
                        className={`p-2 text-xs text-left border transition ${canAfford
                          ? 'border-amber-600/40 bg-amber-950/20 hover:bg-amber-950/40 cursor-pointer'
                          : 'border-white/[0.05] bg-white/[0.01] opacity-40 cursor-not-allowed'}`}>
                        <div className="text-xl leading-none mb-1.5">{item.icon}</div>
                        <div className="font-display font-semibold text-slate-200 text-xs tracking-wide">{item.name}</div>
                        <div className="label text-slate-500 mt-0.5">{item.desc}</div>
                        <div className={`font-display font-bold mt-1.5 text-sm ${canAfford ? 'text-amber-400' : 'text-slate-600'}`}>{item.price}g</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── DIALOGUE: HEAL ── */}
            {dialogue && dialogue.mode === 'heal' && (
              <div className="absolute bottom-0 left-0 right-0 bg-[#050810]/97 border-t border-emerald-500/40 p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-display font-bold text-emerald-400 text-sm tracking-wide">{dialogue.npc.sprite} {dialogue.npc.name}</span>
                  <button onClick={() => { gsRef.current.dialogue = null; rerender(); }}
                    className="label text-slate-600 hover:text-white cursor-pointer transition">✕ ESC</button>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-xs">
                    <div className="label text-slate-600 mb-1">CURRENT STATUS</div>
                    <div className="text-red-400">HP {player.hp} / {player.maxHp}</div>
                    <div className="text-sky-400">MP {player.mp} / {player.maxMp}</div>
                  </div>
                  <button onClick={healPlayer} disabled={player.gold < (dialogue.npc.healer?.cost ?? 0)}
                    className="combat-btn border-emerald-500/60 text-emerald-400 bg-emerald-950/30 px-5">
                    💚 FULL HEAL — {dialogue.npc.healer?.cost}g
                  </button>
                  <div className="label text-amber-500">🪙 {player.gold}g</div>
                </div>
              </div>
            )}

            {/* ── COMBAT OVERLAY ── */}
            {combat && (
              <div className="absolute inset-0 flex flex-col" style={{ background:'rgba(5,8,16,0.92)' }}>
                <div className="flex-1 flex flex-col items-center justify-center gap-3 p-6">
                  <div className="text-6xl">{combat.enemy.def.sprite}</div>
                  <div className="font-display font-bold text-white text-2xl tracking-wide">{combat.enemy.def.name}</div>
                  <div className="w-56">
                    <div className="flex justify-between mb-1">
                      <span className="label text-red-500">HP</span>
                      <span className="label text-red-400">{combat.enemy.hp} / {combat.enemy.def.hp}</span>
                    </div>
                    <div className="bar-track w-full">
                      <div className="bar-fill-t bg-red-500"
                        style={{ width:`${Math.max(0, combat.enemy.hp / combat.enemy.def.hp * 100)}%` }} />
                    </div>
                  </div>
                  <div className="flex gap-4 mt-1 border border-white/[0.06] bg-white/[0.02] px-4 py-2">
                    {[{l:'YOUR HP',c:'text-red-400',v:`${player.hp}/${player.maxHp}`},
                      {l:'MP',c:'text-sky-400',v:`${player.mp}/${player.maxMp}`},
                      {l:'ATK',c:'text-orange-400',v:`${playerAtk(player)}`}].map(s=>(
                      <div key={s.l} className="text-center">
                        <div className="label text-red-500">{s.l}</div>
                        <div className={`font-display font-bold text-sm ${s.c}`}>{s.v}</div>
                      </div>
                    ))}
                  </div>
                  <div className="w-72 border border-white/[0.06] bg-white/[0.02] p-2">
                    {combat.log.slice(0,3).map((line,i)=>(
                      <div key={i} className={`text-xs ${i===0?'text-amber-300':'text-slate-600'} leading-relaxed`}>{line}</div>
                    ))}
                  </div>
                </div>

                {combat.turn === 'player' && !combat.done && (
                  <div className="border-t border-white/[0.07] bg-[#050810]/80 p-3">
                    <div className="grid grid-cols-4 gap-2 mb-2">
                      <button onClick={() => combatAction('attack')}
                        className="combat-btn border-red-500/60 text-red-400 bg-red-950/30">⚔ ATTACK</button>
                      <button onClick={() => combatAction('magic')} disabled={player.mp < 20}
                        className="combat-btn border-sky-500/60 text-sky-400 bg-sky-950/30">
                        ✨ MAGIC<br/><span className="text-sky-700 text-[10px]">20 MP</span>
                      </button>
                      <button onClick={() => combatAction('defend')}
                        className="combat-btn border-amber-500/60 text-amber-400 bg-amber-950/30">🛡 DEFEND</button>
                      <button onClick={() => combatAction('flee')}
                        className="combat-btn border-white/[0.1] text-slate-400 bg-white/[0.02]">🏃 FLEE</button>
                    </div>
                    {potions.length > 0 && (
                      <div className="flex gap-1.5 items-center">
                        <span className="label text-slate-600">ITEMS</span>
                        {potions.slice(0,4).map((item,i)=>(
                          <button key={`${item.id}-${i}`} onClick={() => useCombatItem(item)}
                            title={item.desc}
                            className="combat-btn border-violet-500/40 text-violet-400 bg-violet-950/20 text-[10px] px-2 py-1">
                            {item.icon}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                {combat.turn === 'enemy' && !combat.done && (
                  <div className="border-t border-white/[0.07] p-3 text-center">
                    <span className="label text-amber-500 pulse-amber">{combat.enemy.def.name.toUpperCase()} IS ACTING...</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── RIGHT SIDEBAR ── */}
          <div className="flex flex-col gap-2 w-52 overflow-y-auto flex-shrink-0" style={{ maxHeight: CH }}>

            {/* Player stats */}
            <div className="side-card c-emerald p-3">
              <div className="flex items-center justify-between mb-3">
                <span className="font-display font-bold text-white text-sm tracking-wide">HERO</span>
                <span className="font-display font-bold text-emerald-400 text-sm">LV.{player.level}</span>
              </div>
              {[
                { label:'HP', pct:hpPct, val:`${player.hp}/${player.maxHp}`, tc:'text-red-500', vc:'text-red-400',
                  bg: hpPct>0.5?'#ef4444':hpPct>0.25?'#f97316':'#dc2626' },
                { label:'MP', pct:mpPct, val:`${player.mp}/${player.maxMp}`, tc:'text-sky-500', vc:'text-sky-400', bg:'#0ea5e9' },
                { label:'XP', pct:xpPct, val:`${player.xp}/${player.xpNeeded}`, tc:'text-violet-500', vc:'text-violet-400', bg:'#8b5cf6' },
              ].map(row => (
                <div key={row.label} className="mb-2 last:mb-3">
                  <div className="flex justify-between mb-1">
                    <span className={`label ${row.tc}`}>{row.label}</span>
                    <span className={`label ${row.vc}`}>{row.val}</span>
                  </div>
                  <div className="bar-track">
                    <div className="bar-fill-t" style={{ width:`${row.pct*100}%`, background:row.bg }} />
                  </div>
                </div>
              ))}
              <div className="grid grid-cols-3 gap-1">
                {[
                  { l:'ATK', v:playerAtk(player), c:'text-orange-400' },
                  { l:'DEF', v:playerDef(player), c:'text-sky-400' },
                  { l:'GOLD', v:player.gold,       c:'text-amber-400' },
                ].map(s => (
                  <div key={s.l} className="bg-white/[0.03] border border-white/[0.05] py-1.5 text-center">
                    <div className="label text-slate-600">{s.l}</div>
                    <div className={`font-display font-bold text-sm ${s.c}`}>{s.v}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Equipment */}
            <div className="side-card c-orange p-3">
              <div className="label text-slate-500 mb-2">EQUIPMENT</div>
              {[
                { label:'WEAPON', item:player.weapon, color:'text-orange-400' },
                { label:'ARMOR',  item:player.armor,  color:'text-sky-400' },
              ].map(row => (
                <div key={row.label} className="flex items-center gap-2 bg-white/[0.03] border border-white/[0.05] p-1.5 mb-1 last:mb-0">
                  <span className="label text-slate-600 w-12">{row.label}</span>
                  {row.item
                    ? <><span className="text-base leading-none">{row.item.icon}</span>
                       <span className={`text-xs ${row.color}`}>{row.item.name}</span></>
                    : <span className="text-xs text-slate-700 italic">— unequipped</span>}
                </div>
              ))}
            </div>

            {/* Bag — no overflow-hidden (it clipped the list). Item list scrolls inside a capped region. */}
            <div className="side-card c-violet flex flex-col min-h-0">
              <button onClick={() => { gsRef.current.showBag = !showBag; rerender(); }}
                className="w-full p-2.5 flex items-center justify-between hover:bg-white/[0.03] transition cursor-pointer flex-shrink-0">
                <span className="label text-slate-400">BAG ({player.bag.length} items)</span>
                <span className="label text-slate-600">{showBag ? '▲' : '▼'}</span>
              </button>
              {showBag && (
                <div className="border-t border-white/[0.06] max-h-[min(280px,45vh)] overflow-y-auto overscroll-contain">
                  {player.bag.length === 0
                    ? <p className="text-xs text-slate-700 italic p-2.5">Empty</p>
                    : player.bag.map((item, i) => (
                      <div key={`${item.id}-${i}`} onClick={() => useFromBag(item)}
                        className="flex items-center gap-2 p-2 hover:bg-white/[0.03] cursor-pointer border-b border-white/[0.04] last:border-0 transition">
                        <span className="text-base leading-none flex-shrink-0">{item.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs text-slate-200 truncate">{item.name}</div>
                          <div className="label text-slate-600 truncate">{item.desc}</div>
                        </div>
                        <span className="label text-emerald-600 flex-shrink-0">{item.kind==='potion'?'USE':'EQP'}</span>
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* Activity log */}
            <div className="side-card c-amber p-3 flex-1">
              <div className="label text-slate-600 mb-2">ACTIVITY LOG</div>
              <div className="space-y-1">
                {msgs.slice(0,8).map((msg,i)=>(
                  <div key={i} className={`text-[11px] leading-relaxed ${i===0?'text-slate-300':'text-slate-700'}`}>{msg}</div>
                ))}
              </div>
            </div>

            <div className="label text-slate-700 text-center pb-1">A DEVVERSE PIXEL RPG</div>
          </div>
        </div>
      </div>
    </div>
  );
}
