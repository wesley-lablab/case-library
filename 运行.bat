@echo off
chcp 65001 >nul 2>&1
title Case Library Manager

cd /d "%~dp0"

echo ======================================
echo    Case Library Manager Launcher
echo ======================================
echo.

if not exist "node_modules" (
    echo [INFO] First run, dependencies may need to be installed...
    echo.
)

set PKG=
where pnpm >nul 2>&1
if %errorlevel% equ 0 set PKG=pnpm

if not defined PKG (
    where npm >nul 2>&1
    if %errorlevel% equ 0 set PKG=npm
)

if not defined PKG (
    if exist "node_modules\.bin\pnpm.cmd" set PKG=node_modules\.bin\pnpm.cmd
    if exist "node_modules\.bin\npm.cmd" if not defined PKG set PKG=node_modules\.bin\npm.cmd
)

if not defined PKG (
    echo [ERROR] Node.js package manager not found!
    echo Please install Node.js: https://nodejs.org/
    pause
    exit
)

echo [READY] Using: %PKG%
echo.

start "Case Library Dev Server" cmd /k "%PKG% dev"

timeout /t 6 /nobreak >nul

start http://localhost:5173

echo.
echo ======================================
echo  Started!
echo  Please check your browser
echo ======================================
pause
