# DevVerse — Technical Design & Project Plan

> Last updated: April 2026  
> Stack: Go/Gin + DynamoDB · Next.js 16 / React 19 · Tailwind CSS 4 · VS Code Extension (TypeScript)

---

## Current State

| Component | Status |
|---|---|
| **Backend** | Go/Gin REST API; DynamoDB `Users` table (`ID, Name, Email, Score`); JWT auth via GitHub OAuth token exchange; `/auth/github`, `/stats/:id`, `/users/:id/score/add` endpoints |
| **Frontend** | Next.js App Router; landing page, dashboard (stats/leaderboard/activity), Pixel Quest game page; mock auth (`dev-user-001`) when no real session |
| **Extension** | Activates via VS Code GitHub OAuth; debounced `onDidChangeTextDocument` → `PATCH /users/:id/score/add`; status bar login item |
| **Game** | Canvas pixel RPG; town/forest/dungeon/cave areas; NPCs (healer/merchant/blacksmith/quest-giver); turn-based combat; gold derived from coding score via localStorage |

---

## Phase 1 — Extension: Consolidated Point Gaining

**Goal:** Make the extension the canonical, reliable source of coding activity data. Points should be richer, fairer, and more gameable in a good way.

### 1.1 Problems with the Current Extension

- Only counts raw `contentChanges.length` — a single paste scores the same as typing 200 characters
- No language awareness (writing Go should feel different from editing JSON config)
- No session concept — score trickles in with no sense of a "coding session"
- No local buffer — if backend is unreachable, edits are lost
- No feedback loop in VS Code — user has no idea how many points they've accumulated

### 1.2 Scoring Model

Replace the flat increment with a **weighted activity score**:

```
sessionPoints += characterDelta × languageMultiplier × activityBonus
```

| Signal | Implementation | Multiplier |
|---|---|---|
| Characters added | `change.text.length` | base `1.0` |
| Characters deleted | `change.rangeLength` | `0.3` (deletions count less) |
| Language bonus | extension → language map | see table below |
| Streak bonus | consecutive days with ≥1 session | `+10% per day`, cap `2.0×` |
| Session bonus | ≥30 min active session | `+20%` flat |

**Language multipliers** (stored in extension `package.json` contributes config so users can override):

| Category | Languages | Multiplier |
|---|---|---|
| Systems | `go`, `rust`, `c`, `cpp` | `1.5` |
| Backend | `python`, `java`, `typescript`, `javascript` | `1.2` |
| Frontend | `html`, `css`, `scss`, `svelte`, `vue` | `1.0` |
| Config/Data | `json`, `yaml`, `toml`, `xml` | `0.5` |
| Docs | `markdown`, `plaintext` | `0.3` |

### 1.3 Session Tracking

Define a **session** as: any period where at least one edit occurs within any rolling 5-minute window.

```
sessionStart = first edit after 5+ minute gap
sessionEnd   = last edit + 5 min of inactivity
sessionPoints are flushed to backend on sessionEnd or VS Code window close
```

Track in-memory with `SessionState`:

```typescript
interface SessionState {
  startedAt: number;       // timestamp
  lastEditAt: number;
  languageBreakdown: Record<string, number>;  // lang → chars
  totalPoints: number;
  streak: number;          // days, fetched from backend on activation
}
```

### 1.4 Local Buffer (Offline Resilience)

Persist a flush queue to VS Code's `globalStorageUri` (a JSON file). On each flush attempt:

1. Append to queue with `{ userId, points, sessionId, timestamp }`
2. Drain queue by posting to backend (oldest first)
3. On success, remove flushed items

This means no points are ever lost to a backend restart.

### 1.5 New Backend Endpoints Required

| Method | Path | Description |
|---|---|---|
| `PATCH` | `/users/:id/score/add` | *(existing)* Atomic increment |
| `POST` | `/users/:id/sessions` | Record a completed session (points, language breakdown, duration) |
| `GET` | `/users/:id/streak` | Return current streak count |
| `GET` | `/users/:id/activity` | Return daily activity for the last 30 days (for dashboard graph) |

