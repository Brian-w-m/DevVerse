'use client';

import { useEffect, useRef } from 'react';

// All Phaser code lives inside useEffect so it only runs in the browser
// after the module resolves — Phaser 4 has no usable top-level default export.

const TILE = 48;
const MAP: number[][] = [
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,0,0,0,0,1,0,0,0,0,0,0,0,0,1,0,0,0,0,1],
  [1,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,1],
  [1,1,1,0,1,1,0,0,0,1,1,0,0,0,1,1,1,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,1],
  [1,0,0,0,0,0,0,1,0,0,0,0,1,0,0,0,1,0,0,1],
  [1,0,0,1,1,0,0,1,0,0,0,0,1,0,0,0,0,0,0,1],
  [1,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,1,1,1,0,0,0,0,1,0,0,1],
  [1,0,0,0,0,1,0,0,0,1,0,1,0,0,0,0,1,0,0,1],
  [1,0,0,0,0,1,0,0,0,1,1,1,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
];
const COLS = MAP[0].length;
const ROWS = MAP.length;

const NPC_PATH = [
  {tx:2,ty:2},{tx:5,ty:2},{tx:5,ty:5},{tx:8,ty:5},
  {tx:8,ty:8},{tx:5,ty:8},{tx:2,ty:8},{tx:2,ty:5},
];

