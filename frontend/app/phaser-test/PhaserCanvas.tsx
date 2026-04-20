'use client';

import { useEffect, useRef, type MutableRefObject } from 'react';
import type { GS, AreaId } from './types';
import { GW, GH, TS, CW, CH, PORTALS, NPCS, GET_TILE } from './gameData';

// Tile hex colours (mirroring the original TC palette)
const TC: Record<string, [number, number]> = {
  grass:   [0x2d5a16, 0x3a7a1a],
  wall:    [0x4a4a6a, 0x5a5a7a],
  tree:    [0x1a4a0a, 0x256010],
  water:   [0x1a4a9a, 0x2060c0],
  stone:   [0x3a3a5a, 0x4a4a6a],
  dungeon: [0x12121e, 0x1a1a30],
  portal:  [0xb8860b, 0xffd700],
};

interface Props {
  gsRef: MutableRefObject<GS>;
}

export default function PhaserCanvas({ gsRef }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const gameRef = useRef<any>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    let cancelled = false;

    import('phaser').then((mod) => {
      if (cancelled || gameRef.current) return;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const Phaser: any = mod;
      const ref = gsRef; // close over for scene access

      // ── Tile texture helpers ─────────────────────────────────────────────
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      function generateTileTextures(scene: any) {
        const g = scene.make.graphics({ x: 0, y: 0 });
        for (const [kind, [base, accent]] of Object.entries(TC)) {
          g.clear();
          g.fillStyle(base);
          g.fillRect(0, 0, TS, TS);
          if (kind === 'grass') {
            g.fillStyle(accent, 0.6);
            g.fillRect(4, 6, 3, 3); g.fillRect(18, 22, 3, 3); g.fillRect(30, 12, 3, 3);
          } else if (kind === 'dungeon') {
            g.lineStyle(1, accent, 0.8); g.strokeRect(1, 1, TS-2, TS-2);
          } else if (kind === 'stone' || kind === 'wall') {
            g.lineStyle(1, accent, 0.8);
            g.strokeRect(1, 1, TS-2, TS-2); g.strokeRect(3, 3, TS-6, TS-6);
          } else if (kind === 'portal') {
            g.fillStyle(accent); g.fillRect(5, 5, TS-10, TS-10);
          } else if (kind === 'water') {
            g.fillStyle(accent, 0.7);
            g.fillRect(2, 9, TS-4, 5); g.fillRect(2, 22, TS-4, 5);
          } else if (kind === 'tree') {
            g.fillStyle(accent);
            g.fillCircle(TS/2, TS/2 - 2, TS/3);
          }
          g.generateTexture(`tile_${kind}`, TS, TS);
        }

        // Player
        g.clear();
        g.fillStyle(0x7a4a2a); g.fillRect(4, 4, TS-8, TS-8);
        g.fillStyle(0xff6b35); g.fillRect(10, 17, TS-20, 14);   // body
        g.fillStyle(0xf4a79e); g.fillRect(12, 8, TS-24, 12);    // face
        g.fillStyle(0x000000);
        g.fillRect(15, 11, Math.max(2,Math.round(TS*0.06)), Math.max(2,Math.round(TS*0.06)));
        g.fillRect(22, 11, Math.max(2,Math.round(TS*0.06)), Math.max(2,Math.round(TS*0.06)));
        g.generateTexture('player', TS, TS);

        // NPC bg
        g.clear(); g.fillStyle(0x1a3a5a); g.fillRect(3, 3, TS-6, TS-6);
        g.generateTexture('npc_bg', TS, TS);

        // Enemy bg
        g.clear(); g.fillStyle(0x3a1a1a); g.fillRect(3, 3, TS-6, TS-6);
        g.generateTexture('enemy_bg', TS, TS);

        // Step particle
        g.clear(); g.fillStyle(0xffffff); g.fillCircle(3, 3, 3);
        g.generateTexture('particle', 6, 6);

        g.destroy();
      }

      // ── Phaser Scene ─────────────────────────────────────────────────────
      class GameScene extends Phaser.Scene {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        private tileObjects: any[] = [];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        private playerContainer: any;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        private emitter: any;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        private npcSprites = new Map<string, any>();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        private enemyContainers = new Map<string, any>();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        private enemyHpFills = new Map<string, any>();
        private lastArea: AreaId = 'town';
        private lastPX = -1; private lastPY = -1;
        private lastWeaponIcon = '';
        private moving = false;

        constructor() { super('GameScene'); }

        preload() { generateTileTextures(this); }

        create() {
          const { player } = ref.current;
          this.lastArea = player.area;
          this.lastPX = player.x;
          this.lastPY = player.y;

          this.rebuildMap(player.area);

          // Player sprite (depth 10 — above tiles=0, entities=5)
          this.playerContainer = this.add.container(
            player.x * TS + TS/2,
            player.y * TS + TS/2
          ).setDepth(10);
          this.playerContainer.add(this.add.image(0, 0, 'player'));

          // Step particles above player
          this.emitter = this.add.particles(0, 0, 'particle', {
            speed: { min: 25, max: 65 },
            scale: { start: 0.5, end: 0 },
            alpha: { start: 0.8, end: 0 },
            lifespan: 280,
            quantity: 5,
            tint: [0x10b981, 0xffd700, 0x38bdf8],
            emitting: false,
          }).setDepth(11);

          this.cameras.main.setBounds(0, 0, CW, CH);
        }

        // ── Map rebuild (on area change) ───────────────────────────────────
        private rebuildMap(area: AreaId) {
          // Destroy all old tile objects and entity sprites
          for (const obj of this.tileObjects) obj.destroy();
          this.tileObjects = [];
          for (const [, c] of this.npcSprites)    c.destroy();
          for (const [, c] of this.enemyContainers) c.destroy();
          this.npcSprites.clear();
          this.enemyContainers.clear();
          this.enemyHpFills.clear();

          const bgCol = area === 'dungeon' ? 0x080810 : 0x0a120a;
          this.cameras.main.setBackgroundColor(bgCol);

          // Tiles (depth 0)
          for (let y = 0; y < GH; y++) {
            for (let x = 0; x < GW; x++) {
              const kind = GET_TILE[area](x, y);
              const img = this.add.image(x*TS+TS/2, y*TS+TS/2, `tile_${kind}`).setDepth(0);
              this.tileObjects.push(img);
            }
          }

          // Portal labels (depth 1)
          for (const p of PORTALS[area]) {
            const t = this.add.text(
              p.x*TS+TS/2, p.y*TS+TS/2, p.label,
              { fontFamily:'monospace', fontSize:`${Math.round(TS/5.5)}px`, color:'#000', fontStyle:'bold' }
            ).setOrigin(0.5).setDepth(1);
            this.tileObjects.push(t);
          }

          // Subtle grid (depth 1)
          const grid = this.add.graphics().setDepth(1);
          grid.lineStyle(1, 0xffffff, 0.025);
          for (let x = 0; x <= GW; x++) grid.lineBetween(x*TS, 0, x*TS, CH);
          for (let y = 0; y <= GH; y++) grid.lineBetween(0, y*TS, CW, y*TS);
          this.tileObjects.push(grid);

          // NPCs (depth 5)
          for (const npc of NPCS.filter(n => n.area === area)) {
            const c = this.add.container(npc.x*TS+TS/2, npc.y*TS+TS/2).setDepth(5);
            c.add(this.add.image(0, 0, 'npc_bg'));
            c.add(this.add.text(0, 2, npc.sprite, { fontSize:`${TS-14}px`, fontFamily:'serif' }).setOrigin(0.5));
            c.add(this.add.text(0, -TS/2-3, npc.name.split(' ')[0],
              { fontFamily:'monospace', fontSize:`${Math.round(TS/6)}px`, color:'#aaddff' }
            ).setOrigin(0.5, 1));
            this.npcSprites.set(npc.id, c);
          }

          // Enemies for this area (depth 5)
          for (const e of ref.current.enemies.filter((e: { area: AreaId }) => e.area === area)) {
            this.createEnemySprite(e);
          }
        }

        // ── Enemy sprite factory ───────────────────────────────────────────
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        private createEnemySprite(enemy: any) {
          const c = this.add.container(enemy.x*TS+TS/2, enemy.y*TS+TS/2).setDepth(5);
          c.add(this.add.image(0, 0, 'enemy_bg'));
          c.add(this.add.text(0, 3, enemy.def.sprite, { fontSize:`${TS-14}px`, fontFamily:'serif' }).setOrigin(0.5));

          // HP bar drawn via Graphics — guaranteed to work in Phaser 4
          const hpG = this.add.graphics();
          this.drawHpBar(hpG, enemy.hp, enemy.def.hp);
          c.add(hpG);
          this.enemyContainers.set(enemy.uid, c);
          this.enemyHpFills.set(enemy.uid, { graphics: hpG, maxHp: enemy.def.hp });
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        private drawHpBar(g: any, hp: number, maxHp: number) {
          g.clear();
          const bw = TS - 4, bh = 4, bx = -(TS-4)/2, by = -TS/2 + 2;
          g.fillStyle(0x500000); g.fillRect(bx, by, bw, bh);
          g.fillStyle(0xff4444); g.fillRect(bx, by, Math.floor(bw * Math.max(0, hp) / maxHp), bh);
        }

        // ── update (60fps) ─────────────────────────────────────────────────
        update() {
          const { player, enemies } = ref.current;

          // Area change — full rebuild
          if (player.area !== this.lastArea) {
            this.lastArea = player.area;
            this.cameras.main.flash(250, 16, 185, 129);
            this.rebuildMap(player.area);
            this.playerContainer.setPosition(player.x*TS+TS/2, player.y*TS+TS/2);
            this.lastPX = player.x; this.lastPY = player.y;
            return;
          }

          // Player movement tween
          if ((player.x !== this.lastPX || player.y !== this.lastPY) && !this.moving) {
            this.moving = true;
            const tx = player.x*TS+TS/2, ty = player.y*TS+TS/2;
            this.tweens.add({
              targets: this.playerContainer,
              x: tx, y: ty,
              duration: 100,
              ease: 'Cubic.easeOut',
              onComplete: () => {
                this.moving = false;
                this.emitter.setPosition(tx, ty + TS/2 - 4);
                this.emitter.explode(4);
              },
            });
            this.lastPX = player.x; this.lastPY = player.y;
          }

          // Weapon icon on player (update only when equipped item changes)
          const weaponIcon = player.weapon?.icon ?? '';
          if (weaponIcon !== this.lastWeaponIcon) {
            this.lastWeaponIcon = weaponIcon;
            // Remove old weapon text (index 1 if present)
            if (this.playerContainer.list.length > 1) {
              this.playerContainer.list[1].destroy();
              this.playerContainer.removeAt(1);
            }
            if (weaponIcon) {
              this.playerContainer.add(
                this.add.text(TS/2 - 4, -TS/2 + 2, weaponIcon,
                  { fontSize:`${Math.round(TS/4)}px`, fontFamily:'serif' }
                ).setOrigin(1, 0)
              );
            }
          }

          // Sync enemy sprites
          const areaEnemies = enemies.filter((e: { area: AreaId }) => e.area === player.area);
          const liveIds = new Set(areaEnemies.map((e: { uid: string }) => e.uid));

          // Remove defeated enemies
          for (const [uid, c] of this.enemyContainers) {
            if (!liveIds.has(uid)) {
              c.destroy();
              this.enemyContainers.delete(uid);
              this.enemyHpFills.delete(uid);
            }
          }

          // Add new or update existing
          for (const enemy of areaEnemies) {
            if (!this.enemyContainers.has(enemy.uid)) {
              this.createEnemySprite(enemy);
            } else {
              const data = this.enemyHpFills.get(enemy.uid);
              if (data) this.drawHpBar(data.graphics, enemy.hp, data.maxHp);
            }
          }
        }
      }

      gameRef.current = new Phaser.Game({
        type: Phaser.AUTO,
        width: CW,
        height: CH,
        backgroundColor: '#0a120a',
        parent: el,
        scene: GameScene,
        // Disable Phaser's own input — React handles keyboard
        input: { keyboard: false, mouse: false, touch: false },
      });
    });

    return () => {
      cancelled = true;
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={containerRef} style={{ lineHeight: 0, width: CW, height: CH }} />;
}
