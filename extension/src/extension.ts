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

	// Example of registering a command
	// const disposable = vscode.commands.registerCommand('devverse.helloWorld', () => {
	// 	// The code you place here will be executed every time your command is executed
	// 	// Display a message box to the user
	// 	vscode.window.showInformationMessage('Hello World from DevVerse!');
	// });

	const session = await vscode.authentication.getSession(
		'github',
		['read:user', 'user:email'],
		{ createIfNone: true }
	);

	if (session) {
		vscode.window.showInformationMessage(`Logged in as ${session.account.label}`);

		// Determine backend URL from env
		const backendUrlFromEnv = process.env.BACKEND_URL;

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
			}

			console.log('Backend auth success:', data.user);
			vscode.window.showInformationMessage(`Backend auth OK for ${data.user?.email || data.user?.name || session.account.label}`);

			// Optional: authenticated smoke test
			try {
				const jwt = await context.secrets.get('devverse.jwt');
				if (jwt) {
					await fetch(`${backendUrlFromEnv}/users`, {
						method: 'GET',
						headers: { 'Authorization': `Bearer ${jwt}` }
					});
				}
			} catch { /* ignore */ }
		} catch (e: any) {
			console.error('Backend auth failed', e);
			vscode.window.showErrorMessage(`Backend auth failed: ${e?.message || String(e)}`);
		}
	}

	// Add debouncing for text changes
	let changeTimer: NodeJS.Timeout | undefined;
	let changeCounter = 0;

	const onchangeDisposable = vscode.workspace.onDidChangeTextDocument((event) => {
		if (event.contentChanges.length === 0) {
			return;
		}

		if (changeTimer) {
			clearTimeout(changeTimer);
		};

		changeCounter += event.contentChanges.length;

		changeTimer = setTimeout(() => {
			const changes = event.contentChanges.map(change => ({
				addedText: change.text,
				position: `line ${change.range.start.line}, char ${change.range.start.character}`,
				length: change.rangeLength
			}));
			
			vscode.window.showInformationMessage(`Total num changes: ${changeCounter}. Changes: ${JSON.stringify(changes)}`);
		}, 500);
		
	});

	context.subscriptions.push(onchangeDisposable);
}

// This method is called when your extension is deactivated
export function deactivate() {}
