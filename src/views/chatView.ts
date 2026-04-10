import * as vscode from 'vscode';
import { processAgentAction, AgentAction } from '../services/agentService';
import { getChatViewHtml } from './chatViewHtml';
import { getModel, installGeminiCLI, loginGemini, checkGeminiAvailable, listSessions } from '../services/geminiService';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export class ChatViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'aiCodingAssistant.chat';

  private _view?: vscode.WebviewView;
  private _chatHistory: ChatMessage[] = [];
  private _isProcessing = false;
  private _output: vscode.OutputChannel;

  constructor(
    private readonly _extensionUri: vscode.Uri,
    outputChannel: vscode.OutputChannel
  ) {
    this._output = outputChannel;
  }

  private _log(msg: string): void {
    const line = '[AI-Chat] ' + msg;
    console.log(line);
    this._output.appendLine(line);
  }

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ): void {
    this._view = webviewView;
    this._log('resolveWebviewView called');

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri],
    };

    this._log('Setting webview HTML...');
    webviewView.webview.html = getChatViewHtml(this._view.webview, this._extensionUri, getModel());
    this._log('Webview HTML set, length: ' + webviewView.webview.html.length);

    this._view.webview.onDidReceiveMessage(
      async (message: any) => {
        this._log('Received: ' + JSON.stringify(message));

        if (message.type === 'sendMessage') {
          await this._handleUserMessage(message.content, message.options);
        } else if (message.type === 'clearChat') {
          this._clearChat();
        } else if (message.type === 'installGemini') {
          await this._handleInstallGemini();
        } else if (message.type === 'loginGemini') {
          await this._handleLoginGemini();
        } else if (message.type === 'checkStatus') {
          await this._handleCheckStatus();
        } else if (message.type === 'changeModel') {
          vscode.workspace.getConfiguration('aiCodingAssistant').update('model', message.model, true);
        }
      },
      undefined,
      []
    );

    this._log('Message handler registered');

    // Send welcome message
    setTimeout(() => {
      this._sendToWebview({
        id: this._genId(),
        role: 'assistant',
        content: 'Hello! I am your AI Coding Assistant.\n\nModel: **' + getModel() + '**\nStatus: ✅ Ready\n\nAsk me anything about your code!',
        timestamp: Date.now(),
      });
      this._log('Welcome message sent');
    }, 500);
  }

  private async _handleUserMessage(content: string, options: any = {}): Promise<void> {
    this._log('Handling message: "' + content + '"');

    if (!content || !content.trim()) {
      this._log('Empty content');
      return;
    }

    if (this._isProcessing) {
      this._log('Already processing');
      vscode.window.showWarningMessage('Please wait for the current response.');
      return;
    }

    this._isProcessing = true;
    this._sendSetLoading(true);

    const userMsg: ChatMessage = {
      id: this._genId(),
      role: 'user',
      content: content.trim(),
      timestamp: Date.now(),
    };
    this._sendToWebview(userMsg);

    try {
      this._log('Calling AI agent...');
      const action: AgentAction = await processAgentAction(content.trim(), options);
      this._log('AI response type: ' + action.type);

      if (action.content === 'NOT_FOUND') {
        this._sendToWebview({
          id: this._genId(),
          role: 'assistant',
          content: '⚠️ **Gemini CLI not found.**\n\nIt seems you don\'t have the Gemini CLI installed on your system. Please click the "Setup Gemini" button below to get started.',
          timestamp: Date.now(),
        });
        this._view?.webview.postMessage({ type: 'showSetup' });
        return;
      }

      this._sendToWebview({
        id: this._genId(),
        role: 'assistant',
        content: action.content,
        timestamp: Date.now(),
      });
    } catch (error: any) {
      this._log('Error: ' + error.message);
      this._sendToWebview({
        id: this._genId(),
        role: 'assistant',
        content: 'Error: ' + (error.message || 'Unknown error'),
        timestamp: Date.now(),
      });
    } finally {
      this._isProcessing = false;
      this._sendSetLoading(false);
    }
  }

  private async _handleInstallGemini(): Promise<void> {
    this._sendSetLoading(true);
    const result = await installGeminiCLI();
    this._sendSetLoading(false);
    
    if (result.success) {
      vscode.window.showInformationMessage('Gemini CLI installed successfully! Now you need to login.');
      this._view?.webview.postMessage({ type: 'setupStep', step: 'login' });
    } else {
      vscode.window.showErrorMessage('Installation failed: ' + result.message);
    }
  }

  private async _handleLoginGemini(): Promise<void> {
    await loginGemini();
    this._view?.webview.postMessage({ type: 'setupStep', step: 'check' });
  }

  private async _handleCheckStatus(): Promise<void> {
    const available = await checkGeminiAvailable();
    if (available) {
      const sessions = await listSessions();
      this._view?.webview.postMessage({ type: 'statusUpdate', available: true, sessions });
      this._sendToWebview({
        id: this._genId(),
        role: 'assistant',
        content: '✅ Gemini is ready to use!',
        timestamp: Date.now(),
      });
    } else {
      this._view?.webview.postMessage({ type: 'statusUpdate', available: false });
    }
  }

  private _sendToWebview(message: ChatMessage): void {
    this._chatHistory.push(message);
    if (this._view) {
      this._log('Posting message to webview: ' + message.role);
      this._view.webview.postMessage({ type: 'newMessage', message });
    } else {
      this._log('WARNING: No webview to send to!');
    }
  }

  private _sendSetLoading(value: boolean): void {
    if (this._view) {
      this._view.webview.postMessage({ type: 'setLoading', value });
    }
  }

  private _clearChat(): void {
    this._chatHistory = [];
    if (this._view) {
      this._view.webview.postMessage({ type: 'clearChat' });
    }
    this._sendToWebview({
      id: this._genId(),
      role: 'assistant',
      content: 'Chat cleared.',
      timestamp: Date.now(),
    });
  }

  private _genId(): string {
    return 'msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
  }

  public clearChat(): void {
    this._clearChat();
  }
}