**New DynamoDB tables:**

```
Sessions: { UserID (PK), SessionID (SK), StartedAt, EndedAt, Points, LanguageBreakdown }
DailyActivity: { UserID (PK), Date (SK), Points, SessionCount }
```

### 1.6 Extension UX

- **Status bar**: `⚡ DevVerse  +142 pts  🔥 7d`  (live session counter, streak)
- **Hover tooltip**: breakdown by language for current session
- **Notification on session end**: `"Session ended — +142 pts earned. Total: 8,390"`
- **Command palette**: `DevVerse: Show Stats` opens a Webview panel with a mini dashboard
- **Settings**: `devverse.languageMultipliers`, `devverse.minSessionGapMinutes`, `devverse.enabled`

### 1.7 Game Integration Update

Change the gold conversion formula on the game page from the flat `/20` to a tiered system:

```
gold = floor(sessionPoints / 50)    // 50 pts per gold piece
```

Session points are stored in `DailyActivity` so the dashboard can display them and the game can query them.

---

## Phase 2 — LeetCode Integration

**Goal:** Allow users to earn bonus points and rare in-game items by completing LeetCode problems.

### 2.1 Approach Options

Three viable approaches, ordered by implementation effort:

#### Option A — GraphQL Query (Recommended for MVP)

LeetCode exposes an unofficial (but stable) GraphQL API at `https://leetcode.com/graphql`. A backend service can query a user's recently accepted submissions:

```graphql
query recentAcSubmissions($username: String!, $limit: Int!) {
  recentAcSubmissionList(username: $username, limit: $limit) {
    id
    title
    titleSlug
    timestamp
  }
}
```

**Flow:**

1. User links their LeetCode username in the dashboard settings
2. Backend stores `leetcodeUsername` on the `User` model
3. A scheduled job (every 6 hours) or on-demand webhook queries LeetCode GraphQL for new accepted submissions since last check
4. New accepted problems are cross-referenced against the `LeetCodeSubmissions` table to prevent double-awarding
5. Points and items are awarded based on problem difficulty

```
DailyBonus (easy):   +200 pts  → small potion drop
Weekly (medium):     +600 pts  → equipment drop (uncommon)  
Monthly (hard):      +1500 pts → rare item drop + title badge
```

**Tradeoffs:** No LeetCode API key needed; rate limits apply (~10 req/min); requires user to have a public LeetCode profile.

#### Option B — Honesty System

Simplest to implement. User submits a screenshot or just self-reports a solved problem. Problem list is maintained server-side. Each problem can only be claimed once per account per rolling 30-day window.

- **Pro**: zero external dependency
- **Con**: gameable; less trustworthy for leaderboards

Suitable as a fallback if LeetCode blocks the GraphQL approach.

#### Option C — In-App Sandbox (Future Phase)

Pull LeetCode problem statements via GraphQL, present them in a code editor (Monaco) inside the frontend, run user code against test cases in a sandboxed environment (e.g. Judge0 API, AWS Lambda, or Firecracker microVMs).

- **Pro**: fully verifiable; best UX
- **Con**: significant infrastructure cost; Judge0 rate limits; test case data is not public via GraphQL
- Defer to a later iteration once the GraphQL approach proves traction

### 2.2 Backend Work (Option A)

New model:

```go
type LeetCodeSub struct {
    UserID      string
    ProblemSlug string
    SubmittedAt int64
    Difficulty  string // "Easy" | "Medium" | "Hard"
    Rewarded    bool
}
```

New endpoint: `POST /users/:id/leetcode/link` — stores username, triggers first sync.

Background worker (goroutine with ticker):

```go
// Runs every 6 hours
func syncLeetCodeSubmissions(db *dynamodb.Client, cfg Config) {
    // For each user with a linked leetcodeUsername:
    //   1. Query LeetCode GraphQL
    //   2. Filter new submissions since lastSyncAt
    //   3. Award points + game items
    //   4. Write to LeetCodeSubmissions table
}
```

