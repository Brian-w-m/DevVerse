// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as path from 'path';
import * as dotenv from 'dotenv';

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

	context.subscriptions.push(onchangeDisposable);
}

// This method is called when your extension is deactivated
export function deactivate() {}
