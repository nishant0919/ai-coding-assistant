import * as vscode from 'vscode';
import { queryGemini } from './geminiService';
import { getActiveFileContent, getActiveFileLanguage, applyFileEdits, confirmAction } from './fileService';

export interface AgentAction {
  type: 'response' | 'edit' | 'error';
  content: string;
  filePath?: string;
}

/**
 * Detect if the user message implies code modification
 */
function detectEditIntent(message: string): boolean {
  const editKeywords = [
    'fix this code',
    'fix this',
    'refactor this',
    'refactor',
    'improve this',
    'optimize this',
    'rewrite this',
    'update this',
    'change this',
    'modify this',
    'clean up',
    'clean this',
    'reformat',
    'apply',
    'make it',
    'add error handling',
    'add comments',
    'add types',
    'convert to',
  ];

  const lowerMessage = message.toLowerCase();
  return editKeywords.some((keyword) => lowerMessage.includes(keyword));
}

/**
 * Build a system prompt for code editing
 */
function buildEditPrompt(
  userMessage: string,
  fileContent: string,
  language: string
): string {
  return `You are an expert coding assistant. The user wants you to ${userMessage}.

Here is the current file content (${language}):
\`\`\`${language}
${fileContent}
\`\`\`

Provide the COMPLETE modified file content. Do NOT use placeholders. Do NOT explain. Only output the code that should replace the entire file.
Start your response with the code block using \`\`\`${language} and end with \`\`\`.`;
}

/**
 * Build a general query prompt with file context
 */
function buildGeneralPrompt(
  userMessage: string,
  fileContent: string | null,
  language: string
): string {
  if (!fileContent) {
    return userMessage;
  }

  return `Here is the current file content (${language}):
\`\`\`${language}
${fileContent}
\`\`\`

User request: ${userMessage}

Please help the user with their request. Be concise and helpful.`;
}

/**
 * Clean Gemini CLI output - remove progress lines and spinner artifacts
 */
function cleanGeminiOutput(raw: string): string {
  // Remove ANSI escape codes
  let cleaned = raw.replace(/\x1B\[[0-9;]*[a-zA-Z]/g, '');

  // Remove common progress lines (e.g., "● 1/5", "◐ working...")
  cleaned = cleaned.replace(/^[●◐◓◑◒]\s*\d+\/\d+.*$/gm, '');
  cleaned = cleaned.replace(/^[●◐◓◑◒]\s*.*$/gm, '');

  // Remove empty lines at start/end
  cleaned = cleaned.trim();

  return cleaned;
}

/**
 * Extract code block from Gemini response
 */
function extractCodeFromResponse(response: string): string | null {
  const codeBlockRegex = /```[\w]*\n([\s\S]*?)```/;
  const match = response.match(codeBlockRegex);

  if (match && match[1]) {
    return match[1].trim();
  }

  return null;
}

/**
 * Main agent logic: process user message and return action
 */
export async function processAgentAction(
  userMessage: string,
  options: any = {},
  onUpdate?: (chunk: string) => void
): Promise<AgentAction> {
  const shouldEdit = detectEditIntent(userMessage);
  const fileContext = getActiveFileContent();
  const language = getActiveFileLanguage();

  if (shouldEdit && fileContext) {
    return await handleEditAction(userMessage, fileContext.content, language, options, onUpdate);
  }

  return await handleGeneralAction(userMessage, fileContext?.content || null, language, options, onUpdate);
}

/**
 * Handle code edit action
 */
async function handleEditAction(
  userMessage: string,
  fileContent: string,
  language: string,
  options: any = {},
  onUpdate?: (chunk: string) => void
): Promise<AgentAction> {
  const prompt = buildEditPrompt(userMessage, fileContent, language);

  const response = await queryGemini(prompt, { ...options, onUpdate });

  if (!response.success) {
    if (response.error === 'NOT_FOUND') {
      return { type: 'error', content: 'NOT_FOUND' };
    }
    return {
      type: 'error',
      content: `Failed to get AI response: ${response.error}`,
    };
  }

  const cleanedResponse = cleanGeminiOutput(response.text);
  const newCode = extractCodeFromResponse(cleanedResponse);

  if (!newCode) {
    return {
      type: 'response',
      content: cleanedResponse,
    };
  }

  // Ask user for confirmation unless YOLO mode is on
  let confirmed = false;
  if (options.yolo) {
    confirmed = true;
  } else {
    confirmed = await confirmAction(
      'AI suggests code changes. Do you want to apply them to the active file?'
    );
  }

  if (!confirmed) {
    return {
      type: 'response',
      content: `Changes were not applied. Here is the suggested code:\n\n\`\`\`${language}\n${newCode}\n\`\`\``,
    };
  }

  const fileContext = getActiveFileContent();
  if (!fileContext) {
    return {
      type: 'error',
      content: 'Could not determine active file to apply changes.',
    };
  }

  const success = await applyFileEdits(fileContext.filePath, newCode);

  if (success) {
    return {
      type: 'edit',
      content: `Changes have been applied to the file.`,
      filePath: fileContext.filePath,
    };
  } else {
    return {
      type: 'error',
      content: 'Failed to apply changes to the file.',
    };
  }
}

/**
 * Handle general query action
 */
async function handleGeneralAction(
  userMessage: string,
  fileContent: string | null,
  language: string,
  options: any = {},
  onUpdate?: (chunk: string) => void
): Promise<AgentAction> {
  const prompt = buildGeneralPrompt(userMessage, fileContent, language);

  const response = await queryGemini(prompt, { ...options, onUpdate });

  if (!response.success) {
    if (response.error === 'NOT_FOUND') {
      return { type: 'error', content: 'NOT_FOUND' };
    }
    return {
      type: 'error',
      content: `Failed to get AI response: ${response.error}`,
    };
  }

  const cleaned = cleanGeminiOutput(response.text);

  return {
    type: 'response',
    content: cleaned,
  };
}