### 2.3 Item Reward System

New `User` fields to support item drops:

```go
type User struct {
    // ... existing fields ...
    LeetcodeUsername string
    LastLeetcodeSync int64
    PendingDrops     []ItemDrop  // serialised JSON
}

type ItemDrop struct {
    ItemID    string
    Source    string  // "leetcode_easy" | "leetcode_medium" etc.
    CreatedAt int64
    Claimed   bool
}
```

The game page checks `GET /users/:id/drops` on load and injects unclaimed drops into the player's inventory (with a notification banner).

### 2.4 Dashboard UI

New "LeetCode" tab on the dashboard:

- Input to link/unlink LeetCode username
- List of claimed problems (title, difficulty, points awarded, date)
- Total LeetCode contribution to score
- "Pending items" section showing unclaimed drops with a "Claim in Pixel Quest" button

---

## Phase 3 — Game: Richer World & Story

**Goal:** Turn Pixel Quest from a proof-of-concept into a game with genuine progression, narrative, and replayability.

### 3.1 World Expansion

Current areas: `town`, `forest`, `dungeon`, `cave`

Proposed expansion:

```
town ──── forest ──── mountain
  │                      │
  └─── dungeon ──── volcano (boss)
         │
       cave ──── abyss (endgame)
```

Each area has:
- **Unique tileset palette** (1 background + 2 accent colours, already pattern-supported)
- **3–5 unique enemy types** with distinct behaviours (e.g. mountain enemies use multi-hit, volcano enemies burn for DoT)
- **1 area boss** with a dedicated combat sequence (3 phases, dialogue, unique drop)
- **Environmental hazards**: water tiles slow movement; lava tiles deal 5 HP per step

### 3.2 NPC Expansion

| NPC | Area | Function |
|---|---|---|
| Elder (existing quest giver) | Town | Main story quest line |
| Merchant (existing) | Town | Buy/sell consumables |
| Blacksmith (existing) | Town | Buy weapons/armour |
| Healer (existing) | Town | Restore HP/MP |
| Scout | Forest | Gives hunting bounties (kill N enemies → reward) |
| Archivist | Dungeon | Sells lore scrolls; unlocks hidden passage |
| Mountain Guide | Mountain | Quest gating passage to Volcano |
| Volcano Keeper | Volcano | Boss trigger + post-boss reward shop |
| Abyss Watcher | Abyss | Final boss trigger |

### 3.3 Story Structure

Three-act structure conveyed entirely through NPC dialogue:

**Act 1 — The Glitch** (town + forest + dungeon)
> Strange errors have appeared in the code of the world. The Elder asks you to investigate the forest and descend into the dungeon.

**Act 2 — The Corruption** (cave + mountain + volcano)
> The source of the corruption is a rogue process deep in the volcano. The Mountain Guide warns you the path is dangerous. You must upgrade your gear at the Blacksmith first.

**Act 3 — The Abyss** (abyss)
> The rogue process has spawned a final boss — the `SEGFAULT` entity. Defeating it permanently upgrades your coding multiplier in the extension by `+10%`.

### 3.4 Item & Equipment System

Expand the item catalogue:

| Category | Items | Effect |
|---|---|---|
| Consumables | Minor Potion, Potion, Elixir, Antidote | HP/MP restore; status cure |
| Weapons (Tiers 1–5) | Dagger → Sword → Broadsword → Runeblade → Debugger | ATK +5 per tier |
| Armour (Tiers 1–5) | Cloth → Leather → Chain → Plate → Dev Hoodie | DEF +5 per tier |
| Accessories | Focus Ring (+MP), War Band (+ATK), Shield Charm (+DEF) | Slot: 1 equipped at a time |
| Rare Drops | Compiler's Edge (crit chance), Null Pointer (lifesteal) | LeetCode-only drops |
| Quest Items | Elder's Seal, Archivist's Key, Flame Core | Non-equippable; unlock story gates |

### 3.5 Combat Expansion

New combat actions:

