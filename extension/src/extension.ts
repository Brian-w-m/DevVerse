import * as vscode from 'vscode';
import * as path from 'path';
import * as dotenv from 'dotenv';

const DEFAULT_LANG_MULTIPLIERS: Record<string, number> = {
	'go': 1.5, 'rust': 1.5, 'c': 1.5, 'cpp': 1.5,
	'python': 1.2, 'java': 1.2, 'typescript': 1.2, 'javascript': 1.2,
	'html': 1.0, 'css': 1.0, 'scss': 1.0, 'svelte': 1.0, 'vue': 1.0,
	'json': 0.5, 'yaml': 0.5, 'toml': 0.5, 'xml': 0.5,
	'markdown': 0.3, 'plaintext': 0.3,
};

function getLangMultipliers(): Record<string, number> {
	return vscode.workspace.getConfiguration('devverse').get<Record<string, number>>('languageMultipliers')
		?? DEFAULT_LANG_MULTIPLIERS;
}

export async function activate(context: vscode.ExtensionContext) {
	try {
		dotenv.config({ path: path.join(context.extensionPath, '..', '.env') });
	} catch { /* no .env */ }

	console.log('DevVerse extension activated');

	const backendUrlFromEnv = process.env.BACKEND_URL || 'http://localhost:8080';

	const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
	statusBarItem.command = 'devverse.login';
	statusBarItem.show();
	context.subscriptions.push(statusBarItem);

	// ── Scoring state ─────────────────────────────────────────────────────────
	let cachedUserId: string | undefined;
	let lastKnownStreak = 0;
	let pendingRawPoints = 0;                     // accumulated since last debounced send
	let fractionalRemainder = 0;                  // carry-over from rounding to avoid cumulative loss
	let languageBreakdown: Record<string, number> = {};  // for status bar tooltip / stats panel
	let windowSentPoints = 0;                     // pts sent in current window (for 20% bonus calc)
	let sessionDisplayPoints = 0;                 // total pts since last inactivity break (status bar)
	let windowStartedAt: number | null = null;    // when current 30-min window began
	let debounceTimer: NodeJS.Timeout | undefined;
	let windowGapTimer: NodeJS.Timeout | undefined;
	let windowMilestoneTimer: NodeJS.Timeout | undefined;
	const WINDOW_MS = 10_000;   // TODO: change back to 30 * 60_000 (30 min) after testing
	const GAP_MS = 5_000;       // TODO: change back to (config ?? 5) * 60_000 (5 min) after testing

	// ── Offline queue (simple: just points) ──────────────────────────────────
	const flushQueuePath = path.join(context.globalStorageUri.fsPath, 'flush-queue.json');

	interface FlushEntry { userId: string; points: number; timestamp: number; }

	async function readQueue(): Promise<FlushEntry[]> {
		try {
			return JSON.parse(
				(await vscode.workspace.fs.readFile(vscode.Uri.file(flushQueuePath))).toString()
			) as FlushEntry[];
		} catch { return []; }
	}
	async function writeQueue(q: FlushEntry[]): Promise<void> {
		await vscode.workspace.fs.writeFile(
			vscode.Uri.file(flushQueuePath),
			Buffer.from(JSON.stringify(q, null, 2))
		);
	}

	// ── Send points to backend ────────────────────────────────────────────────
	async function sendPoints(points: number): Promise<boolean> {
		if (points <= 0) return true;
		try {
			const jwt = await context.secrets.get('devverse.jwt');
			const userId = await context.secrets.get('devverse.userId');
			if (!jwt || !userId) {
				console.log(`[DevVerse] sendPoints: no jwt=${!!jwt} userId=${!!userId} — not logged in`);
				return false;
			}
			const url = `${backendUrlFromEnv}/users/${encodeURIComponent(userId)}/score/add`;
			const res = await fetch(url, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${jwt}` },
				body: JSON.stringify({ increment: points }),
			});
			if (!res.ok) {
				const text = await res.text();
				console.log(`[DevVerse] sendPoints: HTTP ${res.status} — ${text}`);
			}
			return res.ok;
		} catch (e: any) {
			console.log(`[DevVerse] sendPoints: fetch error — ${e?.message}`);
			return false;
		}
	}

	// Drain any entries queued from a previous session (startup)
	const drainQueueOnStartup = async () => {
		const jwt = await context.secrets.get('devverse.jwt');
		const userId = await context.secrets.get('devverse.userId');
		if (!jwt || !userId) return;
		const queue = await readQueue();
		if (queue.length === 0) return;
		const remaining: FlushEntry[] = [];
		for (const entry of queue) {
			try {
				const res = await fetch(`${backendUrlFromEnv}/users/${encodeURIComponent(entry.userId)}/score/add`, {
					method: 'PATCH',
					headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${jwt}` },
					body: JSON.stringify({ increment: entry.points }),
				});
				if (!res.ok) remaining.push(entry);
			} catch { remaining.push(entry); }
		}
		await writeQueue(remaining);
	};

	// ── Auth ─────────────────────────────────────────────────────────────────
	async function authenticateWithBackend(session: vscode.AuthenticationSession) {
		try {
			const res = await fetch(`${backendUrlFromEnv}/auth/github`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ accessToken: session.accessToken }),
			});
			if (!res.ok) throw new Error(`Auth failed: ${res.status}`);
			const data: any = await res.json();
			if (data?.token) {
				await context.secrets.store('devverse.jwt', data.token);
				await context.secrets.store('devverse.userId', data.user.id);
				cachedUserId = data.user.id;
			}
			statusBarItem.text = `$(check) DevVerse: ${data.user?.name || session.account.label}`;
			statusBarItem.tooltip = `Logged in as ${data.user?.email || session.account.label}`;
			return true;
		} catch (e: any) {
			statusBarItem.text = '$(error) DevVerse: Auth Failed';
			statusBarItem.tooltip = `Authentication failed: ${e?.message}`;
			return false;
		}
	}

	async function checkAuthStatus() {
		const session = await vscode.authentication.getSession('github', ['read:user', 'user:email'], { createIfNone: false });
		if (session) {
			const jwt = await context.secrets.get('devverse.jwt');
			if (jwt) {
				cachedUserId = await context.secrets.get('devverse.userId') ?? undefined;
				statusBarItem.text = `$(check) DevVerse: ${session.account.label}`;
				statusBarItem.tooltip = `Logged in as ${session.account.label}`;
				return true;
			} else {
				statusBarItem.text = '$(sync~spin) DevVerse: Connecting...';
				await authenticateWithBackend(session);
			}
		} else {
			statusBarItem.text = '$(sign-in) DevVerse: Not Logged In';
			statusBarItem.tooltip = 'Click to log in with GitHub';
		}
		return false;
	}

	const loginCommand = vscode.commands.registerCommand('devverse.login', async () => {
		try {
			statusBarItem.text = '$(sync~spin) DevVerse: Logging in...';
			const session = await vscode.authentication.getSession('github', ['read:user', 'user:email'], { createIfNone: true });
			if (session) await authenticateWithBackend(session);
		} catch (e: any) {
			statusBarItem.text = '$(error) DevVerse: Login Failed';
			vscode.window.showErrorMessage(`Login failed: ${e?.message}`);
		}
	});
	context.subscriptions.push(loginCommand);

	async function fetchStreak(): Promise<number> {
		try {
			const jwt = await context.secrets.get('devverse.jwt');
			const userId = await context.secrets.get('devverse.userId');
			if (!jwt || !userId) return 0;
			const res = await fetch(`${backendUrlFromEnv}/users/${encodeURIComponent(userId)}/streak`, {
				headers: { 'Authorization': `Bearer ${jwt}` },
			});
			if (!res.ok) return 0;
			return ((await res.json()) as any).streak ?? 0;
		} catch { return 0; }
	}

	checkAuthStatus().then(() => {
		drainQueueOnStartup();
		fetchStreak().then(s => { lastKnownStreak = s; });
	});

	// ── showStats webview ─────────────────────────────────────────────────────
	const showStatsCommand = vscode.commands.registerCommand('devverse.showStats', async () => {
		const panel = vscode.window.createWebviewPanel('devverse.stats', 'DevVerse Stats', vscode.ViewColumn.One, { enableScripts: true });
		const getHtml = () => {
			const windowElapsed = windowStartedAt ? Math.floor((Date.now() - windowStartedAt) / 60_000) : 0;
			const breakdown = Object.entries(languageBreakdown)
				.sort(([, a], [, b]) => b - a)
				.map(([lang, p]) => `<li><span class="lang">${lang}</span><span class="pts">${p.toFixed(0)} pts</span></li>`)
				.join('') || '<li class="muted">No activity yet</li>';
			return /* html */`<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">
<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body { background: #050810; color: #e2e8f0; font-family: 'IBM Plex Mono','Courier New',monospace; padding: 24px; }
h1 { font-size: 13px; letter-spacing: .12em; text-transform: uppercase; color: #10b981; margin-bottom: 20px; }
.grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-bottom: 20px; }
.card { background: #0d1117; border: 1px solid #1e2d3d; border-radius: 6px; padding: 14px; }
.card .label { font-size: 10px; letter-spacing: .1em; text-transform: uppercase; color: #64748b; margin-bottom: 6px; }
.card .value { font-size: 20px; font-weight: 700; color: #10b981; }
.card .value.amber { color: #f59e0b; }
.card .value.blue { color: #60a5fa; }
ul { list-style: none; background: #0d1117; border: 1px solid #1e2d3d; border-radius: 6px; padding: 12px 14px; }
li { display: flex; justify-content: space-between; padding: 4px 0; font-size: 12px; border-bottom: 1px solid #1e2d3d22; }
li:last-child { border-bottom: none; }
.lang { color: #94a3b8; } .pts { color: #10b981; } .muted { color: #475569; font-style: italic; }
button { margin-top: 16px; background: #10b98122; border: 1px solid #10b981; color: #10b981; padding: 6px 16px; border-radius: 4px; font-family: inherit; font-size: 11px; cursor: pointer; }
</style></head><body>
<h1>⚡ DevVerse — Live Stats</h1>
<div class="grid">
  <div class="card"><div class="label">Window pts</div><div class="value">${windowSentPoints.toLocaleString()}</div></div>
  <div class="card"><div class="label">Window time</div><div class="value blue">${windowElapsed}m / 30m</div></div>
  <div class="card"><div class="label">Streak</div><div class="value amber">🔥 ${lastKnownStreak}d</div></div>
</div>
<div style="font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:#64748b;margin-bottom:8px;">Language Breakdown</div>
<ul>${breakdown}</ul>
<button onclick="vscode.acquireVsCodeApi().postMessage({command:'refresh'})">↺ Refresh</button>
<script>const vscode=acquireVsCodeApi();window.addEventListener('message',e=>{if(e.data.command==='refresh')location.reload();});</script>
</body></html>`;
		};
		panel.webview.html = getHtml();
		panel.webview.onDidReceiveMessage(msg => {
			if (msg.command === 'refresh') {
				fetchStreak().then(s => { lastKnownStreak = s; panel.webview.html = getHtml(); });
			}
		});
	});
	context.subscriptions.push(showStatsCommand);

	let bonusInFlight = false;

	// Flush pending points and award the window bonus — called by milestone timer
	async function triggerWindowBonus() {
		if (bonusInFlight) { console.log('[DevVerse] Milestone skipped — previous bonus still in flight.'); return; }
		bonusInFlight = true;
		console.log(`[DevVerse] Milestone timer fired. windowSentPoints=${windowSentPoints}, pendingRaw=${pendingRawPoints.toFixed(2)}`);
		// First flush whatever is still pending (may be mid-typing)
		const raw = pendingRawPoints;
		pendingRawPoints = 0;
		if (raw > 0) {
			const streakMultiplier = Math.min(1 + lastKnownStreak * 0.1, 2.0);
			const exact = raw * streakMultiplier + fractionalRemainder;
			const toSend = Math.floor(exact);
			fractionalRemainder = exact - toSend;
			console.log(`[DevVerse] Flushing pending: raw=${raw.toFixed(2)}, toSend=${toSend}`);
			if (toSend > 0) {
				const ok = await sendPoints(toSend);
				console.log(`[DevVerse] sendPoints(${toSend}) ok=${ok}`);
				if (ok) { windowSentPoints += toSend; sessionDisplayPoints += toSend; }
				else if (cachedUserId) {
					const queue = await readQueue();
					queue.push({ userId: cachedUserId, points: toSend, timestamp: Date.now() });
					await writeQueue(queue);
				}
			}
		}

		console.log(`[DevVerse] After flush: windowSentPoints=${windowSentPoints}`);
		if (windowSentPoints <= 0) { windowStartedAt = null; bonusInFlight = false; console.log('[DevVerse] Early return — no points earned, skipping bonus.'); return; }

		const bonus = Math.round(windowSentPoints * 0.2);
		await sendPoints(bonus);
		const windowMins = Math.round(WINDOW_MS / 60_000);
		const windowLabel = windowMins < 1 ? `${WINDOW_MS / 1000}s` : `${windowMins}min`;
		vscode.window.showInformationMessage(
			`⚡ ${windowLabel} session complete! +${bonus} bonus pts (20% of ${windowSentPoints.toLocaleString()} pts earned)`
		);
		// Reset fully — next keystroke will start a fresh window and schedule the next milestone
		clearTimeout(windowGapTimer);
		clearTimeout(windowMilestoneTimer);
		windowStartedAt = null;
		windowSentPoints = 0;
		sessionDisplayPoints = 0;
		pendingRawPoints = 0;
		fractionalRemainder = 0;
		languageBreakdown = {};
		bonusInFlight = false;
		statusBarItem.text = `⚡ DevVerse +0 pts 🔥 ${lastKnownStreak}d`;
		statusBarItem.tooltip = 'Start coding to earn pts';
	}

	// ── Text change listener — live scoring ──────────────────────────────────
	const onchangeDisposable = vscode.workspace.onDidChangeTextDocument((event) => {
		if (event.contentChanges.length === 0) return;
		const scheme = event.document.uri.scheme;
		if (scheme !== 'file' && scheme !== 'untitled') return; // ignore output panels, git, debug console, etc.

		const langId = event.document.languageId;
		const multiplier = getLangMultipliers()[langId] ?? 1.0;
		let changePoints = 0;
		for (const change of event.contentChanges) {
			changePoints += change.text.length * multiplier + change.rangeLength * 0.3 * multiplier;
		}

		pendingRawPoints += changePoints;
		languageBreakdown[langId] = (languageBreakdown[langId] ?? 0) + changePoints;

		// Update status bar immediately on each edit for a responsive feel
		const streakMult = Math.min(1 + lastKnownStreak * 0.1, 2.0);
		const displayPts = sessionDisplayPoints + Math.floor((pendingRawPoints + fractionalRemainder) * streakMult);
		statusBarItem.text = `⚡ DevVerse +${displayPts.toLocaleString()} pts 🔥 ${lastKnownStreak}d`;
		statusBarItem.tooltip = Object.entries(languageBreakdown)
			.sort(([, a], [, b]) => b - a)
			.map(([lang, p]) => `${lang}: ${p.toFixed(0)} pts`)
			.join('\n');

		// Start window and milestone timer on first edit
		if (!windowStartedAt) {
			windowStartedAt = Date.now();
			windowMilestoneTimer = setTimeout(triggerWindowBonus, WINDOW_MS);
			console.log(`[DevVerse] Window started. Milestone in ${WINDOW_MS / 1000}s.`);
		}

		// Reset gap timer — if no edit for GAP_MS, close the window without bonus
		clearTimeout(windowGapTimer);
		const gapResetAt = Date.now();
		windowGapTimer = setTimeout(() => {
			const elapsed = ((Date.now() - gapResetAt) / 1000).toFixed(1);
			console.log(`[DevVerse] Gap timer fired after ${elapsed}s of inactivity — window reset.`);
			clearTimeout(windowMilestoneTimer);
			clearTimeout(debounceTimer);
			windowStartedAt = null;
			windowSentPoints = 0;
			sessionDisplayPoints = 0;
			pendingRawPoints = 0;
			fractionalRemainder = 0;
			languageBreakdown = {};
			statusBarItem.text = `⚡ DevVerse +0 pts 🔥 ${lastKnownStreak}d`;
			statusBarItem.tooltip = 'Start coding to earn pts';
		}, GAP_MS);

		// Debounce: send accumulated points 2s after last keystroke
		clearTimeout(debounceTimer);
		debounceTimer = setTimeout(async () => {
			const raw = pendingRawPoints;
			pendingRawPoints = 0;
			const streakMultiplier = Math.min(1 + lastKnownStreak * 0.1, 2.0);
			const exact = raw * streakMultiplier + fractionalRemainder;
			const toSend = Math.floor(exact);
			fractionalRemainder = exact - toSend;  // carry forward, never lose fractional pts
			if (toSend <= 0) return;

			const ok = await sendPoints(toSend);
			if (!ok) {
				// Queue for retry on next startup
				if (cachedUserId) {
					const queue = await readQueue();
					queue.push({ userId: cachedUserId, points: toSend, timestamp: Date.now() });
					await writeQueue(queue);
				}
				return;
			}

			windowSentPoints += toSend;
			sessionDisplayPoints += toSend;
		}, 2000);
	});

	context.subscriptions.push(onchangeDisposable);
}

export function deactivate() { /* points are sent live; nothing to flush */ }
