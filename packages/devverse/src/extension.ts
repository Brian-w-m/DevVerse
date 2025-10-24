// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "devverse" is now active!');

	// Example of registering a command
	// const disposable = vscode.commands.registerCommand('devverse.helloWorld', () => {
	// 	// The code you place here will be executed every time your command is executed
	// 	// Display a message box to the user
	// 	vscode.window.showInformationMessage('Hello World from DevVerse!');
	// });

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