| Action | Effect |
|---|---|
| Attack | `(playerATK − enemyDEF) ± random` damage |
| Defend | Halve next hit; currently implemented |
| Skill | Spend MP for a guaranteed-hit special move |
| Flee | 60% success; fails against bosses |

New status effects: `Burn`, `Slow`, `Stun`, `Poison` — all with a visible indicator in the combat UI.

### 3.6 Save System Migration

Move from `localStorage` JSON blob to a **versioned save format**:

```typescript
interface SaveV2 {
  version: 2;
  player: Player;
  inventory: Item[];
  questFlags: Record<string, boolean>;  // "act1_complete", "met_elder", etc.
  defeatedBossIds: string[];
  enemies: Enemy[];
  msgs: string[];
}
```

Include a migration function `migrateSave(raw: unknown): SaveV2` that handles v1 saves.

---

## Phase 4 — Sprite-Based Rendering

**Goal:** Replace the emoji/rectangle canvas rendering with proper pixel art sprites.

### 4.1 Sprite Sheet Format

Use a single sprite sheet PNG (`public/sprites.png`) with a 16×16 px grid per frame. Reference by tile index.

Recommended tool chain:
- **Aseprite** for sprite creation/export
- Export to: `sprites.png` (sheet) + `sprites.json` (Aseprite frame metadata)

Initial sprite requirements:

| Category | Frames needed |
|---|---|
| Tiles | grass (4 variants), wall, water (2 anim frames), tree, stone, dungeon floor, portal |
| Player | idle (2), walk down/up/left/right (3 each), attack (2) |
| NPCs | elder, merchant, blacksmith, healer (idle 2 frames each) |
| Enemies | slime, goblin, skeleton, fire elemental, boss (idle + attack 2 frames each) |
| UI chrome | HP/MP bar ends, item slot, button borders |

### 4.2 Rendering Architecture Change

Replace `drawTile()` / `drawCanvas()` flat function with a **renderer class**:

```typescript
class SpriteRenderer {
  private sheet: HTMLImageElement;
  private frameMap: Record<string, FrameRect>;  // from sprites.json

  draw(ctx, frameKey: string, dx: number, dy: number, scale = 1) { ... }
  drawAnimated(ctx, frameKeys: string[], tick: number, ...) { ... }
}
```

`tick` drives animation (increment in `requestAnimationFrame`, modulo frame count).

### 4.3 Animation Loop Change

Current rendering is triggered by React state (`tick` state → `useEffect`). For smooth sprite animation this needs to become a proper `requestAnimationFrame` loop:

```typescript
useEffect(() => {
  let animId: number;
  let frame = 0;
  const loop = () => {
    frame++;
    drawCanvas(ctx, gs(), renderer, frame);
    animId = requestAnimationFrame(loop);
  };
  animId = requestAnimationFrame(loop);
  return () => cancelAnimationFrame(animId);
}, []);
```

Game logic mutations (move, combat, dialogue) remain event-driven and write to the `gsRef` mutable ref — the render loop just reads it every frame.

### 4.4 Asset Loading

Preload sprite sheet before rendering begins:

```typescript
const [spriteReady, setSpriteReady] = useState(false);
useEffect(() => {
  const img = new Image();
  img.src = '/sprites.png';
  img.onload = () => { rendererRef.current = new SpriteRenderer(img); setSpriteReady(true); };
}, []);
```

Show a loading indicator on the canvas until `spriteReady`.

### 4.5 UI Component Update

Once sprites are in place:
- Sidebar HP/MP bars replaced with sprite-sheet UI frames
- NPC portraits (48×48 px) shown in the dialogue overlay
- Item icons from the sprite sheet shown in inventory slots (grid layout)

---

## Phase 5 — Real GitHub Authentication

**Goal:** Replace the mock `dev-user-001` local session with a proper OAuth 2.0 GitHub flow, secure JWT sessions, and user profile persistence.

### 5.1 Current Auth Flow (What Needs Replacing)

```
Frontend → hardcodes userId in localStorage → GET /stats/dev-user-001
Extension → vscode.authentication.getSession('github') → POST /auth/github → JWT stored in secrets
```

