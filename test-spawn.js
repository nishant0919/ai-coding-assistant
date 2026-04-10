const { spawn } = require('child_process');

const args = ['--prompt', 'hi'];
const geminiProcess = spawn('gemini.cmd', args, {
  shell: true
});

let stdoutData = '';
let stderrData = '';

geminiProcess.stdout.on('data', (data) => { stdoutData += data.toString(); });
geminiProcess.stderr.on('data', (data) => { stderrData += data.toString(); });

geminiProcess.on('close', (code) => {
  console.log("CODE:", code);
  console.log("STDOUT:", stdoutData);
  console.log("STDERR:", stderrData);
});

geminiProcess.stdin.end();
