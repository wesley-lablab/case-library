@echo off
chcp 65001 >nul 2>&1
title Case Library Manager

cd /d "%~dp0"

echo ======================================
echo    重启开发服务器
echo ======================================
echo.

taskkill /F /IM node.exe >nul 2>&1
echo [1/2] 已关闭旧服务器
timeout /t 2 /nobreak >nul

echo [2/2] 启动新服务器...
start "Case Library Dev Server" cmd /k "npm run dev"

timeout /t 6 /nobreak >nul

start http://localhost:5173

echo.
echo ======================================
echo  服务器已重启！
echo  请刷新浏览器页面
echo ======================================
pause
