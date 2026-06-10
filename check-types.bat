@echo off
chcp 65001 >nul 2>&1
cd /d "%~dp0"
echo Running TypeScript check...
npm run check
pause
