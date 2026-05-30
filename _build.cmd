@echo off
setlocal
cd /d "%~dp0"

set "NODE=%~dp0nodejs\node-v20.11.0-win-x64\node.exe"
set "NPM=%~dp0nodejs\node-v20.11.0-win-x64\node_modules\npm\bin\npm-cli.js"

echo ============================================
echo  BUILD: Очистка и установка пакетов
echo ============================================

REM Remove junction or old node_modules
rmdir /s /q node_modules 2>nul
rmdir node_modules 2>nul
del node_modules 2>nul
del .npmrc 2>nul

REM Create fresh node_modules
mkdir node_modules

REM Set npm prefix to project root
"%NODE%" "%NPM%" config set prefix "%cd%"

REM Install all dependencies from package.json
echo Installing dependencies...
"%NODE%" "%NPM%" install --legacy-peer-deps

REM Verify vite installed
"%NODE%" -e "console.log(require('fs').existsSync('node_modules/vite')?'VITE OK':'VITE MISSING')" > build_check.txt 2>&1
type build_check.txt

REM Build
echo.
echo ============================================
echo  BUILD: Сборка фронтенда (vite build)
echo ============================================
"%NODE%" "node_modules\.bin\vite" build

if exist "dist\index.html" (
    echo.
    echo ============================================
    echo  SUCCESS: dist/ готов к деплою!
    echo ============================================
) else (
    echo.
    echo ERROR: dist/index.html не создан
)