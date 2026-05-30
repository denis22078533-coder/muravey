@echo off
setlocal enabledelayedexpansion
chcp 866 >nul
cd /d "%~dp0"

set "NODE=%~dp0nodejs\node-v20.11.0-win-x64\node.exe"
set "NPM=%~dp0nodejs\node-v20.11.0-win-x64\node_modules\npm\bin\npm-cli.js"
set "VITE=%~dp0node_modules\.bin\vite"

echo ============================================
echo  BABKI SCAN - Build for Production
echo ============================================
echo.

rem Очистка
echo [1] Cleaning...
rmdir /s /q "%~dp0node_modules" 2>nul
rmdir /s /q "%~dp0dist" 2>nul

rem Установка
echo [2] Installing packages...
call "%NODE%" "%NPM%" install --legacy-peer-deps > "%~dp0_build_install.log" 2>&1
echo    Install exit code: %ERRORLEVEL%
if %ERRORLEVEL% NEQ 0 (
    echo    INSTALL FAILED - see _build_install.log
    type "%~dp0_build_install.log"
    pause
    exit /b 1
)

rem Проверка нужного пакета
echo [3] Checking vite...
"%NODE%" -e "const fs=require('fs'); process.exit(fs.existsSync('node_modules/vite')?0:1)"
if %ERRORLEVEL% NEQ 0 (
    echo    VITE NOT FOUND in node_modules
    echo    Dirs in node_modules:
    "%NODE%" -e "console.log(require('fs').readdirSync('node_modules').filter(d=>d[0]!=='.').slice(0,20).join(', '))"
    pause
    exit /b 1
)

rem Сборка
echo [4] Building...
call "%NODE%" "%VITE%" build > "%~dp0_build_vite.log" 2>&1
set BUILD_EXIT=%ERRORLEVEL%
echo    Build exit code: %BUILD_EXIT%
type "%~dp0_build_vite.log"

rem Итог
echo.
if exist "%~dp0dist\index.html" (
    echo ============================================
    echo  SUCCESS! dist/ folder is ready.
    echo  Upload dist/ to Vercel or Netlify.
    echo ============================================
) else (
    echo ============================================
    echo  BUILD FAILED - check _build_vite.log
    echo ============================================
    type "%~dp0_build_vite.log" | findstr /i "error fail"
)
pause