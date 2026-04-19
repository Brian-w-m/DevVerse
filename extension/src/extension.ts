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
	const SESSION_GAP_MS = (vscode.workspace.getConfiguration('devverse').get<number>('minSessionGapMinutes') ?? 5) * 60_000;
	
	const flushQueuePath = path.join(context.globalStorageUri.fsPath, 'flush-queue.json');
	interface FlushEntry {
		userId: string;
		points: number;
		sessionId: string;
		timestamp: number;
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

	// Check auth status on activation (silently)
	checkAuthStatus();

	// TODO 1.3 #4: After checkAuthStatus resolves, fetch the user's current streak from
	// GET /users/:id/streak (Phase 1.5 endpoint) and store it in currentSession.streak
	// so the status bar and session flush payload include the correct streak value.

	// TODO 1.6 #4: Register the 'devverse.showStats' command here (before the text-change
	// listener). It should open a VS Code Webview panel ('devverse.statsPanel') displaying
	// a mini dashboard: current session points, language breakdown bar chart, streak,
	// today's daily quests (fetched from GET /users/:id/quests once Phase 2 is complete).
	// Use panel.webview.html to render the content with the same Terminal Operator palette.

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
			await fetch(`${backendUrlFromEnv}/users/${encodeURIComponent(userId)}/sessions`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${jwt}`,
				},
				body: JSON.stringify({
					sessionId,
					userId,
					startedAt: session.startedAt,
					endedAt: now,
					points: finalPoints,
					languageBreakdown: session.languageBreakdown,
				}),
			});

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
		  currentSession = { startedAt: now, lastEditAt: now, languageBreakdown: {}, totalPoints: 0, streak: currentSession?.streak ?? 0 };
		}
		currentSession.lastEditAt = now;
		currentSession.languageBreakdown[langId] = (currentSession.languageBreakdown[langId] ?? 0) + pendingPoints;
		currentSession.totalPoints += pendingPoints;
		clearTimeout(sessionInactivityTimer);
		sessionInactivityTimer = setTimeout(() => flushSession(currentSession!), SESSION_GAP_MS);

		// TODO 1.6 #1: After updating session state, refresh the status bar text to:
		//   `⚡ DevVerse  +${currentSession.totalPoints.toFixed(0)} pts  🔥 ${currentSession.streak}d`
		// and set statusBarItem.tooltip to the per-language breakdown string.
	});

	// TODO 1.6 #2: Register devverse.languageMultipliers, devverse.minSessionGapMinutes,
	// and devverse.enabled settings in extension/package.json under
	// contributes.configuration.properties so users can override them via Settings UI.

	context.subscriptions.push(onchangeDisposable);
}

// This method is called when your extension is deactivated
export function deactivate() {}
