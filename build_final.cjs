const { spawnSync } = require('child_process');
const { existsSync, rmSync, readdirSync, readFileSync } = require('fs');
const path = require('path');

const ROOT = __dirname;
const NODE = path.join(ROOT, 'nodejs', 'node-v20.11.0-win-x64', 'node.exe');
const NPM = path.join(ROOT, 'nodejs', 'node-v20.11.0-win-x64', 'node_modules', 'npm', 'bin', 'npm-cli.js');

function log(msg) { process.stdout.write(msg + '\n'); }

function sh(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, {
    cwd: ROOT,
    shell: true,
    encoding: 'utf8',
    env: { ...process.env, npm_config_prefix: ROOT },
    ...opts
  });
  if (r.stdout) process.stdout.write(r.stdout);
  if (r.stderr) process.stderr.write(r.stderr);
  return r.status === 0;
}

log('=== BABKI SCAN BUILD (FINAL) ===\n');

// Clean
log('[clean] Removing old artifacts...');
try { rmSync(path.join(ROOT, 'node_modules'), { recursive: true, force: true }); } catch(e) {}
try { rmSync(path.join(ROOT, 'dist'), { recursive: true, force: true }); } catch(e) {}
try { rmSync(path.join(ROOT, 'package-lock.json'), { force: true }); } catch(e) {}
try { rmSync(path.join(ROOT, '.npm'), { recursive: true, force: true }); } catch(e) {}

// Reset npm config
log('[config] Setting npm prefix to project root...');
sh(NODE, [NPM, 'config', 'set', 'prefix', ROOT]);
sh(NODE, [NPM, 'config', 'set', 'cache', path.join(ROOT, '.npm-cache')]);

// Install with explicit prefix
log('[install] Installing all packages (this may take a minute)...');
const installOk = sh(NODE, [NPM, 'install', '--legacy-peer-deps', '--no-audit', '--no-fund'], {
  stdio: ['pipe', 'pipe', 'pipe']
});

if (!installOk) {
  log('ERROR: npm install failed. Check the output above.');
  process.exit(1);
}

// Check vite
log('[verify] Checking if vite is installed...');
const vitePkg = path.join(ROOT, 'node_modules', 'vite', 'package.json');
let viteExists = existsSync(vitePkg);
if (!viteExists) {
  // Try junction fallback
  const alt = path.join(ROOT, 'nodejs', 'node-v20.11.0-win-x64', 'node_modules', 'vite', 'package.json');
  if (existsSync(alt)) {
    log('vite found in nodejs prefix, linking...');
    try { rmSync(path.join(ROOT, 'node_modules'), { recursive: true, force: true }); } catch(e) {}
    sh('cmd', ['/c', 'mklink', '/j', path.join(ROOT, 'node_modules'), path.join(ROOT, 'nodejs', 'node-v20.11.0-win-x64', 'node_modules')]);
    viteExists = existsSync(vitePkg);
  }
}

if (!viteExists) {
  const nmDir = path.join(ROOT, 'node_modules');
  if (existsSync(nmDir)) {
    log(`node_modules contents: ${readdirSync(nmDir).filter(d => d[0] !== '.').slice(0, 30).join(', ')}`);
  }
  log('FATAL: vite package is missing. Build cannot continue.');
  process.exit(1);
}

const ver = JSON.parse(readFileSync(vitePkg, 'utf8')).version;
log(`vite version: ${ver}`);

// Build
log('[build] Running vite build...');
const viteBin = path.join(ROOT, 'node_modules', '.bin', 'vite');
const buildRes = spawnSync(NODE, [viteBin, 'build'], {
  cwd: ROOT,
  shell: true,
  encoding: 'utf8',
  env: { ...process.env, NODE_ENV: 'production' }
});

if (buildRes.stdout) process.stdout.write(buildRes.stdout);
if (buildRes.stderr) process.stderr.write(buildRes.stderr);

log(`\nBuild exit code: ${buildRes.status}`);

if (existsSync(path.join(ROOT, 'dist', 'index.html'))) {
  log('=== SUCCESS: dist/ folder created ===');
  log('Deploy: upload dist/ to Vercel/Netlify with env VITE_API_URL');
} else {
  log('=== BUILD FAILED ===');
  process.exit(1);
}