const { spawn } = require('child_process');

const geminiProcess = spawn('gemini.cmd', [], {
  shell: true
});

let stdoutData = '';

geminiProcess.stdout.on('data', (data) => { 
  stdoutData += data.toString();
  console.log("GOT:", data.toString());
  if (data.toString().includes("How can I assist you")) {
    console.log("Sending prompt via stdin...");
    geminiProcess.stdin.write("Write a haiku about code.\n");
  }
});

geminiProcess.stderr.on('data', (data) => { 
    console.log("ERR:", data.toString());
});

geminiProcess.on('close', (code) => {
  console.log("CLOSE:", code);
});
