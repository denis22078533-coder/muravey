@echo off
cd /d C:\Users\ЗС\Documents\Downloads\bd-main
echo Setting prefix...
nodejs\node-v20.11.0-win-x64\node_modules\npm\bin\npm-cli.js config set prefix "C:\Users\ЗС\Documents\Downloads\bd-main" > nul 2>&1
echo Installing Vite...
nodejs\node-v20.11.0-win-x64\node.exe nodejs\node-v20.11.0-win-x64\node_modules\npm\bin\npm-cli.js install > install-log.txt 2>&1
echo Done. Check install-log.txt