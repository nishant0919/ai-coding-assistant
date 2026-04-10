const raw = `Hello! I'm Gemini CLI, your autonomous engineering assistant. I'm ready to help you with your project.

I see you have a workspace with several components, including:
- A VS Code extension (\`ai-coding-assistant\`)
- A UI for Gemini CLI (\`repo/Gemini-CLI-UI\`)
- Another VS Code extension project (\`repo2/gemini-cli-on-vscode\`)

How can I assist you with your codebase today?`;

let cleaned = raw.replace(/\x1B\[[0-9;]*[a-zA-Z]/g, '');

// Remove common progress lines (e.g., "● 1/5", "◐ working...")
cleaned = cleaned.replace(/^[●◐◓◑◒]\s*\d+\/\d+.*$/gm, '');
cleaned = cleaned.replace(/^[●◐◓◑◒]\s*.*$/gm, '');

// Remove empty lines at start/end
cleaned = cleaned.trim();

console.log("CLEANED: '" + cleaned + "'");
