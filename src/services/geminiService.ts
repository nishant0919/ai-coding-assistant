import * as vscode from 'vscode';
import { exec, spawn } from 'child_process';
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

let cachedGeminiPath: string | null = null;

export async function queryGemini(
  prompt: string, 
  options: { sessionId?: string, yolo?: boolean, onUpdate?: (chunk: string) => void } = {}
): Promise<GeminiResponse> {
  const model = getModel();
  const timeout = getTimeout();
  
  return new Promise(async (resolve) => {
    try {
      const args: string[] = [];
      args.push('--prompt', prompt);

      if (model !== 'default') args.push('-m', model);
      if (options.sessionId) args.push('--resume', options.sessionId);
      if (options.yolo) args.push('--yolo');

      const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || process.cwd();
      
      let executable = 'gemini';
      let spawnArgs = args;
      let usingNodeDirectly = false;

      // Use cached path if available
      if (process.platform === 'win32') {
        if (!cachedGeminiPath) {
          try {
            const { stdout } = await execAsync('npm root -g');
            const globalPath = stdout.trim();
            const path = require('path');
            const possiblePaths = [
              path.join(globalPath, '@google', 'gemini-cli', 'bundle', 'gemini.js'),
              path.join(globalPath, '@google', 'gemini-cli', 'bin', 'gemini.js'),
              path.join(process.env.APPDATA || '', 'npm', 'node_modules', '@google', 'gemini-cli', 'bundle', 'gemini.js')
            ];
            for (const p of possiblePaths) {
              if (require('fs').existsSync(p)) {
                cachedGeminiPath = p;
                break;
              }
            }
          } catch (e) { console.error('Error resolving npm root:', e); }
        }

        if (cachedGeminiPath) {
          executable = 'node';
          spawnArgs = [cachedGeminiPath, ...args];
          usingNodeDirectly = true;
        } else {
          executable = 'gemini.cmd';
        }
      }

      console.log(`[Gemini-CLI] Executing: ${executable} ${spawnArgs.join(' ')}`);

      const geminiProcess = spawn(executable, spawnArgs, {
        cwd: workspaceRoot,
        env: { ...process.env, FORCE_COLOR: '0' }, // Disable colors for cleaner parsing
        shell: (!usingNodeDirectly && process.platform === 'win32')
      });

      let fullText = '';
      let stderrData = '';

      geminiProcess.stdout.on('data', (data) => {
        const chunk = data.toString();
        // Basic cleaning for streaming
        const cleanedChunk = chunk.replace(/\x1B\[[0-9;]*[a-zA-Z]/g, '')
                                  .replace(/[●◐◓◑◒]/g, '');
        
        fullText += cleanedChunk;
        
        if (options.onUpdate) {
          options.onUpdate(fullText.trim());
        }
      });

      geminiProcess.stderr.on('data', (data) => {
        stderrData += data.toString();
      });

      const timer = setTimeout(() => {
        geminiProcess.kill('SIGKILL');
        resolve({ text: fullText.trim(), success: false, error: 'Request timed out' });
      }, timeout);

      geminiProcess.on('close', (code) => {
        clearTimeout(timer);
        
        if (stderrData.includes('Error') && !fullText) {
           resolve({ text: '', success: false, error: stderrData.trim() });
           return;
        }

        resolve({ text: fullText.trim(), success: true });
      });

      geminiProcess.on('error', (error: any) => {
        clearTimeout(timer);
        resolve({ text: '', success: false, error: error.message });
      });

      geminiProcess.stdin.end();

    } catch (error: any) {
      resolve({ text: '', success: false, error: error.message });
    }
  });
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
