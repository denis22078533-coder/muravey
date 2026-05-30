const { execSync, spawnSync } = require('child_process');
const { existsSync, readdirSync, rmSync, mkdirSync, readFileSync, writeFileSync } = require('fs');
const path = require('path');

const ROOT = __dirname;
const NODE = path.join(ROOT, 'nodejs', 'node-v20.11.0-win-x64', 'node.exe');
const NPM = path.join(ROOT, 'nodejs', 'node-v20.11.0-win-x64', 'node_modules', 'npm', 'bin', 'npm-cli.js');
const LOG = process.stdout;

function log(msg) { LOG.write(msg + '\n'); }

function sh(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { cwd: ROOT, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'], ...opts });
  if (r.error) { log(`ERROR spawning ${cmd}: ${r.error.message}`); return false; }
  if (r.stdout) LOG.write(r.stdout);
  if (r.stderr) LOG.write(r.stderr);
  return r.status === 0;
}

log('=== BABKI SCAN BUILD ===\n');

// Step 1: Clean
log('[1] Cleaning...');
const nm = path.join(ROOT, 'node_modules');
const dist = path.join(ROOT, 'dist');
try { rmSync(nm, { recursive: true, force: true }); } catch(e) {}
try { rmSync(dist, { recursive: true, force: true }); } catch(e) {}

// Step 2: Install
log('[2] Installing dependencies...');
// Force prefix to project root
sh(NODE, [NPM, 'config', 'set', 'prefix', ROOT]);
const ok = sh(NODE, [NPM, 'install', '--legacy-peer-deps']);
if (!ok) { log('INSTALL FAILED'); process.exit(1); }

// Step 3: Verify
log('[3] Verifying vite...');
const viteDir = path.join(ROOT, 'node_modules', 'vite');
if (!existsSync(viteDir)) {
  log('VITE NOT FOUND in node_modules/');
  // Try to find it
  const alt = path.join(ROOT, 'nodejs', 'node-v20.11.0-win-x64', 'node_modules', 'vite');
  if (existsSync(alt)) {
    log('Vite found in nodejs prefix, creating junction...');
    try { rmSync(nm, { recursive: true, force: true }); } catch(e) {}
    sh('cmd', ['/c', 'mklink', '/j', nm, alt]);
  } else {
    log('ERROR: vite package is missing after install');
    if (existsSync(nm)) {
      const dirs = readdirSync(nm).filter(d => d[0] !== '.').slice(0, 30);
      log(`node_modules contains: ${dirs.join(', ')}`);
    }
    process.exit(1);
  }
}

// Step 4: Build
log('[4] Building with vite...');
const viteBin = path.join(ROOT, 'node_modules', '.bin', 'vite');
const buildResult = spawnSync(NODE, [viteBin, 'build'], {
  cwd: ROOT,
  encoding: 'utf8',
  stdio: ['pipe', 'pipe', 'pipe']
});

if (buildResult.stdout) LOG.write(buildResult.stdout);
if (buildResult.stderr) LOG.write(buildResult.stderr);

log(`\nBuild exit code: ${buildResult.status}`);

if (existsSync(path.join(ROOT, 'dist', 'index.html'))) {
  log('\n=== SUCCESS: dist/ is ready for deployment! ===');
  log('Upload the dist/ folder to Vercel, Netlify, or any static host.');
  log('Set environment variable VITE_API_URL to your backend URL.');
} else {
  log('\n=== BUILD FAILED ===');
  log('Check the output above for errors.');
  process.exit(1);
}