The web and extension are using different auth paths. They need to be unified.

### 5.2 Target Auth Flow

```
Browser:
  User → "Login with GitHub" → /api/auth/github (Next.js route) 
    → redirect github.com/login/oauth/authorize?client_id=...
    → GitHub → callback /api/auth/callback?code=...
    → exchange code for access_token (server-side, secret safe)
    → POST /auth/github { accessToken } to Go backend
    → backend returns { token (JWT), user { id, name, email, avatarUrl } }
    → store JWT in httpOnly cookie (not localStorage)
    → redirect to /dashboard

Extension:
  vscode.authentication.getSession('github') (unchanged)
    → POST /auth/github { accessToken } to backend
    → JWT stored in context.secrets (unchanged)
```

### 5.3 Backend Changes

**`User` model additions:**

```go
type User struct {
    ID          string `dynamodbav:"ID"`
    Name        string `dynamodbav:"Name"`
    Email       string `dynamodbav:"Email"`
    AvatarURL   string `dynamodbav:"AvatarURL"`
    GithubLogin string `dynamodbav:"GithubLogin"`  // @username
    Score       int    `dynamodbav:"Score"`
    CreatedAt   int64  `dynamodbav:"CreatedAt"`
    LastSeenAt  int64  `dynamodbav:"LastSeenAt"`
}
```

**`POST /auth/github` flow update:**

```
1. Receive { accessToken }
2. Call GET https://api.github.com/user with token
3. Extract id, login, name, email, avatar_url
4. Upsert user in DynamoDB (key = "github:" + github_id, stable across renames)
5. Issue signed JWT { sub: userId, exp: 7d }
6. Return { token, user }
```

**New endpoint:** `GET /users/me` — returns the authenticated user's full profile from JWT sub claim.

### 5.4 Frontend Next.js Auth Routes

Create Next.js Route Handlers (App Router):

```
app/api/auth/github/route.ts     → redirect to GitHub OAuth URL
app/api/auth/callback/route.ts   → exchange code, call backend, set httpOnly cookie
app/api/auth/logout/route.ts     → clear cookie, redirect to /
```

**Session reading:**

```typescript
// lib/session.ts
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';

export async function getSession() {
  const token = (await cookies()).get('devverse_token')?.value;
  if (!token) return null;
  const { payload } = await jwtVerify(token, secret);
  return payload as SessionPayload;
}
```

Use `getSession()` in Server Components (layout, dashboard) to gate routes.

**Middleware** (`middleware.ts`):

```typescript
export function middleware(req: NextRequest) {
  const token = req.cookies.get('devverse_token');
  if (!token && req.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/', req.url));
  }
}
```

### 5.5 Replacing Mock Auth

Remove all references to `dev-user-001`, `devverse.userId` in `localStorage`, and the `useMockData` flag. Replace with:

```typescript
// In dashboard/page.tsx (Server Component)
const session = await getSession();
if (!session) redirect('/');
const data = await fetch(`${BACKEND}/stats/${session.userId}`, { ... });
```

For the game page (Client Component), pass the user ID as a prop from the parent Server Component or via a context provider.

### 5.6 GitHub OAuth App Setup (Environments)

| Environment | Callback URL |
|---|---|
| Local | `http://localhost:3000/api/auth/callback` |
| Staging | `https://staging.devverse.app/api/auth/callback` |
| Production | `https://devverse.app/api/auth/callback` |

Required env vars:

```env
# frontend/.env.local
NEXT_PUBLIC_GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
NEXT_PUBLIC_BACKEND_URL=http://localhost:8080
JWT_SECRET=...   # same secret used by Go backend for verification
```

---

## Cross-Cutting Concerns

### Error Handling & Observability

- Backend: structured JSON logging (already partially in place via `utils/logger.go`)
- Add request-id middleware to Go API for trace correlation
- Extension: surface errors in status bar tooltip only (no modal spam)
- Frontend: add an `ErrorBoundary` around the game canvas; on crash, show "Save & Reload" button

