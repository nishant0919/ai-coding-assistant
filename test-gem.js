const { exec } = require('child_process');
exec('gemini.cmd --prompt "hi"', (err, stdout, stderr) => {
  console.log("ERR:", err);
  console.log("STDOUT:", stdout);
  console.log("STDERR:", stderr);
});
