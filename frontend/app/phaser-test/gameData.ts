import type { Item, EnemyDef, NPC, Portal, AreaId, TileKind } from './types';

export const GW = 20, GH = 15;
export const TS = 52;
export const CW = TS * GW;   // 1040
export const CH = TS * GH;   // 780

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
    id:'elder', name:'Elder Aldric', sprite:'👴', x:4, y:7, area:'town',
    lines:[
      'Welcome, young hero! Monsters have overrun our lands.',
      'The Grimwood Forest to the east is infested with wolves and goblins.',
      'Deeper still lies the Dark Dungeon — home to skeletons, orcs, and worse.',
      'Speak to Merchant Kira and Thoin the Smith to gear up before venturing out.',
      "Defeat the Cave Dragon in the Dungeon's depths, and you will be a legend.",
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
      "Equip yourself well before going underground. It's far more dangerous.",
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

// ── Portals ───────────────────────────────────────────────────────────────
export const PORTALS: Record<AreaId, Portal[]> = {
  town:    [{ x:3, y:12, to:'forest',  tx:3,  ty:2,  label:'🌲Forest' }, { x:16, y:12, to:'dungeon', tx:3,  ty:2,  label:'⚔Dungeon' }],
  forest:  [{ x:2, y:13, to:'town',    tx:3,  ty:12, label:'🏘Town'   }, { x:17, y:2,  to:'dungeon', tx:3,  ty:2,  label:'⚔Dungeon' }],
  dungeon: [{ x:2, y:13, to:'town',    tx:16, ty:12, label:'🏘Town'   }, { x:17, y:13, to:'forest',  tx:17, ty:2,  label:'🌲Forest' }],
};

export const AREA_NAMES: Record<AreaId, string> = {
  town: 'Silvergate Town', forest: 'Grimwood Forest', dungeon: 'The Dark Dungeon',
};
export const ENEMY_POOL: Record<AreaId, string[]> = {
  town: ['slime'], forest: ['wolf','goblin'], dungeon: ['skeleton','orc','dragon'],
};
export const ENEMY_COUNT: Record<AreaId, number> = { town: 2, forest: 7, dungeon: 9 };

// ── Maps ──────────────────────────────────────────────────────────────────
function buildSets(coords: string[]): Set<string> { return new Set(coords); }

export const TOWN_WALLS = buildSets([
  ...[...Array(GW)].map((_,i)=>`${i},0`), ...[...Array(GW)].map((_,i)=>`${i},${GH-1}`),
  ...[...Array(GH)].map((_,i)=>`0,${i}`), ...[...Array(GH)].map((_,i)=>`${GW-1},${i}`),
  '7,3','8,3','9,3','7,4','9,4','7,5','8,5','9,5',
  '11,3','12,3','13,3','11,4','13,4','11,5','12,5','13,5',
  '15,8','16,8','17,8','15,9','17,9','15,10','16,10','17,10',
]);
export const TOWN_WATER = buildSets(['10,8','11,8','10,9']);

export const FOREST_TREES = buildSets([
  ...[...Array(GW)].map((_,i)=>`${i},0`), ...[...Array(GW)].map((_,i)=>`${i},${GH-1}`),
  ...[...Array(GH)].map((_,i)=>`0,${i}`), ...[...Array(GH)].map((_,i)=>`${GW-1},${i}`),
  '3,2','4,2','8,2','9,2','14,2','15,2',
  '2,4','3,4','9,4','10,4','15,4','16,4',
  '3,6','6,6','7,6','13,6','14,6','16,6',
  '2,8','3,9','4,9','13,8','14,8','17,8',
  '3,11','4,11','9,11','13,11','14,11','15,11',
]);
export const FOREST_WATER = buildSets(['5,5','6,5','7,5','6,6','7,6']);

export const DUNGEON_WALLS = buildSets([
  ...[...Array(GW)].map((_,i)=>`${i},0`), ...[...Array(GW)].map((_,i)=>`${i},${GH-1}`),
  ...[...Array(GH)].map((_,i)=>`0,${i}`), ...[...Array(GH)].map((_,i)=>`${GW-1},${i}`),
  '3,2','4,2','5,2','6,2','3,3','6,3','3,4','4,4','5,4','6,4',
  '10,2','11,2','12,2','13,2','10,3','13,3','10,4','11,4','12,4','13,4',
  '2,7','3,7','4,7','5,7','6,7','2,8','6,8','2,9','3,9','4,9','5,9','6,9',
  '13,7','14,7','15,7','16,7','13,8','16,8','13,9','14,9','15,9','16,9',
]);

export function getTownTile(x: number, y: number): TileKind {
  if (TOWN_WALLS.has(`${x},${y}`)) return 'wall';
  if (TOWN_WATER.has(`${x},${y}`)) return 'water';
  if (PORTALS.town.some(p => p.x===x && p.y===y)) return 'portal';
  return 'grass';
}
export function getForestTile(x: number, y: number): TileKind {
  if (FOREST_TREES.has(`${x},${y}`)) return 'tree';
  if (FOREST_WATER.has(`${x},${y}`)) return 'water';
  if (PORTALS.forest.some(p => p.x===x && p.y===y)) return 'portal';
  return 'grass';
}
export function getDungeonTile(x: number, y: number): TileKind {
  if (DUNGEON_WALLS.has(`${x},${y}`)) return 'stone';
  if (PORTALS.dungeon.some(p => p.x===x && p.y===y)) return 'portal';
  return 'dungeon';
}
export const GET_TILE: Record<AreaId, (x: number, y: number) => TileKind> = {
  town: getTownTile, forest: getForestTile, dungeon: getDungeonTile,
};
