// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as path from 'path';
import * as dotenv from 'dotenv';

// TODO 1.2 #1: Add language multiplier map here.
// Read values from vscode.workspace.getConfiguration('devverse').get('languageMultipliers')
// so users can override them. Fallback defaults:
//   systems (go, rust, c, cpp): 1.5
//   backend (python, java, typescript, javascript): 1.2
//   frontend (html, css, scss, svelte, vue): 1.0
//   config/data (json, yaml, toml, xml): 0.5
//   docs (markdown, plaintext): 0.3
// Also register these in extension package.json under contributes.configuration.
// const LANG_MULTIPLIERS: Record<string, number> = { ... };

// TODO 1.3 #1: Define a SessionState interface to track the current coding session.
// interface SessionState {
//   startedAt: number;        // ms timestamp of first edit
//   lastEditAt: number;       // ms timestamp of most recent edit
//   languageBreakdown: Record<string, number>;  // languageId → weighted points accumulated
//   totalPoints: number;      // running weighted total for this session
//   streak: number;           // consecutive active days, fetched from backend on activation
// }

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

	// TODO 1.3 #2: Initialise session tracking variables here.
	// let currentSession: SessionState | null = null;
	// let sessionInactivityTimer: NodeJS.Timeout | undefined;
	// const SESSION_GAP_MS = (vscode.workspace.getConfiguration('devverse').get<number>('minSessionGapMinutes') ?? 5) * 60_000;

	// TODO 1.4 #1: Create helpers to read and write the offline flush queue.
	// The queue lives at path.join(context.globalStorageUri.fsPath, 'flush-queue.json').
	// Each entry: { userId: string; points: number; sessionId: string; timestamp: number }
	// async function readQueue(): Promise<FlushEntry[]> { ... }
	// async function writeQueue(q: FlushEntry[]): Promise<void> { ... }

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

	// Add debouncing for text changes
	let changeTimer: NodeJS.Timeout | undefined;
	let pendingCount = 0;

	const onchangeDisposable = vscode.workspace.onDidChangeTextDocument((event) => {
		if (event.contentChanges.length === 0) {
			return;
		}

		if (changeTimer) {
			clearTimeout(changeTimer);
		};

		// TODO 1.2 #2: Replace this flat contentChanges.length accumulation with weighted scoring.
		// For each change in event.contentChanges:
		//   const langId = event.document.languageId;
		//   const multiplier = LANG_MULTIPLIERS[langId] ?? 1.0;
		//   const added   = change.text.length * multiplier;
		//   const deleted  = change.rangeLength * 0.3 * multiplier;
		//   pendingPoints += added + deleted;
		// Also apply streak bonus (+10% per streak day, max 2.0×) and session bonus
		// (+20% flat if session duration >= 30 min) when flushing — not per-change.

		// TODO 1.3 #3: Update session state on every edit.
		// const now = Date.now();
		// if (!currentSession || now - currentSession.lastEditAt > SESSION_GAP_MS) {
		//   // New session — previous one ended; flush it first if it existed
		//   if (currentSession) flushSession(currentSession);
		//   currentSession = { startedAt: now, lastEditAt: now, languageBreakdown: {}, totalPoints: 0, streak: currentSession?.streak ?? 0 };
		// }
		// currentSession.lastEditAt = now;
		// currentSession.languageBreakdown[langId] = (currentSession.languageBreakdown[langId] ?? 0) + pointsThisChange;
		// currentSession.totalPoints += pointsThisChange;
		// Reset the inactivity timer: clearTimeout(sessionInactivityTimer);
		// sessionInactivityTimer = setTimeout(() => flushSession(currentSession!), SESSION_GAP_MS);

		// TODO 1.6 #1: After updating session state, refresh the status bar text to:
		//   `⚡ DevVerse  +${currentSession.totalPoints.toFixed(0)} pts  🔥 ${currentSession.streak}d`
		// and set statusBarItem.tooltip to the per-language breakdown string.

		// accumulate changes within the debounce window
		pendingCount += event.contentChanges.length;

		changeTimer = setTimeout(async () => {
			// capture and reset the batch count
			const toSend = pendingCount;
			pendingCount = 0;

			try {
				const jwt = await context.secrets.get('devverse.jwt');
				const userId = await context.secrets.get('devverse.userId');
				if (!jwt || !userId) return;

				// TODO 1.4 #2: Before this fetch, append { userId, points: toSend, sessionId, timestamp }
				// to the offline queue via writeQueue(). On fetch success, drain the queue by
				// iterating readQueue() and retrying oldest-first; remove entries that succeed.
				// On fetch failure, do NOT show an error — the queue will be drained next time.

				await fetch(`${backendUrlFromEnv}/users/${encodeURIComponent(userId)}/score/add`, {
					method: 'PATCH',
					headers: { 
						'Content-Type': 'application/json',
						'Authorization': `Bearer ${jwt}`
					},
					body: JSON.stringify({ increment: toSend }),
				});
			} catch (e: any) {
				console.error('Add score failed', e);
				vscode.window.showErrorMessage(`Add score failed: ${e?.message || String(e)}`);
			}
		}, 500);
		
	});

	// TODO 1.3 #3 (cont.) / TODO 1.6 #3: Create a flushSession() helper that:
	//   1. Applies streak + session-duration bonuses to currentSession.totalPoints
	//   2. POSTs to POST /users/:id/sessions (Phase 1.5 endpoint) with { points, startedAt,
	//      endedAt, languageBreakdown, sessionId }
	//   3. Shows vscode.window.showInformationMessage(
	//        `Session ended — +${pts} pts earned. Total: ${newTotal.toLocaleString()}`)
	//   4. Resets currentSession to null
	// Also call flushSession() inside context.subscriptions.push(new vscode.Disposable(...))
	// so it fires when VS Code closes (use vscode.workspace.onDidChangeWorkspaceFolders or
	// the extension deactivation path).

	// TODO 1.6 #2: Register devverse.languageMultipliers, devverse.minSessionGapMinutes,
	// and devverse.enabled settings in extension/package.json under
	// contributes.configuration.properties so users can override them via Settings UI.

	context.subscriptions.push(onchangeDisposable);
}

// This method is called when your extension is deactivated
export function deactivate() {}