### Testing Strategy

| Layer | Tool | Coverage target |
|---|---|---|
| Backend (Go) | `go test` + `testify` | All service functions, auth middleware |
| Extension | `vitest` or `jest` | Scoring logic unit tests (pure functions, no VS Code API) |
| Frontend | `playwright` | Auth flow E2E, dashboard render, game canvas smoke test |

### Database Schema Evolution

DynamoDB tables to add (beyond current `Users`):

| Table | PK | SK | Notes |
|---|---|---|---|
| `Sessions` | `UserID` | `SessionID` | Extension coding sessions |
| `DailyActivity` | `UserID` | `Date (YYYY-MM-DD)` | Aggregated per-day stats |
| `LeetCodeSubs` | `UserID` | `ProblemSlug#Timestamp` | Dedup guard |
| `ItemDrops` | `UserID` | `DropID` | Pending/claimed game drops |

### Deployment

Current: Docker Compose (local only). Suggested path to production:

1. **Phase 1–2**: Deploy to a single VPS (Fly.io or Railway) — Go binary + DynamoDB (AWS free tier)
2. **Phase 3–4**: CDN for sprite assets (Cloudflare R2); no backend changes needed
3. **Phase 5**: Enable GitHub OAuth App for production domain; switch DynamoDB to AWS production region

---

## Additional Ideas Worth Building

The five phases cover the core product. These are extensions that would make DevVerse genuinely distinctive — each one deepens the "coding = game progress" loop in a different direction.

---

### Idea A — Character Class System

Instead of every player having the same character, let the player's **actual coding language distribution** determine their class. Computed from the `Sessions.languageBreakdown` data already planned in Phase 1.

| Class | Primary Language(s) | Passive Bonus |
|---|---|---|
| **Frontend Wizard** | TypeScript, CSS, HTML | +25% MP; spells cost less |
| **Backend Knight** | Go, Java, Rust | +25% DEF; armour cap raised |
| **Script Rogue** | Python, Ruby, Shell | +25% crit chance; flee always succeeds |
| **Data Sage** | SQL, Python, R | +20% XP from all sources |
| **DevOps Ranger** | YAML, Dockerfile, Bash | Passive gold trickle even offline |
| **Generalist** | No dominant language | Balanced; +10% to all stats |

Class is recalculated weekly based on the trailing 30 days of activity. NPC dialogue reacts to your class ("Ah, a Backend Knight — the Blacksmith will give you a discount.").

This creates a natural identity: your real-world coding habits have a tangible, visible effect on your character's strengths.

---

### Idea B — GitHub Activity Integration

The extension tracks keystrokes, but a significant amount of developer work lives in Git. Query the GitHub API on login and on a daily schedule to award points for activity that the extension cannot see:

| Event | Points | In-game reward |
|---|---|---|
| Commit pushed | `+30 × files_changed` | Standard gold |
| PR opened | `+200` | Uncommon item drop chance |
| PR merged | `+500` | Guaranteed uncommon drop |
| PR review submitted | `+150` | Wisdom scroll (XP boost consumable) |
| Issue closed | `+100` | Potion |
| Repository star received | `+50` | Cosmetic badge |

Backend implementation: `POST /users/:id/github/sync` — accepts a GitHub access token (already available post-auth), calls `GET /users/:id/events` on the GitHub API, filters events newer than `lastGithubSync`, awards points, writes to a new `GitHubEvents` DynamoDB table for dedup.

This means a developer who spends most of their day in code review rather than writing new code is still rewarded fairly — something the extension alone cannot capture.

---

### Idea C — World Boss Raids (Multiplayer Events)

A scheduled **World Boss** spawns every Friday at a fixed time and is visible to all authenticated users. It has a shared HP pool scaled to the number of active players. Each player deals damage by accumulating coding points during the event window (Saturday to Sunday midnight).

```
bossHP = activePlayers × 5000
playerDamage = pointsEarnedDuringEvent / 10
```