export default function PhaserGame() {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const gameRef = useRef<any>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    let cancelled = false;   // guard against StrictMode double-invoke

    // Dynamic import — keeps Phaser entirely out of the SSR/module-eval path
    import('phaser').then((mod) => {
      if (cancelled || gameRef.current) return;
      // Phaser 4 exports everything as named exports; the namespace object IS Phaser
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const Phaser: any = mod;

      const C = {
        floorA:  0x1a2a12, floorB:  0x223318,
        wall:    0x2a2a3e, wallEdge: 0x3a3a5a,
        portal:  0xb8860b, portalG: 0xffd700,
        player:  0x10b981, playerD: 0x0d9268,
        npc:     0x38bdf8,
      };

      class DevScene extends Phaser.Scene {
        private player: any;
        private npc: any;
        private moving = false;
        private px = 2; private py = 2;
        private npcIdx = 0;
        private npcMoving = false;
        private emitter: any;
        private label: any;
        private stepCount = 0;

        constructor() { super('DevScene'); }

        preload() {
          const g = this.make.graphics({ x: 0, y: 0 });

          g.fillStyle(C.floorA); g.fillRect(0,0,TILE,TILE);
          g.fillStyle(C.floorB,0.5); g.fillRect(4,8,3,3); g.fillRect(18,22,3,3);
          g.generateTexture('floor_a',TILE,TILE); g.clear();

          g.fillStyle(C.floorB); g.fillRect(0,0,TILE,TILE);
          g.fillStyle(C.floorA,0.5); g.fillRect(8,4,3,3); g.fillRect(24,28,3,3);
          g.generateTexture('floor_b',TILE,TILE); g.clear();

          g.fillStyle(C.wall); g.fillRect(0,0,TILE,TILE);
          g.lineStyle(1,C.wallEdge,1); g.strokeRect(0,0,TILE,TILE); g.strokeRect(3,3,TILE-6,TILE-6);
          g.generateTexture('wall',TILE,TILE); g.clear();

          g.fillStyle(C.portal); g.fillRect(0,0,TILE,TILE);
          g.fillStyle(C.portalG,0.8); g.fillRect(5,5,TILE-10,TILE-10);
          g.fillStyle(0xffffff,0.4); g.fillRect(10,10,TILE-20,TILE-20);
          g.generateTexture('portal',TILE,TILE); g.clear();

          g.fillStyle(C.playerD); g.fillRect(4,4,TILE-8,TILE-8);
          g.fillStyle(C.player);  g.fillRect(6,6,TILE-12,TILE-12);
          g.fillStyle(0xf4a79e);  g.fillRect(14,8,20,16);
          g.fillStyle(0x000000);  g.fillRect(17,11,4,4); g.fillRect(27,11,4,4);
          g.generateTexture('player',TILE,TILE); g.clear();

          g.fillStyle(0x1a3a5a); g.fillRect(4,4,TILE-8,TILE-8);
          g.fillStyle(C.npc,0.9); g.fillRect(6,6,TILE-12,TILE-12);
          g.fillStyle(0xf4e0a0); g.fillRect(14,8,20,16);
          g.fillStyle(0x000000); g.fillRect(17,11,4,4); g.fillRect(27,11,4,4);
          g.generateTexture('npc',TILE,TILE); g.clear();

          g.fillStyle(0xffffff); g.fillCircle(4,4,4);
          g.generateTexture('particle',8,8);
          g.destroy();
        }

        create() {
          const W = COLS*TILE, H = ROWS*TILE;
          this.add.rectangle(W/2,H/2,W,H,0x080810);

          for (let row=0;row<ROWS;row++) {
            for (let col=0;col<COLS;col++) {
              const t = MAP[row][col];
              const px = col*TILE+TILE/2, py = row*TILE+TILE/2;
              if (t===0) {
                this.add.image(px,py,(col+row)%2===0?'floor_a':'floor_b');
              } else if (t===1) {
                this.add.image(px,py,'wall');
              } else if (t===2) {
                this.add.image(px,py,'portal');
                this.add.text(px,py,'EXIT',{fontFamily:'monospace',fontSize:'9px',color:'#000',fontStyle:'bold'}).setOrigin(0.5);
              }
            }
          }

          const grid = this.add.graphics();
          grid.lineStyle(1,0xffffff,0.04);
          for (let c=0;c<=COLS;c++) grid.lineBetween(c*TILE,0,c*TILE,H);
          for (let r=0;r<=ROWS;r++) grid.lineBetween(0,r*TILE,W,r*TILE);

          this.emitter = this.add.particles(0,0,'particle',{
            speed:{min:30,max:80}, scale:{start:0.6,end:0},
            alpha:{start:0.9,end:0}, lifespan:350, quantity:6,
            tint:[0x10b981,0x38bdf8,0xffd700], emitting:false,
          });

          const npcStart = NPC_PATH[0];
          this.npc = this.add.container(npcStart.tx*TILE+TILE/2, npcStart.ty*TILE+TILE/2);
          this.npc.add(this.add.image(0,0,'npc'));
          this.npc.add(this.add.text(0,-TILE/2-4,'Scout',{fontFamily:'monospace',fontSize:'10px',color:'#7dd3fc'}).setOrigin(0.5,1));
          this.scheduleNpcMove();

          this.player = this.add.container(this.px*TILE+TILE/2, this.py*TILE+TILE/2);
          this.player.add(this.add.image(0,0,'player'));

          this.cameras.main.setBounds(0,0,W,H);
          this.cameras.main.startFollow(this.player,true,0.1,0.1);
          this.cameras.main.setZoom(1.4);

          this.label = this.add.text(10,10,
            'WASD / Arrow keys to move\nStep on the portal (bottom-right) to warp',
            {fontFamily:'monospace',fontSize:'11px',color:'#10b981',lineSpacing:4}
          ).setScrollFactor(0).setDepth(10);

          this.input.keyboard!.on('keydown',(e: KeyboardEvent)=>{
            if (this.moving) return;
            const dirs: Record<string,[number,number]> = {
              ArrowUp:[0,-1],ArrowDown:[0,1],ArrowLeft:[-1,0],ArrowRight:[1,0],
              w:[0,-1],s:[0,1],a:[-1,0],d:[1,0],
              W:[0,-1],S:[0,1],A:[-1,0],D:[1,0],
            };
            const d = dirs[e.key];
            if (d) this.tryMove(d[0],d[1]);
          });
        }

        private tryMove(dx: number, dy: number) {
          const nx=this.px+dx, ny=this.py+dy;
          if (nx<0||nx>=COLS||ny<0||ny>=ROWS) return;
          if (MAP[ny][nx]===1) { this.cameras.main.shake(80,0.004); return; }
          this.moving=true; this.px=nx; this.py=ny;
          const tx=nx*TILE+TILE/2, ty=ny*TILE+TILE/2;
          this.tweens.add({
            targets:this.player, x:tx, y:ty, duration:110, ease:'Cubic.easeOut',
            onComplete:()=>{
              this.moving=false;
              if (++this.stepCount%2===0) { this.emitter.setPosition(tx,ty+TILE/2-4); this.emitter.explode(6); }
              if (MAP[ny][nx]===2) {
                this.cameras.main.flash(300,16,185,129);
                this.label.setText('✨ Portal activated! (warp demo)');
                this.time.delayedCall(600,()=>{
                  this.px=2; this.py=2;
                  this.player.setPosition(2*TILE+TILE/2,2*TILE+TILE/2);
                  this.cameras.main.flash(300,56,189,248);
                  this.label.setText('WASD / Arrow keys to move\nStep on the portal (bottom-right) to warp');
                });
              }
            },
          });
        }

        private scheduleNpcMove() {
          this.time.delayedCall(Phaser.Math.Between(1200,2400),()=>{
            if (this.npcMoving) return;
            this.npcMoving=true;
            const {tx,ty}=NPC_PATH[++this.npcIdx%NPC_PATH.length];
            this.npcIdx=this.npcIdx%NPC_PATH.length;
            this.tweens.add({
              targets:this.npc, x:tx*TILE+TILE/2, y:ty*TILE+TILE/2,
              duration:400, ease:'Quad.easeInOut',
              onComplete:()=>{ this.npcMoving=false; this.scheduleNpcMove(); },
            });
          });
        }
      }

      gameRef.current = new Phaser.Game({
        type: Phaser.AUTO,
        width:  COLS*TILE,
        height: ROWS*TILE,
        backgroundColor: '#080810',
        parent: el,
        scene: DevScene,
      });
    });

    return () => {
      cancelled = true;
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, []);

  return <div ref={containerRef} style={{ lineHeight: 0 }} />;
}
