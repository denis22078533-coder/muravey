@echo off
cd /d "%~dp0"
set "NODE=%~dp0nodejs\node-v20.11.0-win-x64\node.exe"
set "NPM=%~dp0nodejs\node-v20.11.0-win-x64\node_modules\npm\bin\npm-cli.js"

echo ============================================
echo  Деплой фронтенда Бабки Скан
echo ============================================
echo.

echo [1/3] Очистка старой сборки...
rmdir /s /q dist 2>nul

echo [2/3] Установка пакетов...
"%NODE%" "%NPM%" install --legacy-peer-deps 2>&1 | findstr /V "WARN"

echo.
echo [3/3] Сборка для продакшена...
echo.
"%NODE%" "node_modules\.bin\vite" build
echo.

if exist "dist\index.html" (
    echo ============================================
    echo  ГОТОВО! Папка dist/ собрана.
    echo ============================================
    echo.
    echo Для деплоя на Vercel:
    echo   1. Установите Vercel CLI: npm i -g vercel
    echo   2. Выполните: vercel --prod
    echo.
    echo ИЛИ просто загрузите папку dist/ на любой хостинг
    echo (Netlify, GitHub Pages, Cloudflare Pages, ваш VPS)
    echo.
) else (
    echo ОШИБКА: сборка не удалась, проверьте консоль выше.
)
pause