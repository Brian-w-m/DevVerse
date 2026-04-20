export type AreaId = 'town' | 'forest' | 'dungeon';
export type TileKind = 'grass' | 'wall' | 'tree' | 'water' | 'stone' | 'dungeon' | 'portal';

export interface Item {
  id: string; name: string; icon: string;
  kind: 'potion' | 'weapon' | 'armor';
  desc: string; price: number;
  healHp?: number; healMp?: number;
  atkBonus?: number; defBonus?: number;
}
export interface EnemyDef {
  id: string; name: string; sprite: string;
  hp: number; atk: number; def: number;
  xp: number; goldMin: number; goldMax: number;
}
export interface Enemy { uid: string; def: EnemyDef; hp: number; x: number; y: number; area: AreaId; }
export interface NPC {
  id: string; name: string; sprite: string;
  x: number; y: number; area: AreaId;
  lines: string[]; sells?: string[]; healer?: { cost: number };
}
export interface Portal { x: number; y: number; to: AreaId; tx: number; ty: number; label: string; }
export interface Player {
  x: number; y: number; area: AreaId;
  hp: number; maxHp: number; mp: number; maxMp: number;
  atk: number; def: number;
  level: number; xp: number; xpNeeded: number; gold: number;
  bag: Item[]; weapon: Item | null; armor: Item | null;
}
export interface Combat {
  enemy: Enemy; log: string[];
  turn: 'player' | 'enemy'; defending: boolean;
  done: boolean; won: boolean;
}
export interface Dialogue { npc: NPC; line: number; mode: 'talk' | 'shop' | 'heal'; }
export interface GS {
  player: Player; enemies: Enemy[];
  combat: Combat | null; dialogue: Dialogue | null;
  showBag: boolean; msgs: string[]; defeatedIds: string[];
}
