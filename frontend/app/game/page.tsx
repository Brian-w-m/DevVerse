'use client';

import { useEffect, useRef, useState } from 'react';

interface Position {
  x: number;
  y: number;
}

interface NPC {
  id: string;
  name: string;
  x: number;
  y: number;
  dialogue: string;
  sprite: string;
}

interface Item {
  id: string;
  name: string;
  icon: string;
}

const TILE_SIZE = 44;
const GRID_WIDTH = 20;
const GRID_HEIGHT = 15;
const PLAYABLE_AREA_WIDTH = TILE_SIZE * GRID_WIDTH;
const PLAYABLE_AREA_HEIGHT = TILE_SIZE * GRID_HEIGHT;

const NPCs: NPC[] = [
  {
    id: 'elder',
    name: 'Guild Elder',
    x: 5,
    y: 5,
    dialogue: 'Welcome, adventurer! Defend our village.',
    sprite: '👴'
  },
  {
    id: 'merchant',
    name: 'Merchant Kaine',
    x: 10,
    y: 8,
    dialogue: 'I have rare items... if you can afford them!',
    sprite: '🧙'
  },
  {
    id: 'blacksmith',
    name: 'Thoin the Blacksmith',
    x: 15,
    y: 6,
    dialogue: 'Forge your destiny. I can upgrade your gear.',
    sprite: '⚒️'
  },
  {
    id: 'bard',
    name: 'Lute the Bard',
    x: 8,
    y: 12,
    dialogue: 'Haha! The tales I could tell...',
    sprite: '🎵'
  }
];

