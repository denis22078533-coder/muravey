@echo off
cd /d C:\Users\ЗС\Documents\Downloads\bd-main
set NODE=C:\Users\ЗС\Documents\Downloads\bd-main\nodejs\node-v20.11.0-win-x64\node.exe
set NPM=C:\Users\ЗС\Documents\Downloads\bd-main\nodejs\node-v20.11.0-win-x64\node_modules\npm\bin\npm-cli.js
"%NODE%" "%NPM%" config set prefix "C:\Users\ЗС\Documents\Downloads\bd-main" --location=project
"%NODE%" "%NPM%" install