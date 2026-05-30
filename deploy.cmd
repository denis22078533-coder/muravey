@echo off
chcp 65001 >nul
cd /d "%~dp0"

set "NODE=%~dp0nodejs\node-v20.11.0-win-x64\node.exe"
set "NPM=%~dp0nodejs\node-v20.11.0-win-x64\node_modules\npm\bin\npm-cli.js"

echo ============================================================
echo   БАБКИ СКАН — ДЕПЛОЙ В ИНТЕРНЕТ
echo ============================================================
echo.
echo Этот скрипт собирает сайт для загрузки в интернет.
echo.
echo ЧТО НУЖНО СДЕЛАТЬ:
echo.
echo 1. Бэкенд (Python FastAPI):
echo    — Зарегистрируйтесь на railway.app ИЛИ fly.io ИЛИ купите VPS
echo    — Загрузите папку api/ на сервер
echo    — Установите: pip install -r api/requirements.txt
echo    — Задайте переменные окружения:
echo      DATABASE_URL=postgresql://user:pass@host:5432/dbname
echo      JWT_SECRET=ваш-секретный-ключ
echo    — Запустите: uvicorn api.index:app --host 0.0.0.0 --port 8080
echo.
echo 2. База данных:
echo    — Создайте PostgreSQL на supabase.com (бесплатно)
echo    — Или используйте Railway Postgres / VPS
echo    — Скопируйте DATABASE_URL в переменные окружения
echo.
echo 3. Фронтенд (собирается сейчас):
echo    — После сборки загрузите папку dist/ на Vercel / Netlify
echo    — В переменных окружения фронтенда укажите:
echo      VITE_API_URL=https://ваш-бэкенд-url
echo.
echo ============================================================
echo   СБОРКА ФРОНТЕНДА
echo ============================================================
echo.

echo [1/2] Установка зависимостей...
"%NODE%" "%NPM%" install --legacy-peer-deps 2>&1 | findstr /V "WARN"

echo.
echo [2/2] Сборка для продакшена...
"%NODE%" "node_modules\.bin\vite" build

echo.
if exist "dist\index.html" (
    echo ============================================================
    echo   ГОТОВО! Папка dist/ собрана.
    echo ============================================================
    echo.
    echo ЗАГРУЗИТЕ В ИНТЕРНЕТ:
    echo.
    echo ► Вариант А — Vercel (самый простой):
    echo    vercel --prod
    echo.
    echo ► Вариант Б — Netlify (перетащите папку dist/ на netlify.com)
    echo.
    echo ► Вариант В — Ручная загрузка на любой хостинг
    echo    Загрузите все файлы из папки dist/ на ваш сервер.
    echo.
    echo ⚠️ НЕ ЗАБУДЬТЕ указать VITE_API_URL в переменных окружения!
    echo.
) else (
    echo ОШИБКА: dist\index.html не создан. Проверьте логи выше.
)
pause