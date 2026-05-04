import { readFileSync, writeFileSync, readdirSync, statSync, chmodSync } from 'fs';
import { join } from 'path';

const DIST = 'dist';

// 1. Fix absolute paths in index.html â relative
const indexPath = join(DIST, 'index.html');
let html = readFileSync(indexPath, 'utf8');

// Replace src="/assets/ â src="./assets/
// Replace href="/assets/ â href="./assets/
html = html
  .replace(/\bsrc="\/assets\//g, 'src="./assets/')
  .replace(/\bhref="\/assets\//g, 'href="./assets/')
  .replace(/\bsrc='\/assets\//g, "src='./assets/")
  .replace(/\bhref='\/assets\//g, "href='./assets/");

writeFileSync(indexPath, html, 'utf8');
console.log('[postbuild] index.html: absolute paths â relative â');

// 2. Fix file permissions recursively: files â 644, dirs â 755
function fixPermissions(dir) {
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      chmodSync(fullPath, 0o755);
      fixPermissions(fullPath);
    } else {
      chmodSync(fullPath, 0o644);
    }
  }
}

fixPermissions(DIST);
console.log('[postbuild] permissions: files=644, dirs=755 â');
