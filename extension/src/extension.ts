// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as path from 'path';
import * as dotenv from 'dotenv';

const DEFAULT_LANG_MULTIPLIERS: Record<string, number> = {
	'go': 1.5,
	'rust': 1.5,
	'c': 1.5,
	'cpp': 1.5,
	'python': 1.2,
	'java': 1.2,
	'typescript': 1.2,
	'javascript': 1.2,
	'html': 1.0,
	'css': 1.0,
	'scss': 1.0,
	'svelte': 1.0,
	'vue': 1.0,
	'json': 0.5,
	'yaml': 0.5,
	'toml': 0.5,
	'xml': 0.5,
	'markdown': 0.3,
	'plaintext': 0.3,
};

function getLangMultipliers(): Record<string, number> {
	return vscode.workspace.getConfiguration('devverse').get<Record<string, number>>('languageMultipliers')
		?? DEFAULT_LANG_MULTIPLIERS;
}

interface SessionState {
	startedAt: number;		// ms timestamp of first edit
	lastEditAt: number;		// ms timestamp of most recent edit
	languageBreakdown: Record<string, number>;	// languageId → weighted points accumulated
	totalPoints: number;	// running weighted total for this session
	streak: number;		// consecutive active days, fetched from backend on activation
}

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export async function activate(context: vscode.ExtensionContext) {

	// Load environment variables from project root .env (one level up from extension folder)
	try {
		const envPath = path.join(context.extensionPath, '..', '.env');
		dotenv.config({ path: envPath });
	} catch (e) {
		console.error('Failed to load .env file for extension', e);
	}

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "devverse" is now active!');

	// Determine backend URL from env
	const backendUrlFromEnv = process.env.BACKEND_URL || 'http://localhost:8080';

	// Create status bar item for login status
	const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
	statusBarItem.command = 'devverse.login';
	statusBarItem.show();
	context.subscriptions.push(statusBarItem);

	let currentSession: SessionState | null = null;
	let sessionInactivityTimer: NodeJS.Timeout | undefined;
	let lastKnownStreak = 0;
	const SESSION_GAP_MS = (vscode.workspace.getConfiguration('devverse').get<number>('minSessionGapMinutes') ?? 5) * 60_000;
	
	const flushQueuePath = path.join(context.globalStorageUri.fsPath, 'flush-queue.json');
	interface FlushEntry {
		userId: string;
		points: number;
		sessionId: string;
		timestamp: number;
		startedAt: number;
		endedAt: number;
		languageBreakdown: Record<string, number>;
	}
	async function readQueue(): Promise<FlushEntry[]> {
		try {
			const content = await vscode.workspace.fs.readFile(vscode.Uri.file(flushQueuePath)).then(buf => buf.toString());
			return JSON.parse(content) as FlushEntry[];
		} catch (e) {
			console.error('Failed to read flush queue', e);
			return [];
		}
	}
	async function writeQueue(q: FlushEntry[]): Promise<void> {
		try {
			await vscode.workspace.fs.writeFile(vscode.Uri.file(flushQueuePath), Buffer.from(JSON.stringify(q, null, 2)));
		} catch (e) {
			console.error('Failed to write flush queue', e);
			throw e;
		}
	}

	// Function to authenticate with backend
	async function authenticateWithBackend(session: vscode.AuthenticationSession) {
		try {
			const res = await fetch(`${backendUrlFromEnv}/auth/github`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ accessToken: session.accessToken }),
			});

			if (!res.ok) {
				const text = await res.text();
				throw new Error(`Auth failed: ${res.status} ${text}`);
			}

			const data: any = await res.json();

			// Store backend JWT securely for subsequent requests
			if (data?.token) {
				await context.secrets.store('devverse.jwt', data.token);
				await context.secrets.store('devverse.userId', data.user.id);
			}

			statusBarItem.text = `$(check) DevVerse: ${data.user?.name || session.account.label}`;
			statusBarItem.tooltip = `Logged in as ${data.user?.email || session.account.label}`;
			console.log('Backend auth success:', data.user);
			return true;
		} catch (e: any) {
			console.error('Backend auth failed', e);
			statusBarItem.text = '$(error) DevVerse: Auth Failed';
			statusBarItem.tooltip = `Authentication failed: ${e?.message || String(e)}`;
			return false;
		}
	}

	// Function to check authentication status silently
	async function checkAuthStatus() {
		// Check silently without forcing login
		const session = await vscode.authentication.getSession(
			'github',
			['read:user', 'user:email'],
			{ createIfNone: false }
		);

		if (session) {
			// Check if we have a valid JWT
			const jwt = await context.secrets.get('devverse.jwt');
			if (jwt) {
				statusBarItem.text = `$(check) DevVerse: ${session.account.label}`;
				statusBarItem.tooltip = `Logged in as ${session.account.label}`;
				return true;
			} else {
				// Have GitHub session but no backend JWT, authenticate silently
				statusBarItem.text = '$(sync~spin) DevVerse: Connecting...';
				await authenticateWithBackend(session);
			}
		} else {
			statusBarItem.text = '$(sign-in) DevVerse: Not Logged In';
			statusBarItem.tooltip = 'Click to log in with GitHub';
		}
		return false;
	}

	// Command to login explicitly
	const loginCommand = vscode.commands.registerCommand('devverse.login', async () => {
		try {
			statusBarItem.text = '$(sync~spin) DevVerse: Logging in...';
			const session = await vscode.authentication.getSession(
				'github',
				['read:user', 'user:email'],
				{ createIfNone: true }
			);

			if (session) {
				await authenticateWithBackend(session);
			}
		} catch (e: any) {
			statusBarItem.text = '$(error) DevVerse: Login Failed';
			vscode.window.showErrorMessage(`Login failed: ${e?.message || String(e)}`);
		}
	});
	context.subscriptions.push(loginCommand);

	// Check auth status on activation (silently), then seed the streak counter
	async function fetchStreak(): Promise<number> {
		try {
			const jwt = await context.secrets.get('devverse.jwt');
			const userId = await context.secrets.get('devverse.userId');
			if (!jwt || !userId) return 0;
			const res = await fetch(`${backendUrlFromEnv}/users/${encodeURIComponent(userId)}/streak`, {
				headers: { 'Authorization': `Bearer ${jwt}` },
			});
			if (!res.ok) return 0;
			const data: any = await res.json();
			return data.streak ?? 0;
		} catch (e: any) {
			console.error('Failed to fetch streak', e);
			return 0;
		}
	}
	checkAuthStatus().then(() => fetchStreak().then(streak => {
		lastKnownStreak = streak;
		if (currentSession) currentSession.streak = streak;
	}));

	const showStatsCommand = vscode.commands.registerCommand('devverse.showStats', async () => {
		const panel = vscode.window.createWebviewPanel(
			'devverse.stats',
			'DevVerse Stats',
			vscode.ViewColumn.One,
			{ enableScripts: true },
		);

		const getHtml = () => {
			const sess = currentSession;
			const pts = sess ? sess.totalPoints.toFixed(0) : '0';
			const streak = sess ? sess.streak : lastKnownStreak;
			const breakdown = sess
				? Object.entries(sess.languageBreakdown)
					.sort(([, a], [, b]) => b - a)
					.map(([lang, p]) => `<li><span class="lang">${lang}</span><span class="pts">${p.toFixed(0)} pts</span></li>`)
					.join('')
				: '<li class="muted">No active session</li>';
			return /* html */`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #050810; color: #e2e8f0; font-family: 'IBM Plex Mono', 'Courier New', monospace; padding: 24px; }
  h1 { font-size: 13px; letter-spacing: .12em; text-transform: uppercase; color: #10b981; margin-bottom: 20px; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 20px; }
  .card { background: #0d1117; border: 1px solid #1e2d3d; border-radius: 6px; padding: 14px; }
  .card .label { font-size: 10px; letter-spacing: .1em; text-transform: uppercase; color: #64748b; margin-bottom: 6px; }
  .card .value { font-size: 22px; font-weight: 700; color: #10b981; }
  .card .value.amber { color: #f59e0b; }
  ul { list-style: none; background: #0d1117; border: 1px solid #1e2d3d; border-radius: 6px; padding: 12px 14px; }
  li { display: flex; justify-content: space-between; padding: 4px 0; font-size: 12px; border-bottom: 1px solid #1e2d3d22; }
  li:last-child { border-bottom: none; }
  .lang { color: #94a3b8; }
  .pts { color: #10b981; }
  .muted { color: #475569; font-style: italic; }
  button { margin-top: 16px; background: #10b98122; border: 1px solid #10b981; color: #10b981; padding: 6px 16px; border-radius: 4px; font-family: inherit; font-size: 11px; cursor: pointer; letter-spacing: .08em; }
  button:hover { background: #10b98133; }
</style>
</head>
<body>
<h1>⚡ DevVerse — Session Stats</h1>
<div class="grid">
  <div class="card"><div class="label">Session pts</div><div class="value">${pts}</div></div>
  <div class="card"><div class="label">Streak</div><div class="value amber">🔥 ${streak}d</div></div>
</div>
<div class="label" style="font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:#64748b;margin-bottom:8px;">Language Breakdown</div>
<ul>${breakdown}</ul>
<button onclick="refresh()">↺ Refresh</button>
<script>
  const vscode = acquireVsCodeApi();
  function refresh() { vscode.postMessage({ command: 'refresh' }); }
  window.addEventListener('message', e => {
    if (e.data.command === 'refresh') { location.reload(); }
  });
</script>
</body></html>`;
		};

		panel.webview.html = getHtml();
		panel.webview.onDidReceiveMessage(message => {
			if (message.command === 'refresh') {
				fetchStreak().then(streak => {
					lastKnownStreak = streak;
					panel.webview.html = getHtml();
				});
			}
		});
	});
	context.subscriptions.push(showStatsCommand);

	async function flushSession(session: SessionState): Promise<void> {
		currentSession = null;
		clearTimeout(sessionInactivityTimer);

		const now = Date.now();
		const durationMs = now - session.startedAt;
		const streakMultiplier = Math.min(1 + session.streak * 0.1, 2.0);
		const durationMultiplier = durationMs >= 30 * 60_000 ? 1.2 : 1.0;
		const finalPoints = Math.round(session.totalPoints * streakMultiplier * durationMultiplier);

		try {
			const jwt = await context.secrets.get('devverse.jwt');
			const userId = await context.secrets.get('devverse.userId');
			if (!jwt || !userId) return;

			const sessionId = `${userId}-${session.startedAt}`;
			const entry: FlushEntry = {
				userId,
				points: finalPoints,
				sessionId,
				timestamp: now,
				startedAt: session.startedAt,
				endedAt: now,
				languageBreakdown: session.languageBreakdown,
			};

			const queue = await readQueue();
			queue.push(entry);
			await writeQueue(queue);

			const remaining: FlushEntry[] = [];
			for (const qEntry of queue) {
				try {
					const res = await fetch(`${backendUrlFromEnv}/users/${encodeURIComponent(qEntry.userId)}/sessions`, {
						method: 'POST',
						headers: {
							'Content-Type': 'application/json',
							'Authorization': `Bearer ${jwt}`,
						},
						body: JSON.stringify({
							sessionId: qEntry.sessionId,
							userId: qEntry.userId,
							startedAt: qEntry.startedAt,
							endedAt: qEntry.endedAt,
							points: qEntry.points,
							languageBreakdown: qEntry.languageBreakdown,
						}),
					});
					if (!res.ok) { remaining.push(qEntry); }
				} catch {
					remaining.push(qEntry);
				}
			}
			await writeQueue(remaining);

			const breakdown = Object.entries(session.languageBreakdown)
				.sort(([, a], [, b]) => b - a)
				.slice(0, 3)
				.map(([lang, pts]) => `${lang}: ${pts.toFixed(0)}`)
				.join(', ');
			vscode.window.showInformationMessage(
				`Session ended — +${finalPoints} pts earned (${breakdown || 'no edits'})`,
			);
		} catch (e: any) {
			console.error('Flush session failed', e);
		}
	}

	context.subscriptions.push(new vscode.Disposable(() => {
		if (currentSession) { flushSession(currentSession); }
	}));

	const onchangeDisposable = vscode.workspace.onDidChangeTextDocument((event) => {
		if (event.contentChanges.length === 0) {
			return;
		}

		const langId = event.document.languageId;
		let pendingPoints = 0;
		for (const change of event.contentChanges) {
			const multiplier = getLangMultipliers()[langId] ?? 1.0;
			const added = change.text.length * multiplier;
			const deleted = change.rangeLength * 0.3 * multiplier;
			pendingPoints += added + deleted;
		}

		const now = Date.now();
		if (!currentSession || now - currentSession.lastEditAt > SESSION_GAP_MS) {
		  // New session — previous one ended; flush it first if it existed
		  if (currentSession) flushSession(currentSession);
		  currentSession = { startedAt: now, lastEditAt: now, languageBreakdown: {}, totalPoints: 0, streak: lastKnownStreak };
		}
		currentSession.lastEditAt = now;
		currentSession.languageBreakdown[langId] = (currentSession.languageBreakdown[langId] ?? 0) + pendingPoints;
		currentSession.totalPoints += pendingPoints;
		clearTimeout(sessionInactivityTimer);
		sessionInactivityTimer = setTimeout(() => flushSession(currentSession!), SESSION_GAP_MS);

		statusBarItem.text = `⚡ DevVerse +${currentSession.totalPoints.toFixed(0)} pts 🔥 ${currentSession.streak}d`;
		statusBarItem.tooltip = Object.entries(currentSession.languageBreakdown)
			.map(([lang, points]) => `${lang}: ${points.toFixed(0)} pts`)
			.join('\n');
	});

	context.subscriptions.push(onchangeDisposable);
}

// This method is called when your extension is deactivated
export function deactivate() {}
