import * as vscode from 'vscode';
import { ChatViewProvider } from '../views/chatView';
import { checkGeminiAvailable, getModel } from '../services/geminiService';

let outputChannel: vscode.OutputChannel;

export function activate(context: vscode.ExtensionContext) {
  outputChannel = vscode.window.createOutputChannel('AI Coding Assistant');
  context.subscriptions.push(outputChannel);

  outputChannel.appendLine('=== AI Coding Assistant Activating ===');

  // Check Gemini CLI
  checkGeminiAvailable().then((available) => {
    if (available) {
      outputChannel.appendLine('Gemini CLI: Found');
      outputChannel.appendLine('Model: ' + getModel());
    } else {
      outputChannel.appendLine('Gemini CLI: NOT FOUND');
      vscode.window.showErrorMessage(
        'Gemini CLI not found. Install: npm install -g @google/gemini-cli'
      );
    }
  });

  // Status bar
  const statusItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100
  );
  statusItem.text = '$(comment) AI (' + getModel() + ')';
  statusItem.tooltip = 'AI Coding Assistant - Model: ' + getModel();
  statusItem.command = 'aiCodingAssistant.focusChat';
  statusItem.show();
  context.subscriptions.push(statusItem);

  // Focus chat command
  context.subscriptions.push(
    vscode.commands.registerCommand('aiCodingAssistant.focusChat', () => {
      vscode.commands.executeCommand('aiCodingAssistant.chat.focus');
    })
  );

  // Register webview provider
  outputChannel.appendLine('Registering webview provider...');
  const provider = vscode.window.registerWebviewViewProvider(
    ChatViewProvider.viewType,
    new ChatViewProvider(context.extensionUri, outputChannel),
    {
      webviewOptions: { retainContextWhenHidden: true },
    }
  );
  context.subscriptions.push(provider);
  outputChannel.appendLine('Webview provider registered');

  // Clear chat command
  context.subscriptions.push(
    vscode.commands.registerCommand('aiCodingAssistant.clearChat', () => {
      outputChannel.appendLine('Clear chat command');
    })
  );

  outputChannel.appendLine('=== AI Coding Assistant Activated (Model: ' + getModel() + ') ===');
}

export function deactivate() {
  outputChannel?.appendLine('AI Coding Assistant deactivated');
}
