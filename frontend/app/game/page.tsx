'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════
const TS = 52, GW = 20, GH = 15;
const CW = TS * GW, CH = TS * GH;

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════
type AreaId = 'town' | 'forest' | 'dungeon';

interface Item {
  id: string; name: string; icon: string;
  kind: 'potion' | 'weapon' | 'armor';
  desc: string; price: number;
  healHp?: number; healMp?: number;
  atkBonus?: number; defBonus?: number;
}
interface EnemyDef {
  id: string; name: string; sprite: string;
  hp: number; atk: number; def: number;
  xp: number; goldMin: number; goldMax: number;
}
interface Enemy { uid: string; def: EnemyDef; hp: number; x: number; y: number; area: AreaId; }
interface NPC {
  id: string; name: string; sprite: string;
  x: number; y: number; area: AreaId;
  lines: string[]; sells?: string[]; healer?: { cost: number };
}
interface Portal { x: number; y: number; to: AreaId; tx: number; ty: number; label: string; }
interface Player {
  x: number; y: number; area: AreaId;
  hp: number; maxHp: number; mp: number; maxMp: number;
  atk: number; def: number;
  level: number; xp: number; xpNeeded: number; gold: number;
  bag: Item[]; weapon: Item | null; armor: Item | null;
}
interface Combat {
  enemy: Enemy; log: string[];
  turn: 'player' | 'enemy'; defending: boolean;
  done: boolean; won: boolean;
}
interface Dialogue { npc: NPC; line: number; mode: 'talk' | 'shop' | 'heal'; }
interface GS {
  player: Player; enemies: Enemy[];
  combat: Combat | null; dialogue: Dialogue | null;
  showBag: boolean; msgs: string[]; defeatedIds: string[];
}

// ═══════════════════════════════════════════════════════════════════════════
// ITEM DATABASE
// ═══════════════════════════════════════════════════════════════════════════
const ITEMS: Record<string, Item> = {
  potion:       { id:'potion',       name:'Health Potion',  icon:'🧪', kind:'potion',  desc:'Restores 50 HP',        price:20,  healHp:50 },
  hi_potion:    { id:'hi_potion',    name:'Hi-Potion',      icon:'💉', kind:'potion',  desc:'Restores 120 HP',       price:60,  healHp:120 },
  elixir:       { id:'elixir',       name:'Elixir',         icon:'✨', kind:'potion',  desc:'Full HP & MP restore',  price:200, healHp:9999, healMp:9999 },
  mana_potion:  { id:'mana_potion',  name:'Mana Potion',    icon:'🔵', kind:'potion',  desc:'Restores 40 MP',        price:25,  healMp:40 },
  iron_sword:   { id:'iron_sword',   name:'Iron Sword',     icon:'⚔️', kind:'weapon', desc:'ATK +8',                price:50,  atkBonus:8 },
  steel_sword:  { id:'steel_sword',  name:'Steel Sword',    icon:'🗡️', kind:'weapon', desc:'ATK +18',               price:150, atkBonus:18 },
  shadow_blade: { id:'shadow_blade', name:'Shadow Blade',   icon:'🌑', kind:'weapon', desc:'ATK +30',               price:380, atkBonus:30 },
  leather:      { id:'leather',      name:'Leather Armor',  icon:'🛡️', kind:'armor',  desc:'DEF +6',                price:45,  defBonus:6 },
  chain:        { id:'chain',        name:'Chain Mail',     icon:'🔗', kind:'armor',  desc:'DEF +14',               price:140, defBonus:14 },
  plate:        { id:'plate',        name:'Plate Armor',    icon:'🏰', kind:'armor',  desc:'DEF +25',               price:320, defBonus:25 },
};

// ═══════════════════════════════════════════════════════════════════════════
// ENEMY DATABASE
// ═══════════════════════════════════════════════════════════════════════════
const ENEMY_DEFS: Record<string, EnemyDef> = {
  slime:    { id:'slime',    name:'Slime',        sprite:'🟢', hp:20,  atk:5,  def:0,  xp:10,  goldMin:2,   goldMax:6   },
  wolf:     { id:'wolf',     name:'Forest Wolf',  sprite:'🐺', hp:50,  atk:13, def:3,  xp:28,  goldMin:5,   goldMax:14  },
  goblin:   { id:'goblin',   name:'Goblin',       sprite:'👺', hp:65,  atk:17, def:6,  xp:38,  goldMin:10,  goldMax:22  },
  skeleton: { id:'skeleton', name:'Skeleton',     sprite:'💀', hp:95,  atk:24, def:9,  xp:65,  goldMin:18,  goldMax:38  },
  orc:      { id:'orc',      name:'Dark Orc',     sprite:'👹', hp:140, atk:32, def:15, xp:95,  goldMin:28,  goldMax:58  },
  dragon:   { id:'dragon',   name:'Cave Dragon',  sprite:'🐉', hp:280, atk:55, def:24, xp:350, goldMin:120, goldMax:220 },
};

