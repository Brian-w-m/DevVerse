'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════
const TS = 44, GW = 20, GH = 15;
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
    id:'merchant', name:'Merchant Kira', sprite:'🧝', x:13, y:3, area:'town',
    lines:['Fine goods for a brave soul! Browse my wares and spend wisely.'],
    sells:['potion','mana_potion','iron_sword','leather'],
  },
  {
    id:'blacksmith', name:'Thoin the Smith', sprite:'⚒️', x:16, y:9, area:'town',
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
  ctx.font = 'bold 8px monospace';
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
    ctx.font = 'bold 7px monospace';
    ctx.fillStyle = '#adf';
    ctx.fillText(npc.name.split(' ')[0], px+TS/2, py-4);
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
  ctx.fillStyle = '#7a4a2a';
  ctx.fillRect(px+4, py+4, TS-8, TS-8);
  ctx.fillStyle = '#ff6b35';
  ctx.fillRect(px+8, py+14, TS-16, 12);
  ctx.fillStyle = '#f4a79e';
  ctx.fillRect(px+10, py+7, TS-20, 10);
  ctx.fillStyle = '#000';
  ctx.fillRect(px+12, py+9, 2, 2);
  ctx.fillRect(px+18, py+9, 2, 2);
  if (player.weapon) {
    ctx.font = '11px serif';
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
    <div className="h-screen overflow-hidden bg-[#0a0a14] text-white font-mono flex items-center justify-center p-3">
      <style>{`
        * { cursor: crosshair; }
        @keyframes bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-3px)} }
        .title { font-size:1.8rem; font-weight:900; letter-spacing:2px;
          text-shadow:3px 3px #ff6b35,6px 6px #333; animation:bounce 1.2s ease-in-out infinite; }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.6} }
        .blink { animation:pulse 1s ease-in-out infinite; }
        ::-webkit-scrollbar { width:4px; }
        ::-webkit-scrollbar-track { background:#111; }
        ::-webkit-scrollbar-thumb { background:#444; }
      `}</style>

      <div className="flex flex-col gap-2">
        {/* ── HEADER ── */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="title">⚔️ PIXEL QUEST</h1>
            {codingScore !== null && (
              <div className="bg-blue-900/60 border border-blue-600 px-2 py-1 text-xs text-blue-300 rounded flex items-center gap-1"
                title="Every 20 coding edits = 1 game gold">
                <span className="text-blue-400">💻</span>
                <span>{codingScore.toLocaleString()} edits</span>
                <span className="text-gray-500 mx-1">→</span>
                <span className="text-yellow-400">🪙 {Math.floor(codingScore / 20)}g earned</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            <a href="/dashboard"
              className="text-xs text-gray-400 hover:text-white border border-gray-700 hover:border-gray-500 px-2 py-1 transition">
              ← Dashboard
            </a>
            <button onClick={() => {
              if (!confirm('Reset save? This cannot be undone.')) return;
              localStorage.removeItem(SAVE_KEY);
              localStorage.removeItem(CLAIMED_KEY);
              gsRef.current = initGS();
              setCodingScore(null);
              addMsg('Save reset. Refresh to start fresh!');
              rerender();
            }} className="text-xs text-gray-600 hover:text-red-400 transition px-1">⟳</button>
            <div className="text-xs text-gray-400 text-right leading-relaxed">
              <p>WASD / Arrows — Move</p>
              <p>E / Space — Interact &nbsp;•&nbsp; I — Bag</p>
            </div>
          </div>
        </div>

        {/* ── MAIN ROW ── */}
        <div className="flex gap-3">

          {/* ── CANVAS + OVERLAYS ── */}
          <div className="relative flex-shrink-0 border-4 border-yellow-600 self-start"
            style={{ boxShadow:'0 0 24px rgba(180,130,0,0.5)', width:CW, height:CH }}>
            <canvas ref={canvasRef} width={CW} height={CH} className="block" />

            {/* Area name badge */}
            <div className="absolute top-2 left-2 bg-black/80 border border-yellow-600 px-2 py-1 text-xs text-yellow-400 font-bold">
              📍 {AREA_NAMES[player.area]}
            </div>
            <div className="absolute top-2 right-2 bg-black/80 border border-red-600 px-2 py-1 text-xs text-red-400">
              👾 {areaEnemies} enemies
            </div>

            {/* ── DIALOGUE OVERLAY ── */}
            {dialogue && dialogue.mode === 'talk' && (
              <div className="absolute bottom-0 left-0 right-0 bg-black/95 border-t-2 border-cyan-500 p-3">
                <div className="flex items-start gap-3">
                  <div className="text-3xl flex-shrink-0">{dialogue.npc.sprite}</div>
                  <div className="flex-1">
                    <div className="text-cyan-400 font-bold text-sm mb-1">{dialogue.npc.name}</div>
                    <div className="text-gray-200 text-sm leading-relaxed">{dialogue.npc.lines[dialogue.line]}</div>
                    <div className="text-gray-500 text-xs mt-2 blink">
                      {dialogue.line < dialogue.npc.lines.length - 1
                        ? '▶ Press E to continue'
                        : dialogue.npc.sells
                          ? '▶ Press E to open shop'
                          : dialogue.npc.healer
                            ? '▶ Press E to open healing'
                            : '▶ Press E or Esc to close'}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── SHOP OVERLAY ── */}
            {dialogue && dialogue.mode === 'shop' && (
              <div className="absolute bottom-0 left-0 right-0 bg-black/95 border-t-2 border-yellow-500 p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-yellow-400 font-bold text-sm">{dialogue.npc.sprite} {dialogue.npc.name} — Shop</div>
                  <div className="flex items-center gap-2">
                    <span className="text-yellow-300 text-xs">💰 {player.gold}g</span>
                    <button onClick={() => { gsRef.current.dialogue = null; rerender(); }}
                      className="text-gray-500 text-xs hover:text-white px-1">✕ Close</button>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {(dialogue.npc.sells ?? []).map(id => {
                    const item = ITEMS[id];
                    const canAfford = player.gold >= item.price;
                    return (
                      <button key={id} onClick={() => buyItem(id)}
                        disabled={!canAfford}
                        className={`p-2 border text-xs text-left transition ${canAfford ? 'border-yellow-600 bg-gray-900 hover:bg-gray-800 cursor-pointer' : 'border-gray-700 bg-gray-900/50 opacity-50 cursor-not-allowed'}`}>
                        <div className="text-lg leading-none mb-1">{item.icon}</div>
                        <div className="font-bold text-gray-200">{item.name}</div>
                        <div className="text-gray-500">{item.desc}</div>
                        <div className={`font-bold mt-1 ${canAfford ? 'text-yellow-400' : 'text-gray-600'}`}>{item.price}g</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── HEAL OVERLAY ── */}
            {dialogue && dialogue.mode === 'heal' && (
              <div className="absolute bottom-0 left-0 right-0 bg-black/95 border-t-2 border-green-500 p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-green-400 font-bold text-sm">{dialogue.npc.sprite} {dialogue.npc.name}</div>
                  <button onClick={() => { gsRef.current.dialogue = null; rerender(); }}
                    className="text-gray-500 text-xs hover:text-white">✕ Close</button>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-sm text-gray-300">
                    <div>HP: <span className="text-red-400">{player.hp}</span> / {player.maxHp}</div>
                    <div>MP: <span className="text-blue-400">{player.mp}</span> / {player.maxMp}</div>
                  </div>
                  <button onClick={healPlayer}
                    disabled={player.gold < (dialogue.npc.healer?.cost ?? 0)}
                    className="px-4 py-2 bg-green-800 border-2 border-green-400 text-green-300 font-bold text-sm hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed transition">
                    💚 Full Heal ({dialogue.npc.healer?.cost}g)
                  </button>
                  <div className="text-yellow-300 text-sm">💰 {player.gold}g</div>
                </div>
              </div>
            )}

            {/* ── COMBAT OVERLAY ── */}
            {combat && (
              <div className="absolute inset-0 bg-black/85 flex flex-col">
                {/* Enemy panel */}
                <div className="flex-1 flex items-center justify-center flex-col gap-2 p-4">
                  <div className="text-5xl">{combat.enemy.def.sprite}</div>
                  <div className="text-white font-bold text-lg">{combat.enemy.def.name}</div>
                  <div className="w-48">
                    <div className="text-xs text-gray-400 mb-1 flex justify-between">
                      <span>HP</span><span>{combat.enemy.hp}/{combat.enemy.def.hp}</span>
                    </div>
                    <div className="bg-gray-800 h-3 rounded">
                      <div className="bg-red-500 h-3 rounded transition-all"
                        style={{ width:`${Math.max(0,combat.enemy.hp/combat.enemy.def.hp*100)}%` }} />
                    </div>
                  </div>
                  {/* Combat log */}
                  <div className="mt-2 w-64 text-center">
                    {combat.log.slice(0, 3).map((line,i) => (
                      <div key={i} className={`text-sm ${i===0?'text-yellow-300':'text-gray-500'}`}>{line}</div>
                    ))}
                  </div>
                </div>

                {/* Action buttons (only on player turn, not done) */}
                {combat.turn === 'player' && !combat.done && (
                  <div className="p-3 border-t border-gray-700">
                    <div className="grid grid-cols-4 gap-2 mb-2">
                      <button onClick={() => combatAction('attack')}
                        className="py-2 bg-red-900 border border-red-500 text-red-300 text-xs font-bold hover:bg-red-800 transition">
                        ⚔️ Attack
                      </button>
                      <button onClick={() => combatAction('magic')}
                        disabled={player.mp < 20}
                        className="py-2 bg-blue-900 border border-blue-500 text-blue-300 text-xs font-bold hover:bg-blue-800 disabled:opacity-40 disabled:cursor-not-allowed transition">
                        ✨ Magic<br /><span className="text-blue-500">(20 MP)</span>
                      </button>
                      <button onClick={() => combatAction('defend')}
                        className="py-2 bg-yellow-900 border border-yellow-600 text-yellow-300 text-xs font-bold hover:bg-yellow-800 transition">
                        🛡 Defend
                      </button>
                      <button onClick={() => combatAction('flee')}
                        className="py-2 bg-gray-800 border border-gray-600 text-gray-300 text-xs font-bold hover:bg-gray-700 transition">
                        🏃 Flee
                      </button>
                    </div>
                    {potions.length > 0 && (
                      <div className="flex gap-1">
                        <span className="text-xs text-gray-500 self-center mr-1">Items:</span>
                        {potions.slice(0, 4).map((item, i) => (
                          <button key={`${item.id}-${i}`} onClick={() => useCombatItem(item)}
                            title={item.desc}
                            className="px-2 py-1 bg-purple-900 border border-purple-600 text-xs hover:bg-purple-800 transition">
                            {item.icon} {item.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                {combat.turn === 'enemy' && !combat.done && (
                  <div className="p-3 border-t border-gray-700 text-center text-yellow-400 text-sm blink">
                    {combat.enemy.def.name} is acting...
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── RIGHT SIDEBAR ── */}
          <div className="flex flex-col gap-2 w-60 overflow-y-auto flex-shrink-0" style={{ maxHeight: CH + 8 }}>

            {/* Player stats */}
            <div className="bg-gray-900 border border-gray-700 p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-yellow-400 font-bold text-sm">🧙 Hero</span>
                <span className="text-gray-400 text-xs">Lv.{player.level}</span>
              </div>
              {/* HP */}
              <div className="mb-1">
                <div className="flex justify-between text-xs mb-0.5">
                  <span className="text-red-400">❤️ HP</span>
                  <span className="text-red-300">{player.hp}/{player.maxHp}</span>
                </div>
                <div className="bg-gray-800 h-2 rounded">
                  <div className="h-2 rounded transition-all"
                    style={{ width:`${hpPct*100}%`, background: hpPct > 0.5 ? '#e53' : hpPct > 0.25 ? '#e83' : '#e22' }} />
                </div>
              </div>
              {/* MP */}
              <div className="mb-1">
                <div className="flex justify-between text-xs mb-0.5">
                  <span className="text-blue-400">💙 MP</span>
                  <span className="text-blue-300">{player.mp}/{player.maxMp}</span>
                </div>
                <div className="bg-gray-800 h-2 rounded">
                  <div className="bg-blue-500 h-2 rounded transition-all" style={{ width:`${mpPct*100}%` }} />
                </div>
              </div>
              {/* XP */}
              <div className="mb-2">
                <div className="flex justify-between text-xs mb-0.5">
                  <span className="text-green-400">⭐ XP</span>
                  <span className="text-green-300">{player.xp}/{player.xpNeeded}</span>
                </div>
                <div className="bg-gray-800 h-2 rounded">
                  <div className="bg-green-500 h-2 rounded transition-all" style={{ width:`${xpPct*100}%` }} />
                </div>
              </div>
              {/* Stats grid */}
              <div className="grid grid-cols-3 gap-1 text-xs">
                <div className="bg-gray-800 px-1 py-1 text-center">
                  <div className="text-gray-500">ATK</div>
                  <div className="text-orange-400 font-bold">{playerAtk(player)}</div>
                </div>
                <div className="bg-gray-800 px-1 py-1 text-center">
                  <div className="text-gray-500">DEF</div>
                  <div className="text-cyan-400 font-bold">{playerDef(player)}</div>
                </div>
                <div className="bg-gray-800 px-1 py-1 text-center">
                  <div className="text-gray-500">GOLD</div>
                  <div className="text-yellow-400 font-bold">{player.gold}</div>
                </div>
              </div>
            </div>

            {/* Equipment */}
            <div className="bg-gray-900 border border-gray-700 p-3">
              <div className="text-orange-400 font-bold text-xs mb-2">⚙️ EQUIPMENT</div>
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2 bg-gray-800 p-1.5 text-xs">
                  <span className="text-gray-500 w-10">Weapon</span>
                  {player.weapon
                    ? <><span>{player.weapon.icon}</span><span className="text-orange-300">{player.weapon.name}</span></>
                    : <span className="text-gray-600 italic">None</span>}
                </div>
                <div className="flex items-center gap-2 bg-gray-800 p-1.5 text-xs">
                  <span className="text-gray-500 w-10">Armor</span>
                  {player.armor
                    ? <><span>{player.armor.icon}</span><span className="text-cyan-300">{player.armor.name}</span></>
                    : <span className="text-gray-600 italic">None</span>}
                </div>
              </div>
            </div>

            {/* Bag */}
            <div className="bg-gray-900 border border-gray-700">
              <button onClick={() => { gsRef.current.showBag = !showBag; rerender(); }}
                className="w-full p-2 flex items-center justify-between text-purple-300 font-bold text-xs hover:bg-gray-800 transition">
                <span>📦 BAG ({player.bag.length})</span>
                <span>{showBag ? '▲' : '▼'}</span>
              </button>
              {showBag && (
                <div className="p-2 border-t border-gray-700 max-h-44 overflow-y-auto">
                  {player.bag.length === 0
                    ? <p className="text-gray-600 text-xs italic">Empty</p>
                    : player.bag.map((item, i) => (
                      <div key={`${item.id}-${i}`}
                        className="flex items-center gap-2 p-1.5 hover:bg-gray-800 cursor-pointer text-xs border-b border-gray-800 last:border-0"
                        onClick={() => useFromBag(item)}>
                        <span className="text-lg leading-none">{item.icon}</span>
                        <div className="flex-1">
                          <div className="text-gray-200 font-bold">{item.name}</div>
                          <div className="text-gray-500">{item.desc}</div>
                        </div>
                        <span className="text-green-400 text-xs">{item.kind === 'potion' ? 'Use' : 'Equip'}</span>
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* Message log */}
            <div className="bg-gray-900 border border-gray-700 p-2 flex-1">
              <div className="text-gray-500 text-xs font-bold mb-1">📜 LOG</div>
              <div className="flex flex-col gap-0.5">
                {msgs.slice(0, 8).map((msg, i) => (
                  <div key={i} className={`text-xs ${i === 0 ? 'text-gray-200' : 'text-gray-600'}`}>{msg}</div>
                ))}
              </div>
            </div>

            {/* Controls reminder */}
            <div className="text-center text-gray-700 text-xs pb-1">
              A DevVerse Pixel RPG
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
