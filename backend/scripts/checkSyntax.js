const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const srcPath = path.resolve(__dirname, '../src');
const files = [];

function collect(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) collect(fullPath);
    else if (entry.isFile() && entry.name.endsWith('.js')) files.push(fullPath);
  }
}

collect(srcPath);
let failed = false;
for (const file of files) {
  const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
  if (result.status !== 0) {
    failed = true;
    console.error(result.stderr || `Error de sintaxis en ${file}`);
  }
}

if (failed) process.exit(1);
console.log(`Sintaxis correcta en ${files.length} archivos JavaScript del backend.`);
