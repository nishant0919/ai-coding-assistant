import * as vscode from 'vscode';

/**
 * Get the content of the currently active editor
 */
export function getActiveFileContent(): { content: string; filePath: string } | null {
  const editor = vscode.window.activeTextEditor;

  if (!editor) {
    return null;
  }

  const document = editor.document;
  return {
    content: document.getText(),
    filePath: document.fileName,
  };
}

/**
 * Get the language of the active file
 */
export function getActiveFileLanguage(): string {
  const editor = vscode.window.activeTextEditor;

  if (!editor) {
    return '';
  }

  return editor.document.languageId;
}

/**
 * Apply text edits to the active document
 */
export async function applyFileEdits(
  filePath: string,
  newContent: string
): Promise<boolean> {
  try {
    const document = await vscode.workspace.openTextDocument(filePath);
    const edit = new vscode.WorkspaceEdit();

    const fullRange = new vscode.Range(
      document.positionAt(0),
      document.positionAt(document.getText().length)
    );

    edit.replace(document.uri, fullRange, newContent);

    const success = await vscode.workspace.applyEdit(edit);

    if (success) {
      await document.save();
    }

    return success;
  } catch (error) {
    console.error('Failed to apply file edits:', error);
    return false;
  }
}

/**
 * Show a diff editor comparing original vs new content
 */
export async function showDiff(
  originalContent: string,
  newContent: string,
  language: string = 'text'
): Promise<boolean> {
  const originalUri = vscode.Uri.parse('untitled:original').with({
    scheme: 'untitled',
    path: `original.${language}`,
  });

  const modifiedUri = vscode.Uri.parse('untitled:modified').with({
    scheme: 'untitled',
    path: `modified.${language}`,
  });

  await vscode.commands.executeCommand(
    'vscode.diff',
    vscode.Uri.file('').with({ scheme: 'untitled' }),
    vscode.Uri.file('').with({ scheme: 'untitled' }),
    'AI Suggested Changes'
  );

  // Alternative: Show in a virtual document
  const originalDoc = await vscode.workspace.openTextDocument({
    content: originalContent,
    language,
  });

  const modifiedDoc = await vscode.workspace.openTextDocument({
    content: newContent,
    language,
  });

  await vscode.window.showTextDocument(originalDoc, { preview: false });
  await vscode.window.showTextDocument(modifiedDoc, { preview: false });

  return true;
}

/**
 * Ask user for confirmation before applying changes
 */
export async function confirmAction(message: string): Promise<boolean> {
  const selection = await vscode.window.showInformationMessage(
    message,
    { modal: true },
    'Apply Changes',
    'Cancel'
  );

  return selection === 'Apply Changes';
}
