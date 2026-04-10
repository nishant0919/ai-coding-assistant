const { spawn } = require('child_process');

// On Windows, use gemini.cmd just to test if it exits without TTY
const child = spawn('gemini.cmd', [], { shell: true });

child.stdout.on('data', d => console.log('OUT:', d.toString()));
child.stderr.on('data', d => console.log('ERR:', d.toString()));
child.on('close', c => console.log('CLOSE', c));
