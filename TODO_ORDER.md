# Phase 1 — Implementation Order

> Each TODO is labelled `<sub-phase> #<number>` and maps to a comment in the codebase.
> Work through the groups in order. Within a group, items marked **parallel** can be done simultaneously.

---

## Group 1 — Backend Foundation
> Nothing else can start until these exist.

| # | TODO | File | Status |
|---|---|---|---|
| 1 | **1.5 #1** — Create `Session` and `DailyActivity` model structs | `backend/src/models/session.go` | ✅ Done |
| 2 | **1.5 #2** — Add table name constants and expose on `Config` + `Load()` | `backend/src/appconfig/constants.go`, `config.go` | ✅ Done |

> Group 1 fully complete. TODO comment removed from `models/user.go`.

*Items 1 and 2 are parallel.*

---

## Group 2 — Backend Services
> Depends on Group 1.

| # | TODO | File | Status |
|---|---|---|---|
| 3 | **1.5 #3** — Upsert `DailyActivity` row inside `AddUserScore` | `backend/src/services/user_service.go` | ✅ Done |
| 4 | **1.5 #4a** — Implement `RecordSession` | `backend/src/services/session_service.go` | ✅ Done |
| 5 | **1.5 #4b** — Implement `GetStreak` | `backend/src/services/session_service.go` | ✅ Done |
| 6 | **1.5 #4c** — Implement `GetActivity` | `backend/src/services/session_service.go` | ✅ Done |

> Group 2 fully complete. All FIX comments removed, services package compiles cleanly.

*Items 3–6 are parallel.*

---

## Group 3 — Backend Routes
> Depends on Group 2 (needs the service methods from steps 4–6).

| # | TODO | File | Status |
|---|---|---|---|
| 7 | **1.5 #5** — `POST /users/:id/sessions` route handler | `backend/src/routes/users.go` | ✅ Done |
| 8 | **1.5 #6** — `GET /users/:id/streak` and `GET /users/:id/activity` route handlers | `backend/src/routes/users.go` | ✅ Done |

> Group 3 fully complete. Routes package compiles cleanly. Also fixed `auth.go` which called `NewUserService` with the old 2-arg signature.

*Items 7 and 8 are parallel.*

---

## Group 4 — Extension Foundation
> No dependency on the backend. **Can be done in parallel with Groups 2–3.**

| # | TODO | File | Status |
|---|---|---|---|
| 9 | **1.2 #1** — Add `LANG_MULTIPLIERS` map; wire to VS Code config | `extension/src/extension.ts` | ✅ Done |
| 10 | **1.3 #1** — Define `SessionState` interface | `extension/src/extension.ts` | ✅ Done |
| 11 | **1.3 #2** — Initialise `currentSession` and `sessionInactivityTimer` variables | `extension/src/extension.ts` | ✅ Done |
| 12 | **1.4 #1** — Create `readQueue()` / `writeQueue()` offline buffer helpers | `extension/src/extension.ts` | ✅ Done |

> Group 4 fully complete. Stale TODO comments removed. `LANG_MULTIPLIERS` refactored into `DEFAULT_LANG_MULTIPLIERS` + `getLangMultipliers()` so VS Code config overrides are actually applied.

*Items 9–12 are parallel.*

---

## Group 5 — Extension Core Logic
> Depends on Group 4.

| # | TODO | File | Status |
|---|---|---|---|
| 13 | **1.2 #2** — Replace flat `contentChanges.length` with weighted score formula | `extension/src/extension.ts` | ✅ Done |
| 14 | **1.3 #3 + 1.6 #3** — Session start/update/end detection, inactivity timer, and `flushSession()` with end-of-session notification | `extension/src/extension.ts` | ✅ Done |

> Group 5 fully complete. `flushSession` implemented with correct streak multiplier (`min(1 + streak×0.1, 2.0×)`), conditional 30-min duration bonus (1.2×), POST to `/users/:id/sessions`, info message with language breakdown, `currentSession` reset, and deactivation hook. Old debounced `score/add` path removed (sessions now own score submission).

---

## Group 6 — Extension UX
> Depends on Group 5. Steps 16–17 also need the backend routes from Group 3.

| # | TODO | File | Status |
|---|---|---|---|
| 15 | **1.6 #1** — Update status bar to show `⚡ +Xpts 🔥Yd` live | `extension/src/extension.ts` | ✅ Done |
| 16 | **1.3 #4** — Fetch streak from `GET /users/:id/streak` on activation | `extension/src/extension.ts` | ✅ Done |
| 17 | **1.4 #2** — Wrap flush with offline queue drain | `extension/src/extension.ts` | ✅ Done |
| 18 | **1.6 #2** — Register settings in `extension/package.json` | `extension/package.json` | ✅ Done |
| 19 | **1.6 #4** — Register `devverse.showStats` Webview command | `extension/src/extension.ts` | ✅ Done |

> Group 6 fully complete. Key fixes: `lastKnownStreak` variable seeds new sessions correctly; offline queue push-then-drain pattern in `flushSession`; `devverse.showStats` command registered (was wrongly `devverse.statsPanel`) with inline Terminal Operator HTML; `package.json` gains `devverse.showStats` command + three configuration properties.

---

## Group 7 — Frontend Game
> Depends on Group 3 (needs the `/activity` endpoint from step 8).

| # | TODO | File | Status |
|---|---|---|---|
| 20 | **1.7 #1** — Replace `/stats/:id` poll with `/activity` endpoint; remove `CLAIMED_KEY` | `frontend/app/game/page.tsx` | ⬜ Todo |
| 21 | **1.7 #2** — Change gold divisor from `20` to `50` | `frontend/app/game/page.tsx` | ⬜ Todo |
| 22 | **1.7 #3** — Update nav badge label, `title`, and divisor | `frontend/app/game/page.tsx` | ⬜ Todo |

*Items 20 → 21 → 22 must be done in order.*

---

## Dependency Map

```
Group 1 (1, 2)
    │
    ├──► Group 2 (3, 4, 5, 6) ◄── parallel with Group 4
    │         │
    │         └──► Group 3 (7, 8)
    │                   │
    │                   ├──► Group 6 steps 16, 17
    │                   └──► Group 7 (20, 21, 22)
    │
Group 4 (9, 10, 11, 12)
    │
    └──► Group 5 (13, 14)
              │
              └──► Group 6 (15, 16, 17, 18, 19)
```

---

## Quick Reference — All TODOs by File

| File | TODOs |
|---|---|
| `backend/src/models/session.go` | ✅ 1.5 #1 |
| `backend/src/appconfig/constants.go` | ✅ 1.5 #2 |
| `backend/src/appconfig/config.go` | ✅ 1.5 #2 |
| `backend/src/services/user_service.go` | 1.5 #3 |
| `backend/src/services/session_service.go` | 1.5 #4a · 1.5 #4b · 1.5 #4c |
| `backend/src/routes/users.go` | 1.5 #5 · 1.5 #6 |
| `extension/src/extension.ts` | 1.2 #1 · 1.2 #2 · 1.3 #1 · 1.3 #2 · 1.3 #3 · 1.3 #4 · 1.4 #1 · 1.4 #2 · 1.6 #1 · 1.6 #3 · 1.6 #4 |
| `extension/package.json` | 1.6 #2 |
| `frontend/app/game/page.tsx` | 1.7 #1 · 1.7 #2 · 1.7 #3 |