export default function GamePage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [playerPos, setPlayerPos] = useState<Position>({ x: 10, y: 10 });
  const [inventory, setInventory] = useState<Item[]>([
    { id: 'sword', name: 'Iron Sword', icon: '⚔️' }
  ]);
  const [selectedNPC, setSelectedNPC] = useState<NPC | null>(null);
  const [showInventory, setShowInventory] = useState(false);
  const keysPressed = useRef<Record<string, boolean>>({});

  // Tile data for the world
  const getTileType = (x: number, y: number): string => {
    // Grass
    if (x >= 1 && x < GRID_WIDTH - 1 && y >= 1 && y < GRID_HEIGHT - 1) {
      return 'grass';
    }
    // Border (stone)
    return 'stone';
  };

  // Handle keyboard input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysPressed.current[e.key.toLowerCase()] = true;

      if (e.key === 'i' || e.key === 'I') {
        setShowInventory(!showInventory);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current[e.key.toLowerCase()] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    const moveInterval = setInterval(() => {
      setPlayerPos((prev) => {
        let newPos = { ...prev };

        if (keysPressed.current['arrowup'] || keysPressed.current['w']) {
          newPos.y = Math.max(0, newPos.y - 1);
        }
        if (keysPressed.current['arrowdown'] || keysPressed.current['s']) {
          newPos.y = Math.min(GRID_HEIGHT - 1, newPos.y + 1);
        }
        if (keysPressed.current['arrowleft'] || keysPressed.current['a']) {
          newPos.x = Math.max(0, newPos.x - 1);
        }
        if (keysPressed.current['arrowright'] || keysPressed.current['d']) {
          newPos.x = Math.min(GRID_WIDTH - 1, newPos.x + 1);
        }

        // Check for NPC interaction
        const npc = NPCs.find(n => n.x === newPos.x && n.y === newPos.y);
        if (npc) {
          setSelectedNPC(npc);
        } else {
          setSelectedNPC(null);
        }

        return newPos;
      });
    }, 100);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      clearInterval(moveInterval);
    };
  }, [showInventory]);

  // Render canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, PLAYABLE_AREA_WIDTH, PLAYABLE_AREA_HEIGHT);

    // Draw grid background
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    for (let x = 0; x <= GRID_WIDTH; x++) {
      ctx.beginPath();
      ctx.moveTo(x * TILE_SIZE, 0);
      ctx.lineTo(x * TILE_SIZE, PLAYABLE_AREA_HEIGHT);
      ctx.stroke();
    }
    for (let y = 0; y <= GRID_HEIGHT; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * TILE_SIZE);
      ctx.lineTo(PLAYABLE_AREA_WIDTH, y * TILE_SIZE);
      ctx.stroke();
    }

    // Draw tiles
    for (let y = 0; y < GRID_HEIGHT; y++) {
      for (let x = 0; x < GRID_WIDTH; x++) {
        const tileType = getTileType(x, y);
        if (tileType === 'grass') {
          ctx.fillStyle = '#2d5016';
          ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
          // Add grass texture
          ctx.fillStyle = 'rgba(100, 200, 50, 0.2)';
          ctx.fillRect(x * TILE_SIZE + 4, y * TILE_SIZE + 4, 4, 4);
          ctx.fillRect(x * TILE_SIZE + 20, y * TILE_SIZE + 16, 4, 4);
        } else {
          ctx.fillStyle = '#4a4a6a';
          ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
          ctx.strokeStyle = '#3a3a5a';
          ctx.lineWidth = 1;
          ctx.strokeRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        }
      }
    }

    // Draw NPCs
    NPCs.forEach((npc) => {
      const x = npc.x * TILE_SIZE + TILE_SIZE / 2;
      const y = npc.y * TILE_SIZE + TILE_SIZE / 2;

      // NPC glow if talking
      if (selectedNPC?.id === npc.id) {
        ctx.fillStyle = 'rgba(255, 215, 0, 0.3)';
        ctx.beginPath();
        ctx.arc(x, y, TILE_SIZE * 0.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // NPC sprite background
      ctx.fillStyle = '#3a5a7a';
      ctx.fillRect(npc.x * TILE_SIZE + 4, npc.y * TILE_SIZE + 4, TILE_SIZE - 8, TILE_SIZE - 8);

      // NPC emoji
      ctx.font = 'bold 22px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(npc.sprite, x, y);
    });

    // Draw player
    const playerX = playerPos.x * TILE_SIZE + TILE_SIZE / 2;
    const playerY = playerPos.y * TILE_SIZE + TILE_SIZE / 2;

    // Player shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.beginPath();
    ctx.ellipse(playerX, playerY + TILE_SIZE * 0.35, TILE_SIZE * 0.25, TILE_SIZE * 0.1, 0, 0, Math.PI * 2);
    ctx.fill();

    // Player sprite background
    ctx.fillStyle = '#8b5a3c';
    ctx.fillRect(playerPos.x * TILE_SIZE + 4, playerPos.y * TILE_SIZE + 4, TILE_SIZE - 8, TILE_SIZE - 8);

    // Player body
    ctx.fillStyle = '#ff6b35';
    ctx.fillRect(playerPos.x * TILE_SIZE + 8, playerPos.y * TILE_SIZE + 8, TILE_SIZE - 16, 12);

    // Player head
    ctx.fillStyle = '#f4a79e';
    ctx.fillRect(playerPos.x * TILE_SIZE + 10, playerPos.y * TILE_SIZE + 6, 12, 12);

    // Player eyes
    ctx.fillStyle = '#000';
    ctx.fillRect(playerPos.x * TILE_SIZE + 12, playerPos.y * TILE_SIZE + 8, 2, 2);
    ctx.fillRect(playerPos.x * TILE_SIZE + 17, playerPos.y * TILE_SIZE + 8, 2, 2);

    // Player sword
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(playerX + 10, playerY - 8);
    ctx.lineTo(playerX + 12, playerY - 16);
    ctx.stroke();
  }, [playerPos, selectedNPC]);

  const pickupItem = () => {
    if (!selectedNPC) return;
    const itemMap: Record<string, Item> = {
      elder: { id: 'ancient-scroll', name: 'Ancient Scroll', icon: '📜' },
      merchant: { id: 'rare-gem', name: 'Rare Gem', icon: '💎' },
      blacksmith: { id: 'legendary-armor', name: 'Legendary Armor', icon: '🛡️' },
      bard: { id: 'magic-lute', name: 'Magic Lute', icon: '🎸' }
    };

    const item = itemMap[selectedNPC.id];
    if (item && !inventory.some(i => i.id === item.id)) {
      setInventory([...inventory, item]);
    }
  };

  return (
    <div className="h-screen overflow-hidden bg-[#0f0f1e] text-white font-mono flex items-center justify-center p-3">
      <style>{`
        * {
          cursor: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><rect width="32" height="32" fill="none"/><path d="M8 4v24M4 8h24" stroke="white" stroke-width="2"/></svg>') 16 16, auto;
        }

        @keyframes pixelBounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }

        .pixel-title {
          font-size: 2rem;
          font-weight: 900;
          letter-spacing: 2px;
          text-shadow: 3px 3px #ff6b35, 6px 6px #4a4a6a;
          animation: pixelBounce 1s ease-in-out infinite;
        }
      `}</style>

      <div className="flex flex-col gap-2">
      {/* Header row */}
      <div className="flex items-center justify-between mb-2">
        <h1 className="pixel-title">⚔️ PIXEL QUEST ⚔️</h1>
        <div className="text-right text-xs text-gray-400 leading-relaxed">
          <p>WASD / Arrow Keys — Move</p>
          <p>I — Inventory &nbsp;•&nbsp; E — Interact</p>
        </div>
      </div>

      {/* Main area: canvas left, sidebar right */}
      <div className="flex gap-4">

        {/* Game Canvas */}
        <div
          className="relative border-4 border-yellow-400 flex-shrink-0 self-start"
          style={{ boxShadow: '0 0 20px rgba(255, 215, 0, 0.5)' }}
        >
          <canvas
            ref={canvasRef}
            width={PLAYABLE_AREA_WIDTH}
            height={PLAYABLE_AREA_HEIGHT}
            className="block bg-black"
          />
          {selectedNPC && (
            <div className="absolute bottom-0 left-0 right-0 bg-black/90 border-t-2 border-yellow-400 p-3 text-sm">
              <div className="font-bold text-yellow-400">{selectedNPC.name}</div>
              <div className="text-gray-300 mt-1">{selectedNPC.dialogue}</div>
              <button
                onClick={pickupItem}
                className="mt-2 px-3 py-1 bg-yellow-400 text-black font-bold text-xs hover:bg-yellow-300 transition"
              >
                Take Item (E)
              </button>
            </div>
          )}
        </div>

        {/* Right Sidebar */}
        <div className="flex flex-col gap-3 w-64 overflow-y-auto flex-shrink-0">

          {/* Stats */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-gray-800 border-2 border-cyan-400 p-2 text-center">
              <div className="text-xs text-gray-400">POS</div>
              <div className="font-bold text-cyan-400 text-sm">{playerPos.x},{playerPos.y}</div>
            </div>
            <div className="bg-gray-800 border-2 border-green-400 p-2 text-center">
              <div className="text-xs text-gray-400">LVL</div>
              <div className="font-bold text-green-400 text-sm">1</div>
            </div>
            <div className="bg-gray-800 border-2 border-red-400 p-2 text-center">
              <div className="text-xs text-gray-400">HP</div>
              <div className="font-bold text-red-400 text-sm">100</div>
            </div>
          </div>

          {/* Inventory */}
          <div>
            <button
              onClick={() => setShowInventory(!showInventory)}
              className="w-full bg-purple-900 border-2 border-purple-400 p-2 font-bold text-purple-300 text-sm hover:bg-purple-800 transition mb-1"
            >
              📦 INVENTORY ({inventory.length})
            </button>
            {showInventory && (
              <div className="bg-gray-900 border-2 border-purple-400 p-3">
                {inventory.length === 0 ? (
                  <p className="text-gray-500 text-xs">Empty</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {inventory.map((item) => (
                      <div
                        key={item.id}
                        className="bg-gray-800 border border-purple-400 p-2 flex items-center gap-2 hover:bg-gray-700 transition"
                      >
                        <span className="text-xl">{item.icon}</span>
                        <div>
                          <div className="text-xs font-bold text-purple-300">{item.name}</div>
                          <div className="text-xs text-gray-500">Press to use</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Villagers */}
          <div className="bg-gray-900 border-2 border-yellow-400 p-3">
            <h3 className="font-bold text-yellow-400 mb-2 text-sm">🏘️ VILLAGERS</h3>
            <div className="flex flex-col gap-1">
              {NPCs.map((npc) => (
                <div
                  key={npc.id}
                  className={`p-2 text-xs border border-gray-600 ${selectedNPC?.id === npc.id ? 'bg-yellow-400/20 border-yellow-400' : 'bg-gray-800'}`}
                >
                  <div className="font-bold text-gray-300">{npc.sprite} {npc.name}</div>
                  <div className="text-gray-500">({npc.x}, {npc.y})</div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-auto text-center text-xs text-gray-600 pb-1">
            A DevVerse Pixel RPG Experience
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