// ═══════════════════════════════════════════════════════════════════════════
// NPC DATABASE
// ═══════════════════════════════════════════════════════════════════════════
const NPCS: NPC[] = [
  {
    id:'elder', name:'Elder Aldric', sprite:'👴', x:4, y:7, area:'town',
    lines:[
      'Welcome, young hero! Monsters have overrun our lands.',
      'The Grimwood Forest to the east is infested with wolves and goblins.',
      'Deeper still lies the Dark Dungeon — home to skeletons, orcs, and worse.',
      'Speak to Merchant Kira and Thoin the Smith to gear up before venturing out.',
      'Defeat the Cave Dragon in the Dungeon\'s depths, and you will be a legend.',
    ],
  },
  {
    id:'merchant', name:'Merchant Kira', sprite:'🧝', x:14, y:4, area:'town',
    lines:['Fine goods for a brave soul! Browse my wares and spend wisely.'],
    sells:['potion','mana_potion','iron_sword','leather'],
  },
  {
    id:'blacksmith', name:'Thoin the Smith', sprite:'⚒️', x:14, y:9, area:'town',
    lines:['I forge the finest blades and armor. The strong deserve the best.'],
    sells:['hi_potion','elixir','steel_sword','shadow_blade','chain','plate'],
  },
  {
    id:'healer', name:'Sister Mira', sprite:'💚', x:5, y:3, area:'town',
    lines:['The Goddess of Light blesses this place. I can restore you — for 30 gold.'],
    healer:{ cost:30 },
  },
  {
    id:'scout', name:'Scout Edlyn', sprite:'🏹', x:10, y:8, area:'forest',
    lines:[
      'The forest is crawling with wolves and goblins. Stay alert.',
      'The Dungeon entrance is northeast, past the dark thicket.',
      'Equip yourself well before going underground. It\'s far more dangerous.',
    ],
  },
  {
    id:'ghost', name:'Lost Spirit', sprite:'👻', x:7, y:7, area:'dungeon',
    lines:[
      'Turn back... the darkness here consumes all who enter.',
      'The Dragon sleeps deep below. Few have ever returned from its chamber.',
      'Use every trick you have — magic, defense, potions. Do not hold back.',
    ],
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// MAP DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════
const PORTALS: Record<AreaId, Portal[]> = {
  town:    [{ x:3, y:12, to:'forest',  tx:3,  ty:2,  label:'🌲Forest' }, { x:16, y:12, to:'dungeon', tx:3,  ty:2,  label:'⚔Dungeon' }],
  forest:  [{ x:2, y:13, to:'town',    tx:3,  ty:12, label:'🏘Town'   }, { x:17, y:2,  to:'dungeon', tx:3,  ty:2,  label:'⚔Dungeon' }],
  dungeon: [{ x:2, y:13, to:'town',    tx:16, ty:12, label:'🏘Town'   }, { x:17, y:13, to:'forest',  tx:17, ty:2,  label:'🌲Forest' }],
};

function buildSets(coords: string[]): Set<string> { return new Set(coords); }

const TOWN_WALLS = buildSets([
  ...[...Array(GW)].map((_,i)=>`${i},0`), ...[...Array(GW)].map((_,i)=>`${i},${GH-1}`),
  ...[...Array(GH)].map((_,i)=>`0,${i}`), ...[...Array(GH)].map((_,i)=>`${GW-1},${i}`),
  '7,3','8,3','9,3','7,4','9,4','7,5','8,5','9,5',
  '11,3','12,3','13,3','11,4','13,4','11,5','12,5','13,5',
  '15,8','16,8','17,8','15,9','17,9','15,10','16,10','17,10',
]);
const TOWN_WATER = buildSets(['10,8','11,8','10,9']);

const FOREST_TREES = buildSets([
  ...[...Array(GW)].map((_,i)=>`${i},0`), ...[...Array(GW)].map((_,i)=>`${i},${GH-1}`),
  ...[...Array(GH)].map((_,i)=>`0,${i}`), ...[...Array(GH)].map((_,i)=>`${GW-1},${i}`),
  '3,2','4,2','8,2','9,2','14,2','15,2',
  '2,4','3,4','9,4','10,4','15,4','16,4',
  '3,6','6,6','7,6','13,6','14,6','16,6',
  '2,8','3,9','4,9','13,8','14,8','17,8',
  '3,11','4,11','9,11','13,11','14,11','15,11',
]);
const FOREST_WATER = buildSets(['5,5','6,5','7,5','6,6','7,6']);

const DUNGEON_WALLS = buildSets([
  ...[...Array(GW)].map((_,i)=>`${i},0`), ...[...Array(GW)].map((_,i)=>`${i},${GH-1}`),
  ...[...Array(GH)].map((_,i)=>`0,${i}`), ...[...Array(GH)].map((_,i)=>`${GW-1},${i}`),
  '3,2','4,2','5,2','6,2','3,3','6,3','3,4','4,4','5,4','6,4',
  '10,2','11,2','12,2','13,2','10,3','13,3','10,4','11,4','12,4','13,4',
  '2,7','3,7','4,7','5,7','6,7','2,8','6,8','2,9','3,9','4,9','5,9','6,9',
  '13,7','14,7','15,7','16,7','13,8','16,8','13,9','14,9','15,9','16,9',
]);

type TileKind = 'grass'|'wall'|'tree'|'water'|'stone'|'dungeon'|'portal';

function getTownTile(x: number, y: number): TileKind {
  if (TOWN_WALLS.has(`${x},${y}`)) return 'wall';
  if (TOWN_WATER.has(`${x},${y}`)) return 'water';
  if (PORTALS.town.some(p => p.x===x && p.y===y)) return 'portal';
  return 'grass';
}
function getForestTile(x: number, y: number): TileKind {
  if (FOREST_TREES.has(`${x},${y}`)) return 'tree';
  if (FOREST_WATER.has(`${x},${y}`)) return 'water';
  if (PORTALS.forest.some(p => p.x===x && p.y===y)) return 'portal';
  return 'grass';
}
function getDungeonTile(x: number, y: number): TileKind {
  if (DUNGEON_WALLS.has(`${x},${y}`)) return 'stone';
  if (PORTALS.dungeon.some(p => p.x===x && p.y===y)) return 'portal';
  return 'dungeon';
}

const GET_TILE: Record<AreaId, (x:number,y:number)=>TileKind> = {
  town: getTownTile, forest: getForestTile, dungeon: getDungeonTile,
};

const AREA_NAMES: Record<AreaId, string> = {
  town: 'Silvergate Town', forest: 'Grimwood Forest', dungeon: 'The Dark Dungeon',
};
const ENEMY_POOL: Record<AreaId, string[]> = {
  town: ['slime'], forest: ['wolf','goblin'], dungeon: ['skeleton','orc','dragon'],
};
const ENEMY_COUNT: Record<AreaId, number> = { town: 2, forest: 7, dungeon: 9 };

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════
function rand(min: number, max: number) { return Math.floor(Math.random()*(max-min+1))+min; }

function spawnEnemies(area: AreaId): Enemy[] {
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

function playerAtk(p: Player) { return p.atk + (p.weapon?.atkBonus ?? 0); }
function playerDef(p: Player) { return p.def + (p.armor?.defBonus ?? 0); }
function xpForLevel(lvl: number) { return lvl * lvl * 20; }

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

// ═══════════════════════════════════════════════════════════════════════════
// CANVAS DRAWING
// ═══════════════════════════════════════════════════════════════════════════
const TC: Record<TileKind, [string, string]> = {
  grass:   ['#2d5a16','#3a7a1a'],
  wall:    ['#4a4a6a','#5a5a7a'],
  tree:    ['#1a4a0a','#256010'],
  water:   ['#1a4a9a','#2060c0'],
  stone:   ['#3a3a5a','#4a4a6a'],
  dungeon: ['#12121e','#1a1a30'],
  portal:  ['#b8860b','#ffd700'],
};

function drawTile(ctx: CanvasRenderingContext2D, x: number, y: number, tile: TileKind) {
  const px = x*TS, py = y*TS;
  const [base, accent] = TC[tile];
  ctx.fillStyle = base;
  ctx.fillRect(px, py, TS, TS);
  if (tile === 'grass') {
    ctx.fillStyle = accent;
    ctx.fillRect(px+4, py+6, 3, 3);
    ctx.fillRect(px+18, py+22, 3, 3);
    ctx.fillRect(px+30, py+12, 3, 3);
  } else if (tile === 'dungeon') {
    ctx.strokeStyle = accent;
    ctx.lineWidth = 1;
    ctx.strokeRect(px+1, py+1, TS-2, TS-2);
  } else if (tile === 'portal') {
    ctx.fillStyle = accent;
    ctx.fillRect(px+5, py+5, TS-10, TS-10);
  } else if (tile === 'water') {
    ctx.fillStyle = accent;
    ctx.fillRect(px+2, py+9, TS-4, 5);
    ctx.fillRect(px+2, py+22, TS-4, 5);
  } else if (tile === 'stone' || tile === 'wall') {
    ctx.strokeStyle = accent;
    ctx.lineWidth = 1;
    ctx.strokeRect(px, py, TS, TS);
    ctx.strokeRect(px+3, py+3, TS-6, TS-6);
  } else if (tile === 'tree') {
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.arc(px+TS/2, py+TS/2-2, TS/3, 0, Math.PI*2);
    ctx.fill();
  }
}

function drawCanvas(ctx: CanvasRenderingContext2D, gs: GS) {
  const { player, enemies } = gs;
  ctx.fillStyle = player.area === 'dungeon' ? '#080810' : '#0a120a';
  ctx.fillRect(0, 0, CW, CH);

  // Tiles
  for (let y = 0; y < GH; y++)
    for (let x = 0; x < GW; x++)
      drawTile(ctx, x, y, GET_TILE[player.area](x, y));

  // Portal labels
  ctx.font = `bold ${Math.round(TS/5.5)}px monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  PORTALS[player.area].forEach(p => {
    ctx.fillStyle = '#000';
    ctx.fillText(p.label, p.x*TS+TS/2, p.y*TS+TS/2);
  });

  // NPCs
  NPCS.filter(n => n.area === player.area).forEach(npc => {
    const px = npc.x*TS, py = npc.y*TS;
    ctx.fillStyle = '#1a3a5a';
    ctx.fillRect(px+3, py+3, TS-6, TS-6);
    ctx.font = `${TS-14}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(npc.sprite, px+TS/2, py+TS/2);
    ctx.font = `bold ${Math.round(TS/6)}px monospace`;
    ctx.fillStyle = '#adf';
    ctx.fillText(npc.name.split(' ')[0], px+TS/2, py-5);
  });

  // Enemies
  enemies.filter(e => e.area === player.area).forEach(enemy => {
    const px = enemy.x*TS, py = enemy.y*TS;
    ctx.fillStyle = '#500';
    ctx.fillRect(px+2, py+2, TS-4, 5);
    ctx.fillStyle = '#f44';
    ctx.fillRect(px+2, py+2, Math.floor((TS-4)*enemy.hp/enemy.def.hp), 5);
    ctx.font = `${TS-14}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(enemy.def.sprite, px+TS/2, py+TS/2+3);
  });

  // Player
  const px = player.x*TS, py = player.y*TS;
  const ts8 = Math.round(TS*0.18), ts16 = ts8*2;
  const headY = Math.round(TS*0.15), bodyY = Math.round(TS*0.32);
  const eyeOff = Math.round(TS*0.27), eyeOff2 = Math.round(TS*0.41);
  const eyeY = headY + Math.round(TS*0.05);
  const eyeS = Math.max(2, Math.round(TS*0.06));
  ctx.fillStyle = '#7a4a2a';
  ctx.fillRect(px+4, py+4, TS-8, TS-8);
  ctx.fillStyle = '#ff6b35';
  ctx.fillRect(px+ts8, py+bodyY, TS-ts16, Math.round(TS*0.27));
  ctx.fillStyle = '#f4a79e';
  ctx.fillRect(px+ts8+Math.round(TS*0.045), py+headY, TS-ts16-Math.round(TS*0.09), Math.round(TS*0.23));
  ctx.fillStyle = '#000';
  ctx.fillRect(px+eyeOff, py+eyeY, eyeS, eyeS);
  ctx.fillRect(px+eyeOff2, py+eyeY, eyeS, eyeS);
  if (player.weapon) {
    ctx.font = `${Math.round(TS/4)}px serif`;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';
    ctx.fillText(player.weapon.icon, px+TS-2, py+2);
  }

  // Subtle grid
  ctx.strokeStyle = 'rgba(255,255,255,0.025)';
  ctx.lineWidth = 1;
  for (let x = 0; x <= GW; x++) { ctx.beginPath(); ctx.moveTo(x*TS,0); ctx.lineTo(x*TS,CH); ctx.stroke(); }
  for (let y = 0; y <= GH; y++) { ctx.beginPath(); ctx.moveTo(0,y*TS); ctx.lineTo(CW,y*TS); ctx.stroke(); }
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL?.replace('backend:8080', 'localhost:8080') ?? 'http://localhost:8080';
const SAVE_KEY = 'devverse.game';
const CLAIMED_KEY = 'devverse.game.claimedScore';

// TODO 1.7 #1: Replace the flat /stats/:id score poll with a call to the new
// GET /users/:id/activity?days=30 endpoint (Phase 1.5 #6). Sum the Points field
// across all DailyActivity rows to get total session-weighted points, then use
// that value for the gold conversion below instead of the raw edit count.
// Remove CLAIMED_KEY and its localStorage bookkeeping once this is in place —
// the backend deduplicates via the Sessions table, so double-awarding is impossible.

export default function GamePage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gsRef = useRef<GS>(initGS());
  const [tick, setTick] = useState(0);
  const [codingScore, setCodingScore] = useState<number | null>(null);
  const rerender = useCallback(() => setTick(n => n+1), []);

  function gs() { return gsRef.current; }

  function addMsg(msg: string) {
    gsRef.current.msgs = [msg, ...gsRef.current.msgs].slice(0, 10);
  }

  function saveGame() {
    const { player, enemies, defeatedIds, msgs } = gsRef.current;
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({ player, enemies, defeatedIds, msgs }));
    } catch { /* storage full – ignore */ }
  }

  // ── INIT: load saved game + claim coding gold ─────────────────────────
  useEffect(() => {
    // Restore saved game state
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as Partial<GS>;
        if (saved.player)      gsRef.current.player      = saved.player;
        if (saved.enemies)     gsRef.current.enemies     = saved.enemies;
        if (saved.defeatedIds) gsRef.current.defeatedIds = saved.defeatedIds;
        if (saved.msgs)        gsRef.current.msgs        = saved.msgs;
      }
    } catch { /* corrupted save – use fresh state */ }

    // Claim coding-score gold
    const userId = localStorage.getItem('devverse.userId') ?? '';
    const claimedBefore = parseInt(localStorage.getItem(CLAIMED_KEY) ?? '0', 10);

    const fetchAndAward = async () => {
      let score = claimedBefore;
      try {
        const res = await fetch(`${BACKEND_URL}/stats/${userId}`);
        if (res.ok) score = ((await res.json()) as { score: number }).score ?? claimedBefore;
      } catch { /* backend offline – no bonus */ }

      setCodingScore(score);
      // TODO 1.7 #2: Change the divisor from 20 (raw edit count) to 50 (weighted session
      // points) once Phase 1.5 activity endpoint is live: Math.floor(newPoints / 50).
      // The message should also reflect the new unit: "+Xg from Y session pts" rather
      // than "Y new edits".
      const newGold = Math.floor(Math.max(0, score - claimedBefore) / 20);
      if (newGold > 0) {
        gsRef.current.player.gold += newGold;
        addMsg(`💻 Coding reward: +${newGold} gold! (${score - claimedBefore} new edits)`);
        localStorage.setItem(CLAIMED_KEY, String(score));
      } else if (claimedBefore === 0 && score === 0) {
        addMsg('💻 Code in VS Code to earn gold here!');
      }
      saveGame();
      rerender();
    };

    fetchAndAward();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── COMBAT ──────────────────────────────────────────────────────────────
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
    const def = playerDef(player);
    let dmg = Math.max(1, combat.enemy.def.atk - def + rand(-2,3));
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
        saveGame();
        rerender();
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
    player.gold += gold;
    player.xp += xp;
    combat.log = [`Victory! +${xp} XP +${gold}g`, ...combat.log].slice(0, 5);
    combat.done = true; combat.won = true;
    gs().enemies = gs().enemies.filter(e => e.uid !== combat.enemy.uid);
    gs().defeatedIds.push(combat.enemy.uid);
    while (player.xp >= player.xpNeeded) {
      player.xp -= player.xpNeeded;
      player.level++;
      player.xpNeeded = xpForLevel(player.level);
      player.maxHp += 15; player.maxMp += 8;
      player.atk += 3; player.def += 2;
      player.hp = player.maxHp; player.mp = player.maxMp;
      combat.log = [`🌟 LEVEL UP! Now Lv.${player.level}!`, ...combat.log].slice(0, 5);
      addMsg(`🌟 Level Up! You are now Level ${player.level}!`);
    }
    setTimeout(() => { gs().combat = null; addMsg(`Defeated ${combat.enemy.def.name}!`); saveGame(); rerender(); }, 1400);
    rerender();
  }

  function combatAction(action: 'attack'|'magic'|'defend'|'flee', item?: Item) {
    const { player, combat } = gs();
    if (!combat || combat.turn !== 'player' || combat.done) return;

    if (action === 'attack') {
      const atk = playerAtk(player);
      const dmg = Math.max(1, atk - combat.enemy.def.def + rand(-2,3));
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
    } else if (action === 'attack' && item) {
      // handled below
    }

    if (item && item.kind === 'potion') {
      if (item.healHp) { player.hp = Math.min(player.maxHp, player.hp + item.healHp); }
      if (item.healMp) { player.mp = Math.min(player.maxMp, player.mp + item.healMp); }
      combat.log = [`Used ${item.name}!`, ...combat.log].slice(0, 5);
      const idx = player.bag.findIndex(i => i.id === item.id);
      if (idx !== -1) player.bag.splice(idx, 1);
      combat.turn = 'enemy';
      setTimeout(doEnemyTurn, 700);
      rerender(); return;
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

  // ── MOVEMENT ────────────────────────────────────────────────────────────
  function tryMove(dx: number, dy: number) {
    const { player, combat, dialogue } = gs();
    if (combat || dialogue) return;
    const nx = player.x + dx, ny = player.y + dy;
    if (nx < 0 || nx >= GW || ny < 0 || ny >= GH) return;
    const tile = GET_TILE[player.area](nx, ny);
    if (['wall','tree','stone','water'].includes(tile)) return;

    const npc = NPCS.find(n => n.area===player.area && n.x===nx && n.y===ny);
    if (npc) {
      gs().dialogue = { npc, line:0, mode:'talk' };
      addMsg(`💬 ${npc.name}`);
      rerender(); return;
    }

    const enemy = gs().enemies.find(e => e.area===player.area && e.x===nx && e.y===ny);
    if (enemy) { startCombat(enemy); return; }

    player.x = nx; player.y = ny;

    if (tile === 'portal') {
      const portal = PORTALS[player.area].find(p => p.x===nx && p.y===ny);
      if (portal) {
        player.area = portal.to;
        player.x = portal.tx; player.y = portal.ty;
        addMsg(`🌀 Entered ${AREA_NAMES[portal.to]}`);
      }
    }
    rerender();
  }

  // ── DIALOGUE ────────────────────────────────────────────────────────────
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
    saveGame();
    rerender();
  }

  function healPlayer() {
    const { player, dialogue } = gs();
    if (!dialogue?.npc.healer) return;
    const cost = dialogue.npc.healer.cost;
    if (player.gold < cost) { addMsg('Not enough gold!'); rerender(); return; }
    player.gold -= cost;
    player.hp = player.maxHp; player.mp = player.maxMp;
    addMsg(`💚 Fully healed! (${cost}g)`);
    saveGame();
    rerender();
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
      player.weapon = item;
      addMsg(`Equipped ${item.name}`);
    } else if (item.kind === 'armor') {
      player.armor = item;
      addMsg(`Equipped ${item.name}`);
    }
    saveGame();
    rerender();
  }

  // ── KEYBOARD ────────────────────────────────────────────────────────────
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
        // E — interact with adjacent NPC
        if (k === 'e') {
          const { player: p } = gsRef.current;
          const dirs = [{x:0,y:-1},{x:0,y:1},{x:-1,y:0},{x:1,y:0}];
          const npc = NPCS.find(n =>
            n.area === p.area &&
            dirs.some(d => n.x === p.x + d.x && n.y === p.y + d.y)
          );
          if (npc) {
            gsRef.current.dialogue = { npc, line:0, mode:'talk' };
            addMsg(`💬 ${npc.name}`);
            rerender();
          }
        }
      }
    };
    const onUp = (e: KeyboardEvent) => pressed.delete(e.key.toLowerCase());
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    return () => { window.removeEventListener('keydown', onDown); window.removeEventListener('keyup', onUp); };
  }, []);

  // ── CANVAS RENDER ───────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    drawCanvas(ctx, gsRef.current);
  });

  // ── RENDER ───────────────────────────────────────────────────────────────
  const { player, combat, dialogue, showBag, msgs, enemies } = gsRef.current;
  const hpPct = player.hp / player.maxHp;
  const mpPct = player.mp / player.maxMp;
  const xpPct = player.xp / player.xpNeeded;
  const potions = player.bag.filter(i => i.kind === 'potion');
  const areaEnemies = enemies.filter(e => e.area === player.area).length;

  return (
    <div className="h-screen overflow-hidden bg-[#050810] text-white flex flex-col" style={{ fontFamily: 'IBM Plex Mono, monospace' }}>
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
          position: relative; overflow: hidden;
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

      {/* Dot grid */}
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
            {/* TODO 1.7 #3: Update this badge once Phase 1.5/1.7 #1-#2 are complete.
                 Replace "edits" with "pts", update the title to "Every 50 session pts = 1 gold",
                 and change the divisor from 20 to 50. The codingScore state variable should
                 hold the sum of weighted session points from the activity endpoint, not the
                 raw edit count from /stats/:id. */}
            {codingScore !== null && (
              <div className="border border-emerald-500/25 bg-emerald-950/20 px-2 py-1 flex items-center gap-1.5"
                title="Every 20 coding edits = 1 game gold">
                <span className="text-emerald-500 text-[10px]">💻</span>
                <span className="label text-emerald-600">{codingScore.toLocaleString()} edits</span>
                <span className="label text-slate-700 mx-0.5">→</span>
                <span className="label text-amber-500">🪙 {Math.floor(codingScore / 20)}g</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs text-slate-600 font-mono-custom tracking-wider hidden lg:block">WASD — MOVE &nbsp;|&nbsp; E — TALK &nbsp;|&nbsp; I — BAG</span>
            <button onClick={() => {
              if (!confirm('Reset save? This cannot be undone.')) return;
              localStorage.removeItem(SAVE_KEY);
              localStorage.removeItem(CLAIMED_KEY);
              gsRef.current = initGS();
              setCodingScore(null);
              addMsg('Save reset.');
              rerender();
            }} className="text-xs text-slate-500 hover:text-red-400 transition-colors font-mono-custom tracking-wider cursor-pointer" title="Reset save">RESET</button>
          </div>
        </div>
      </nav>

      {/* ── MAIN CONTENT ── */}
      <div className="relative z-10 flex-1 flex items-center justify-center p-1 min-h-0">
        <div className="flex gap-3 items-start">

          {/* ── CANVAS + OVERLAYS ── */}
          <div className="relative flex-shrink-0 self-start"
            style={{ width: CW, height: CH, border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 0 40px rgba(16,185,129,0.07), inset 0 0 0 1px rgba(255,255,255,0.03)' }}>
            <canvas ref={canvasRef} width={CW} height={CH} className="block" />

            {/* Area + enemy badges */}
            <div className="absolute top-2 left-2 bg-[#050810]/90 border border-white/[0.08] px-2 py-1 flex items-center gap-1.5">
              <span className="label text-emerald-500 tracking-widest">📍 {AREA_NAMES[player.area].toUpperCase()}</span>
            </div>
            <div className="absolute top-2 right-2 bg-[#050810]/90 border border-white/[0.08] px-2 py-1">
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
              <div className="absolute inset-0 flex flex-col" style={{ background: 'rgba(5,8,16,0.92)' }}>
                {/* Enemy section */}
                <div className="flex-1 flex flex-col items-center justify-center gap-3 p-6">
                  <div className="text-6xl">{combat.enemy.def.sprite}</div>
                  <div className="font-display font-bold text-white text-2xl tracking-wide">{combat.enemy.def.name}</div>

                  {/* Enemy HP bar */}
                  <div className="w-56">
                    <div className="flex justify-between mb-1">
                      <span className="label text-red-500">HP</span>
                      <span className="label text-red-400">{combat.enemy.hp} / {combat.enemy.def.hp}</span>
                    </div>
                    <div className="bar-track w-full">
                      <div className="bar-fill-t bg-red-500"
                        style={{ width: `${Math.max(0, combat.enemy.hp / combat.enemy.def.hp * 100)}%` }} />
                    </div>
                  </div>

                  {/* Player quick stats */}
                  <div className="flex gap-4 mt-1 border border-white/[0.06] bg-white/[0.02] px-4 py-2">
                    <div className="text-center">
                      <div className="label text-red-500">YOUR HP</div>
                      <div className="font-display font-bold text-sm text-red-400">{player.hp}/{player.maxHp}</div>
                    </div>
                    <div className="text-center">
                      <div className="label text-sky-500">MP</div>
                      <div className="font-display font-bold text-sm text-sky-400">{player.mp}/{player.maxMp}</div>
                    </div>
                    <div className="text-center">
                      <div className="label text-orange-500">ATK</div>
                      <div className="font-display font-bold text-sm text-orange-400">{playerAtk(player)}</div>
                    </div>
                  </div>

                  {/* Combat log */}
                  <div className="w-72 border border-white/[0.06] bg-white/[0.02] p-2">
                    {combat.log.slice(0, 3).map((line, i) => (
                      <div key={i} className={`text-xs ${i === 0 ? 'text-amber-300' : 'text-slate-600'} leading-relaxed`}>{line}</div>
                    ))}
                  </div>
                </div>

                {/* Action bar */}
                {combat.turn === 'player' && !combat.done && (
                  <div className="border-t border-white/[0.07] bg-[#050810]/80 p-3">
                    <div className="grid grid-cols-4 gap-2 mb-2">
                      <button onClick={() => combatAction('attack')}
                        className="combat-btn border-red-500/60 text-red-400 bg-red-950/30">⚔ ATTACK</button>
                      <button onClick={() => combatAction('magic')} disabled={player.mp < 20}
                        className="combat-btn border-sky-500/60 text-sky-400 bg-sky-950/30">
                        ✨ MAGIC<br /><span className="text-sky-700 text-[10px]">20 MP</span>
                      </button>
                      <button onClick={() => combatAction('defend')}
                        className="combat-btn border-amber-500/60 text-amber-400 bg-amber-950/30">🛡 DEFEND</button>
                      <button onClick={() => combatAction('flee')}
                        className="combat-btn border-white/[0.1] text-slate-400 bg-white/[0.02]">🏃 FLEE</button>
                    </div>
                    {potions.length > 0 && (
                      <div className="flex gap-1.5 items-center">
                        <span className="label text-slate-600">ITEMS</span>
                        {potions.slice(0, 4).map((item, i) => (
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
              {/* HP */}
              <div className="mb-2">
                <div className="flex justify-between mb-1">
                  <span className="label text-red-500">HP</span>
                  <span className="label text-red-400">{player.hp}/{player.maxHp}</span>
                </div>
                <div className="bar-track">
                  <div className="bar-fill-t"
                    style={{ width:`${hpPct*100}%`, background: hpPct > 0.5 ? '#ef4444' : hpPct > 0.25 ? '#f97316' : '#dc2626' }} />
                </div>
              </div>
              {/* MP */}
              <div className="mb-2">
                <div className="flex justify-between mb-1">
                  <span className="label text-sky-500">MP</span>
                  <span className="label text-sky-400">{player.mp}/{player.maxMp}</span>
                </div>
                <div className="bar-track">
                  <div className="bar-fill-t bg-sky-500" style={{ width:`${mpPct*100}%` }} />
                </div>
              </div>
              {/* XP */}
              <div className="mb-3">
                <div className="flex justify-between mb-1">
                  <span className="label text-violet-500">XP</span>
                  <span className="label text-violet-400">{player.xp}/{player.xpNeeded}</span>
                </div>
                <div className="bar-track">
                  <div className="bar-fill-t bg-violet-500" style={{ width:`${xpPct*100}%` }} />
                </div>
              </div>
              {/* ATK / DEF / GOLD */}
              <div className="grid grid-cols-3 gap-1">
                {[
                  { l:'ATK', v: playerAtk(player), c:'text-orange-400' },
                  { l:'DEF', v: playerDef(player), c:'text-sky-400' },
                  { l:'GOLD', v: player.gold,      c:'text-amber-400' },
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
                { label:'WEAPON', item: player.weapon, color:'text-orange-400' },
                { label:'ARMOR',  item: player.armor,  color:'text-sky-400' },
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

            {/* Bag */}
            <div className="side-card c-violet overflow-hidden">
              <button onClick={() => { gsRef.current.showBag = !showBag; rerender(); }}
                className="w-full p-2.5 flex items-center justify-between hover:bg-white/[0.03] transition cursor-pointer">
                <span className="label text-slate-400">BAG ({player.bag.length} items)</span>
                <span className="label text-slate-600">{showBag ? '▲' : '▼'}</span>
              </button>
              {showBag && (
                <div className="border-t border-white/[0.06] max-h-44 overflow-y-auto">
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
                        <span className="label text-emerald-600 flex-shrink-0">{item.kind === 'potion' ? 'USE' : 'EQP'}</span>
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* Message log */}
            <div className="side-card c-amber p-3 flex-1">
              <div className="label text-slate-600 mb-2">ACTIVITY LOG</div>
              <div className="space-y-1">
                {msgs.slice(0, 8).map((msg, i) => (
                  <div key={i} className={`text-[11px] leading-relaxed ${i === 0 ? 'text-slate-300' : 'text-slate-700'}`}>{msg}</div>
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
