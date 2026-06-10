@echo off
chcp 65001 >nul 2>&1
title 查看局域网访问地址

echo ======================================
echo    案例库局域网访问地址
echo ======================================
echo.

REM 获取本机IP地址
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /i "IPv4"') do (
    set IP=%%a
    goto :found
)

:found
set IP=%IP: =%

echo 本机IP地址: %IP%
echo.
echo 局域网其他电脑请访问:
echo.
echo    http://%IP%:5173
echo.
echo ======================================
echo.
echo 如果其他电脑无法访问，请检查:
echo 1. 防火墙是否关闭或允许5173端口
echo 2. 所有电脑是否在同一局域网
echo 3. 服务器是否已启动
echo.
pause