If the collective damage exceeds `bossHP` before the window closes, all participants receive:
- A tiered reward based on individual contribution (top 10% → legendary drop)
- A permanent world-state flag that unlocks a new game area or NPC dialogue for the next two weeks

Backend: a `WorldBoss` DynamoDB record updated atomically via `UpdateItem` with a `ADD HpRemaining :<damage>` expression. The dashboard and game UI show a live HP bar with a WebSocket or 30-second poll.

The mechanic makes DevVerse genuinely multiplayer without requiring any real-time infrastructure beyond a single polling endpoint.

---

### Idea D — In-Editor Sidebar Panel (VS Code Webview)

The extension currently communicates only via the status bar. A dedicated **Activity Bar panel** (a Webview) would make the game accessible directly inside VS Code, reinforcing the connection between coding and the game.

Panel sections:
- **Live session**: current session points, language breakdown, time elapsed — updates every 5 seconds
- **Character card**: level, HP, gold, equipped weapon — pulled from the backend
- **Today's quests**: 3 daily tasks refreshed at midnight (see Idea E)
- **Mini-map**: a tiny read-only 80×80 px render of the player's current area using the same canvas code as the web app

The Webview communicates with the extension host via `vscode.postMessage`. Game state changes (e.g. a LeetCode drop arriving) trigger a notification bubble on the panel icon.

This turns DevVerse from "a website you visit" into "something that lives inside your editor" — a fundamentally different relationship with the product.

---

### Idea E — Daily & Weekly Quest System

Three daily quests generated each midnight from a weighted pool of ~40 quest templates:

| Type | Example | Reward |
|---|---|---|
| Language sprint | "Write 500 chars of TypeScript today" | `+300 pts` + minor drop |
| Consistency | "Code for at least 45 minutes total today" | `+200 pts` |
| LeetCode | "Solve any LeetCode problem today" | `+600 pts` + guaranteed drop |
| Commit | "Push at least one commit today" | `+250 pts` |
| Streak | "Maintain your current streak for 3 more days" | `+1000 pts` + rare drop |
| Boss hunt | "Defeat 5 enemies in Pixel Quest" | `+150 pts` |

Weekly quests are harder variants with significantly better rewards (legendary item drops, titles).

Quests are generated server-side and stored in DynamoDB with `expiresAt`. The `/users/:id/quests` endpoint returns active quests and their completion state. The extension sidebar (Idea D), dashboard, and game UI all surface them.

This is the single most effective retention mechanic — a reason to open VS Code (or the game) every day.

---

### Idea F — Public Developer Profile

A shareable URL (`/u/:githubLogin`) that displays:

- Character portrait (class-based sprite from Phase 4) + name + level
- Coding stats: total score, current streak, top languages (language breakdown bar chart)
- Achievement badges earned (see Idea G)
- Recent activity feed: "Solved 2 LeetCode problems", "Completed World Boss raid", "Reached Level 12"
- Game snapshot: current area, equipped gear

The page is **server-rendered** (good for SEO/sharing), uses the same Terminal Operator aesthetic, and has an `og:image` meta tag pointing to a dynamically-generated card image (via `@vercel/og` or a canvas-based `/api/og/:userId` route).

Shareable on GitHub profile READMEs: `[![DevVerse](https://devverse.app/api/og/your-handle)](https://devverse.app/u/your-handle)`.

---

### Idea G — Achievement & Title System

Persistent achievements that cannot be lost once earned. They appear on the public profile and can optionally be displayed as an in-game title above the player character.

Example achievements:

| Achievement | Trigger | Title Unlocked |
|---|---|---|
| First Blood | First enemy defeated | "Initiate" |
| Century | 100 coding sessions | "Centurion" |
| Polyglot | 5+ languages with >500 pts each | "Polyglot" |
| Marathon | 8-hour continuous session | "The Grinder" |
| Code Archaeologist | 30-day streak | "Archaeologist" |
| Boss Slayer | Defeat any area boss | "Slayer" |
| Raid Veteran | Participate in 10 World Boss events | "Raider" |
| LeetCode Adept | 50 LeetCode problems solved | "Algorithm Adept" |
| Endgame | Complete Act 3 story | "Debugger of Worlds" |

