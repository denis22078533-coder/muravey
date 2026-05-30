@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"

set "NODE=%~dp0nodejs\node-v20.11.0-win-x64\node.exe"
set "NPM=%~dp0nodejs\node-v20.11.0-win-x64\node_modules\npm\bin\npm-cli.js"
set "PROJECT=%~dp0"

echo ========================================
echo  Babki Scan - Установка зависимостей
echo ========================================
echo.
echo [1/2] Настройка npm...
"%NODE%" "%NPM%" config set prefix "%PROJECT%"
"%NODE%" "%NPM%" config set cache "%PROJECT%.npm-cache"

echo [2/2] Установка npm-пакетов...
"%NODE%" "%NPM%" install

echo.
echo ========================================
echo  Готово!
echo ========================================
echo Для запуска dev-сервера: "%NODE%" node_modules\.bin\vite
echo Для сборки: "%NODE%" node_modules\.bin\vite build
echo.
pause