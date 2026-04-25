import type { Item, EnemyDef, NPC, Portal, AreaId, TileKind } from './types';

export const GW = 32, GH = 24;
export const TS = 39;
export const CW = TS * GW;   // 1040
export const CH = TS * GH;   // 780
export const VIEW_COLS = 32, VIEW_ROWS = 20;
export const VW = TS * VIEW_COLS;
export const VH = TS * VIEW_ROWS;

// ── Items ─────────────────────────────────────────────────────────────────
export const ITEMS: Record<string, Item> = {
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

// ── Enemies ───────────────────────────────────────────────────────────────
export const ENEMY_DEFS: Record<string, EnemyDef> = {
  slime:    { id:'slime',    name:'Slime',        sprite:'🟢', hp:20,  atk:5,  def:0,  xp:10,  goldMin:2,   goldMax:6   },
  wolf:     { id:'wolf',     name:'Forest Wolf',  sprite:'🐺', hp:50,  atk:13, def:3,  xp:28,  goldMin:5,   goldMax:14  },
  goblin:   { id:'goblin',   name:'Goblin',       sprite:'👺', hp:65,  atk:17, def:6,  xp:38,  goldMin:10,  goldMax:22  },
  skeleton: { id:'skeleton', name:'Skeleton',     sprite:'💀', hp:95,  atk:24, def:9,  xp:65,  goldMin:18,  goldMax:38  },
  orc:      { id:'orc',      name:'Dark Orc',     sprite:'👹', hp:140, atk:32, def:15, xp:95,  goldMin:28,  goldMax:58  },
  dragon:   { id:'dragon',   name:'Cave Dragon',  sprite:'🐉', hp:280, atk:55, def:24, xp:350, goldMin:120, goldMax:220 },
};

// ── NPCs ──────────────────────────────────────────────────────────────────
export const NPCS: NPC[] = [
  {
    id:'elder', name:'Elder Aldric', sprite:'👴', x:7, y:16, area:'town',
    lines:[
      'Welcome, young hero! Monsters have overrun our lands.',
      'The Grimwood Forest to the east is infested with wolves and goblins.',
      'Deeper still lies the Dark Dungeon — home to skeletons, orcs, and worse.',
      'Speak to Merchant Kira and Thoin the Smith to gear up before venturing out.',
      "Defeat the Cave Dragon in the Dungeon's depths, and you will be a legend.",
    ],
  },
  {
    id:'merchant', name:'Merchant Kira', sprite:'🧝', x:16, y:6, area:'town',
    lines:['Fine goods for a brave soul! Browse my wares and spend wisely.'],
    sells:['potion','mana_potion','iron_sword','leather'],
  },
  {
    id:'blacksmith', name:'Thoin the Smith', sprite:'⚒️', x:26, y:15, area:'town',
    lines:['I forge the finest blades and armor. The strong deserve the best.'],
    sells:['hi_potion','elixir','steel_sword','shadow_blade','chain','plate'],
  },
  {
    id:'healer', name:'Sister Mira', sprite:'💚', x:6, y:6, area:'town',
    lines:['The Goddess of Light blesses this place. I can restore you — for 30 gold.'],
    healer:{ cost:30 },
  },
  {
    id:'scout', name:'Scout Edlyn', sprite:'🏹', x:19, y:14, area:'forest',
    lines:[
      'The forest is crawling with wolves and goblins. Stay alert.',
      'The Dungeon entrance is northeast, past the dark thicket.',
      "Equip yourself well before going underground. It's far more dangerous.",
    ],
  },
  {
    id:'ghost', name:'Lost Spirit', sprite:'👻', x:16, y:13, area:'dungeon',
    lines:[
      'Turn back... the darkness here consumes all who enter.',
      'The Dragon sleeps deep below. Few have ever returned from its chamber.',
      'Use every trick you have — magic, defense, potions. Do not hold back.',
    ],
  },
];

// ── Portals ───────────────────────────────────────────────────────────────
export const PORTALS: Record<AreaId, Portal[]> = {
  town:    [{ x:3,  y:20, to:'forest',  tx:4,  ty:7,  label:'🌲Forest' }, { x:28, y:20, to:'dungeon', tx:4,  ty:9,  label:'⚔Dungeon' }],
  forest:  [{ x:2,  y:22, to:'town',    tx:3,  ty:20, label:'🏘Town'   }, { x:29, y:2,  to:'dungeon', tx:28, ty:9,  label:'⚔Dungeon' }],
  dungeon: [{ x:2,  y:22, to:'town',    tx:28, ty:20, label:'🏘Town'   }, { x:20, y:17, to:'forest',  tx:28, ty:8,  label:'🌲Forest' }],
};

export const AREA_NAMES: Record<AreaId, string> = {
  town: 'Silvergate Town', forest: 'Grimwood Forest', dungeon: 'The Dark Dungeon',
};
export const ENEMY_POOL: Record<AreaId, string[]> = {
  town: ['slime'], forest: ['wolf','goblin'], dungeon: ['skeleton','orc','dragon'],
};
export const ENEMY_COUNT: Record<AreaId, number> = { town: 4, forest: 14, dungeon: 18 };

// ── Maps ──────────────────────────────────────────────────────────────────
function buildSets(coords: string[]): Set<string> { return new Set(coords); }
function k(x: number, y: number): string { return `${x},${y}`; }
function addRect(set: Set<string>, x1: number, y1: number, x2: number, y2: number) {
  for (let y = y1; y <= y2; y++) for (let x = x1; x <= x2; x++) set.add(k(x, y));
}
function addHollowRect(set: Set<string>, x1: number, y1: number, x2: number, y2: number) {
  for (let x = x1; x <= x2; x++) {
    set.add(k(x, y1));
    set.add(k(x, y2));
  }
  for (let y = y1; y <= y2; y++) {
    set.add(k(x1, y));
    set.add(k(x2, y));
  }
}
function clearRect(set: Set<string>, x1: number, y1: number, x2: number, y2: number) {
  for (let y = y1; y <= y2; y++) for (let x = x1; x <= x2; x++) set.delete(k(x, y));
}
function addEllipse(set: Set<string>, cx: number, cy: number, rx: number, ry: number) {
  for (let y = Math.max(1, cy - ry); y <= Math.min(GH - 2, cy + ry); y++) {
    for (let x = Math.max(1, cx - rx); x <= Math.min(GW - 2, cx + rx); x++) {
      const nx = (x - cx) / rx;
      const ny = (y - cy) / ry;
      if (nx * nx + ny * ny <= 1) set.add(k(x, y));
    }
  }
}
function carveReserved(obstacles: Set<string>, area: AreaId) {
  PORTALS[area].forEach(p => obstacles.delete(k(p.x, p.y)));
  // Ensure landing tiles from other areas into this area are always walkable.
  (Object.values(PORTALS).flat()).forEach(p => {
    if (p.to === area) obstacles.delete(k(p.tx, p.ty));
  });
  NPCS.filter(n => n.area === area).forEach(n => obstacles.delete(k(n.x, n.y)));
}

export const TOWN_WALLS = (() => {
  const s = buildSets([]);
  // perimeter
  addRect(s, 0, 0, GW - 1, 0); addRect(s, 0, GH - 1, GW - 1, GH - 1);
  addRect(s, 0, 0, 0, GH - 1); addRect(s, GW - 1, 0, GW - 1, GH - 1);

  // district blocks and walls (hollow interiors)
  addHollowRect(s, 3, 3, 10, 8);    // chapel block
  addHollowRect(s, 13, 3, 20, 9);   // market hall
  addHollowRect(s, 22, 4, 29, 10);  // guild / housing
  addHollowRect(s, 22, 12, 30, 18); // smith quarter
  addHollowRect(s, 4, 14, 10, 19);  // barracks

  // central square dividers / walls
  addRect(s, 11, 11, 20, 11);
  addRect(s, 11, 12, 11, 18);
  addRect(s, 20, 12, 20, 18);

  // gates / roads
  ['6,8','16,9','26,10','26,12','7,14','11,15','20,15','15,11','3,20','28,20'].forEach(v => s.delete(v));
  // force interior walkability for buildings
  clearRect(s, 4, 4, 9, 7);     // chapel interior
  clearRect(s, 14, 4, 19, 8);   // market interior
  clearRect(s, 23, 5, 28, 9);   // guild/housing interior
  clearRect(s, 23, 13, 29, 17); // smith quarter interior
  clearRect(s, 5, 15, 9, 18);   // barracks interior
  carveReserved(s, 'town');
  return s;
})();

export const TOWN_WATER = (() => {
  const s = buildSets([]);
  // town pond + fountain
  addEllipse(s, 16, 15, 2, 2);
  addEllipse(s, 8, 11, 1, 1);
  PORTALS.town.forEach(p => s.delete(k(p.x, p.y)));
  return s;
})();

export const FOREST_TREES = (() => {
  const s = buildSets([]);
  // perimeter forest wall
  addRect(s, 0, 0, GW - 1, 0); addRect(s, 0, GH - 1, GW - 1, GH - 1);
  addRect(s, 0, 0, 0, GH - 1); addRect(s, GW - 1, 0, GW - 1, GH - 1);

  // dense groves and winding obstacles
  addRect(s, 2, 2, 8, 6);
  addRect(s, 10, 3, 15, 8);
  addRect(s, 18, 2, 23, 6);
  addRect(s, 24, 4, 30, 9);
  addRect(s, 4, 9, 9, 13);
  addRect(s, 12, 10, 17, 15);
  addRect(s, 21, 11, 27, 16);
  addRect(s, 6, 16, 12, 21);
  addRect(s, 15, 17, 20, 21);
  addRect(s, 23, 18, 30, 22);

  // carve hiking paths / clearings
  addRect(s, 2, 7, 30, 8);   // then remove from trees
  for (let x = 2; x <= 30; x++) { s.delete(k(x, 7)); s.delete(k(x, 8)); }
  for (let y = 2; y <= 22; y++) { s.delete(k(10, y)); s.delete(k(19, y)); }
  for (let x = 3; x <= 28; x++) s.delete(k(x, 14));

  // clear around lakes and portals/npcs
  carveReserved(s, 'forest');
  return s;
})();

export const FOREST_WATER = (() => {
  const s = buildSets([]);
  // multiple lakes / ponds
  addEllipse(s, 6, 11, 3, 2);
  addEllipse(s, 16, 6, 4, 2);
  addEllipse(s, 25, 13, 3, 2);
  addEllipse(s, 18, 19, 3, 2);
  PORTALS.forest.forEach(p => s.delete(k(p.x, p.y)));
  NPCS.filter(n => n.area === 'forest').forEach(n => s.delete(k(n.x, n.y)));
  return s;
})();

export const DUNGEON_WALLS = (() => {
  const s = buildSets([]);
  // perimeter
  addRect(s, 0, 0, GW - 1, 0); addRect(s, 0, GH - 1, GW - 1, GH - 1);
  addRect(s, 0, 0, 0, GH - 1); addRect(s, GW - 1, 0, GW - 1, GH - 1);

  // chamber blocks (hollow rooms) and maze ribs
  addHollowRect(s, 3, 3, 10, 8);
  addHollowRect(s, 12, 2, 18, 6);
  addHollowRect(s, 21, 3, 28, 8);
  addHollowRect(s, 4, 10, 9, 16);
  addHollowRect(s, 12, 10, 19, 16);
  addHollowRect(s, 22, 11, 29, 17);
  addHollowRect(s, 6, 18, 12, 22);
  addHollowRect(s, 15, 18, 21, 22);
  addHollowRect(s, 24, 19, 30, 22);

  // corridors
  for (let x = 2; x <= 30; x++) { s.delete(k(x, 9)); s.delete(k(x, 17)); }
  for (let y = 2; y <= 22; y++) { s.delete(k(11, y)); s.delete(k(20, y)); }
  for (let x = 4; x <= 28; x++) s.delete(k(x, 13));

  // doors / key connections
  ['6,8','15,6','24,8','7,17','16,16','25,17','11,12','20,14','2,22','29,22'].forEach(v => s.delete(v));
  // force interior walkability for dungeon chambers
  clearRect(s, 4, 4, 9, 7);
  clearRect(s, 13, 3, 17, 5);
  clearRect(s, 22, 4, 27, 7);
  clearRect(s, 5, 11, 8, 15);
  clearRect(s, 13, 11, 18, 15);
  clearRect(s, 23, 12, 28, 16);
  clearRect(s, 7, 19, 11, 21);
  clearRect(s, 16, 19, 20, 21);
  clearRect(s, 25, 20, 29, 21);
  carveReserved(s, 'dungeon');
  return s;
})();

export function getTownTile(x: number, y: number): TileKind {
  if (PORTALS.town.some(p => p.x===x && p.y===y)) return 'portal';
  if (TOWN_WALLS.has(`${x},${y}`)) return 'wall';
  if (TOWN_WATER.has(`${x},${y}`)) return 'water';
  return 'grass';
}
export function getForestTile(x: number, y: number): TileKind {
  if (PORTALS.forest.some(p => p.x===x && p.y===y)) return 'portal';
  if (FOREST_TREES.has(`${x},${y}`)) return 'tree';
  if (FOREST_WATER.has(`${x},${y}`)) return 'water';
  return 'grass';
}
export function getDungeonTile(x: number, y: number): TileKind {
  if (PORTALS.dungeon.some(p => p.x===x && p.y===y)) return 'portal';
  if (DUNGEON_WALLS.has(`${x},${y}`)) return 'stone';
  return 'dungeon';
}
export const GET_TILE: Record<AreaId, (x: number, y: number) => TileKind> = {
  town: getTownTile, forest: getForestTile, dungeon: getDungeonTile,
};
