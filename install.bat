@echo off
cd /d %~dp0
set "PATH=%~dp0nodejs\node-v20.11.0-win-x64;%PATH%"
nodejs\node-v20.11.0-win-x64\node.exe nodejs\node-v20.11.0-win-x64\node_modules\npm\bin\npm-cli.js config set prefix "%~dp0"
nodejs\node-v20.11.0-win-x64\node.exe nodejs\node-v20.11.0-win-x64\node_modules\npm\bin\npm-cli.js install