const { execSync } = require('child_process');
const path = require('path');

const currentDir = __dirname;
const nodeExe = path.join(currentDir, 'nodejs', 'node-v20.11.0-win-x64', 'node.exe');
const npmCli = path.join(currentDir, 'nodejs', 'node-v20.11.0-win-x64', 'node_modules', 'npm', 'bin', 'npm-cli.js');

try {
  execSync(`"${nodeExe}" "${npmCli}" config set prefix "${currentDir}"`, { stdio: 'ignore', cwd: currentDir });
  execSync(`"${nodeExe}" "${npmCli}" install`, { stdio: 'inherit', cwd: currentDir });
} catch (e) {
  console.error('Error:', e.message);
}