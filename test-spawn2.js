const { spawn } = require('child_process');
const { execSync } = require('child_process');

const globalPath = execSync('npm root -g').toString().trim();
const geminiJs = require('path').join(globalPath, '@google', 'gemini-cli', 'bundle', 'gemini.js');

const geminiProcess = spawn('node', [geminiJs, '--prompt', 'hi'], {
  stdio: ['pipe', 'pipe', 'pipe']
});

geminiProcess.stdout.on('data', (data) => console.log("STDOUT:", data.toString()));
geminiProcess.stderr.on('data', (data) => console.log("STDERR:", data.toString()));
geminiProcess.on('close', (code) => console.log("CLOSE:", code));

geminiProcess.stdin.end();
