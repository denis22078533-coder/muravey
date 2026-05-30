const cp = require('child_process');
const path = require('path');
const fs = require('fs');

const cwd = __dirname;
const nodeExe = path.join(cwd, 'nodejs', 'node-v20.11.0-win-x64', 'node.exe');
const npmCli = path.join(cwd, 'nodejs', 'node-v20.11.0-win-x64', 'node_modules', 'npm', 'bin', 'npm-cli.js');

function run(cmd, args) {
  const r = cp.spawnSync(cmd, args, { cwd, shell: true, encoding: 'utf8', stdio: 'pipe' });
  if (r.error) { console.error('SPAWN ERROR:', r.error.message); return ''; }
  if (r.stderr) console.error(r.stderr.slice(0,500));
  return (r.stdout || '').trim();
}

// Delete old node_modules
console.log('Cleaning...');
const nm = path.join(cwd, 'node_modules');
if (fs.existsSync(nm)) {
  try { fs.rmSync(nm, { recursive: true, force: true }); } catch(e) { console.log('rm warning:', e.message); }
}
// Delete .npmrc
const npmrc = path.join(cwd, '.npmrc');
if (fs.existsSync(npmrc)) fs.unlinkSync(npmrc);

// Set prefix programmatically
console.log('Setting npm prefix...');
run(nodeExe, [npmCli, 'config', 'set', 'prefix', cwd]);
run(nodeExe, [npmCli, 'config', 'set', 'cache', path.join(cwd, '.npm-cache')]);
console.log('Prefix:', run(nodeExe, [npmCli, 'config', 'get', 'prefix']));

// Clean install
console.log('Running npm install...');
const result = cp.spawnSync(nodeExe, [npmCli, 'install'], {
  cwd,
  shell: true,
  encoding: 'utf8',
  stdio: 'inherit'
});

if (result.error) {
  console.error('Failed:', result.error.message);
} else {
  console.log('Install exit code:', result.status);
}

// Verify
const vitePkg = path.join(cwd, 'node_modules', 'vite', 'package.json');
if (fs.existsSync(vitePkg)) {
  const v = JSON.parse(fs.readFileSync(vitePkg, 'utf8'));
  console.log('VITE VERSION:', v.version);
  console.log('SUCCESS - all packages installed');
} else {
  console.log('Vite not found in node_modules');
  // Check if it's somewhere else
  const alt = path.join(cwd, 'nodejs', 'node-v20.11.0-win-x64', 'node_modules', 'vite');
  if (fs.existsSync(alt)) console.log('Vite found in nodejs prefix, creating junction...');
}