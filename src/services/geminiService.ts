import * as vscode from 'vscode';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface GeminiResponse {
  text: string;
  success: boolean;
  error?: string;
}

function getConfig(): vscode.WorkspaceConfiguration {
  return vscode.workspace.getConfiguration('aiCodingAssistant');
}

export function getModel(): string {
  return getConfig().get<string>('model', 'default');
}

export function getTimeout(): number {
  return getConfig().get<number>('timeout', 120) * 1000;
}

export async function queryGemini(prompt: string, options: { sessionId?: string, yolo?: boolean } = {}): Promise<GeminiResponse> {
  const model = getModel();
  const timeout = getTimeout();
  
  try {
    // We use a temp file to avoid Windows command length limits and escaping hell
    const tmp = require('os').tmpdir();
    const fs = require('fs');
    const path = require('path');
    const tmpFile = path.join(tmp, 'gemini_prompt_' + Date.now() + '.txt');
    fs.writeFileSync(tmpFile, prompt, 'utf8');

    // Run gemini using the file as input, this keeps it in "agent" mode rather than pipe mode
    let command = `gemini "${tmpFile}"`;
    if (model !== 'default') {
      command += ` -m ${model}`;
    }
    
    if (options.sessionId) {
      command += ` --resume ${options.sessionId}`;
    }
    if (options.yolo) {
      command += ' --yolo';
    }

    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    const { stdout, stderr } = await execAsync(command, {
      timeout: timeout,
      maxBuffer: 1024 * 1024 * 10,
      cwd: workspaceRoot
    });

    try { fs.unlinkSync(tmpFile); } catch { }

    if (stderr && stderr.includes('Error')) {
       return { text: '', success: false, error: stderr };
    }

    return { text: stdout.trim(), success: true };
  } catch (error: any) {
    let errorMessage = error.message || 'Unknown error';
    if (errorMessage.includes('ModelNotFoundError')) {
      errorMessage = `Model "${model}" not found. Please select a valid model from the dropdown.`;
    } else if (errorMessage.includes('gemini is not recognized')) {
      errorMessage = 'NOT_FOUND';
    } else if (errorMessage.includes('429') || errorMessage.includes('capacity available') || errorMessage.includes('RESOURCE_EXHAUSTED')) {
      errorMessage = `The model "${model === 'default' ? 'Default CLI Model' : model}" is currently overloaded or out of capacity (Error 429). Please select a different model from the dropdown menu (🤖) and try again.`;
    }
    return { text: '', success: false, error: errorMessage };
  }
}

export async function checkGeminiAvailable(): Promise<boolean> {
  try {
    const cmd = process.platform === 'win32' ? 'where gemini' : 'which gemini';
    await execAsync(cmd, { timeout: 3000 });
    return true;
  } catch {
    return false;
  }
}

export async function installGeminiCLI(): Promise<{ success: boolean; message: string }> {
  try {
    const { stdout } = await execAsync('npm install -g @google/gemini-cli');
    return { success: true, message: stdout };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

export async function loginGemini(): Promise<void> {
  // Opening a terminal is better as login is interactive
  const terminal = vscode.window.createTerminal('Gemini Login');
  terminal.show();
  terminal.sendText('gemini login');
}

export async function listSessions(): Promise<string[]> {
  try {
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    const { stdout } = await execAsync('gemini --list-sessions', { cwd: workspaceRoot });
    return stdout.split('\n').filter(line => line.trim().length > 0);
  } catch {
    return [];
  }
}
