# AI Coding Assistant

A VS Code extension that provides an AI-powered chat sidebar using Gemini CLI.

## Setup (one-time)

### 1. Install Gemini CLI
```bash
npm install -g @google/gemini-cli
```

### 2. Login to Gemini
```bash
gemini login
```

### 3. Open the project in VS Code
```
Open folder: d:\VSCode Extension\ai-coding-assistant
```

### 4. Install dependencies
```bash
npm install
```

### 5. Compile (auto-compiles on save)
```bash
npm run compile
```

## Run

### Option A: F5 Debug (recommended)
1. Open `d:\VSCode Extension\ai-coding-assistant` in VS Code
2. Press **F5**
3. Select "Run Extension"
4. A new VS Code window opens (Extension Development Host)
5. Click the **💬 icon** in the activity bar (left sidebar)
6. Type a message in the chat panel

### Option B: Watch mode (auto-recompile)
1. Terminal 1: `npm run watch`
2. Terminal 2: Press **F5**

### Option C: Side-load as extension
1. `npm run compile`
2. In VS Code: **Extensions** → **⋯** → **Install from VSIX...**
3. Or: **Extensions** → **⋯** → **Install from Folder...** → select this folder

## Usage

1. Open any file in the editor
2. Open the AI Chat sidebar (click the 💬 icon)
3. Type your question
4. For code changes: say "fix this code" or "refactor this" → AI will modify the active file after confirmation

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Sidebar not visible | `Ctrl+Shift+P` → "View: Reset View Locations" |
| "Gemini CLI not found" | `npm install -g @google/gemini-cli` |
| 429 / capacity error | Retry later — Google server is at capacity |
| Timeout | Increase `GEMINI_TIMEOUT` in `geminiService.ts` |
| No response | Check Output panel: `View → Output → AI Coding Assistant` |

## Project Structure

```
ai-coding-assistant/
├── src/
│   ├── controllers/
│   │   └── chatController.ts     # Registers webview + commands
│   ├── services/
│   │   ├── geminiService.ts      # Gemini CLI via child_process
│   │   ├── fileService.ts        # File read/write/confirm
│   │   └── agentService.ts       # Intent detection + routing
│   ├── views/
│   │   ├── chatView.ts           # WebviewViewProvider
│   │   └── chatViewHtml.ts       # Chat UI (HTML/CSS/JS)
│   └── extension.ts              # Entry point
├── webview/
│   └── index.html
├── .vscode/
│   ├── launch.json               # F5 config
│   └── tasks.json                # Build config
├── package.json
├── tsconfig.json
└── README.md
```