Stored as a `Set` of achievement IDs on the User record in DynamoDB. Awarded by the backend on event processing, not the client.

---

### Idea H — Prestige System

After completing Act 3 (defeating the final boss), the player can **Prestige**: reset their character level and gold to zero in exchange for a permanent multiplier and a cosmetic indicator.

| Prestige Level | Requirement | Permanent Bonus |
|---|---|---|
| ★ | Complete Act 3 | `+10%` to all point gains in extension |
| ★★ | Prestige once + reach Level 20 again | `+20%` (cumulative), animated character outline |
| ★★★ | Prestige twice + 60-day streak | `+30%`, unique character palette, "Ascended" title |

The prestige multiplier applies to the **extension's scoring** as well, creating a direct feedback loop: beating the hardest game content makes you earn points faster in real life, which in turn makes the game progress faster.

---

### Idea I — Code Quality Signals

Points shouldn't only come from volume. Integrate code quality signals that reward *good* coding:

| Signal | Source | Points |
|---|---|---|
| Test file edited (same session as implementation) | Extension file watcher | `+50 pts/session` |
| Lint passes (no new errors introduced) | Extension: run ESLint/golangci-lint on save via VS Code diagnostics API | `+20 pts/file` |
| CI pipeline passes | GitHub Actions webhook → `POST /webhooks/github` | `+300 pts` |
| Code coverage increases | CI report uploaded to backend | `+100 pts per +1%` |

The extension can read VS Code's `vscode.languages.getDiagnostics()` to check whether a file has more or fewer errors after a save, awarding the lint bonus without running any external tools.

This directly incentivises writing tests and not ignoring linter warnings — turning DevVerse into something a team lead might actually want their team to use.

---

### Idea J — Team / Guild System

Groups of developers (2–10) form a **Guild** and contribute to a shared score pool. Guilds compete on a separate leaderboard.

```
Guild.totalScore = sum of all member scores earned since guild was formed
Guild.weeklyScore = sum of scores in the trailing 7 days (for weekly rankings)
```

Guild-specific features:
- **Guild hall** in the game: a separate area accessible only if you're in a guild, with a shared chest (items deposited by members can be claimed by others)
- **Guild quests**: a weekly quest that requires combined effort (e.g. "Guild members collectively solve 10 LeetCode problems this week")
- **Rivalry**: two guilds can challenge each other to a week-long coding competition (higher combined score wins; both guilds get rewards, winners get a bonus)

Backend: a `Guilds` DynamoDB table `{ GuildID (PK), Name, OwnerID, MemberIDs (Set), TotalScore, WeeklyScore }`. Guild invites handled via a short-lived invite token.

---

### Idea K — Discord Bot

A Discord bot (`devverse-bot`) that brings the leaderboard and game events into team servers:

- `/devverse leaderboard` — top 10 formatted as an embed
- `/devverse profile @user` — shows their stats and character card
- Automatic announcements: level ups, boss defeats, World Boss spawning, streak milestones
- `/devverse quest` — shows today's daily quests
- Optional: voting on which World Boss mechanic to use next week

The bot is a separate lightweight Node.js service (or a Cloudflare Worker) that subscribes to a backend webhook stream (`POST /webhooks/discord`). Events are pushed when milestones are hit rather than polled.

---

## Milestone Summary

| Phase | Key Deliverables | Estimated Effort |
|---|---|---|
| **1** | Rich scoring model, session tracking, offline buffer, mini dashboard Webview | ~3–4 weeks |
| **2** | LeetCode GraphQL sync, item drops, dashboard LeetCode tab | ~2–3 weeks |
| **3** | 2 new areas, 4 new NPCs, 3-act story, expanded items/combat | ~4–5 weeks |
| **4** | Sprite sheet, SpriteRenderer class, rAF loop, animated entities | ~3–4 weeks |
| **5** | Real GitHub OAuth flow, httpOnly cookies, remove mock auth | ~1–2 weeks |
