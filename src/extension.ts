import * as vscode from 'vscode';
import { activate as activateChat, deactivate as deactivateChat } from './controllers/chatController';

export function activate(context: vscode.ExtensionContext) {
  console.log('AI Coding Assistant entry point activating...');
  activateChat(context);
}

export function deactivate() {
  deactivateChat();
}
