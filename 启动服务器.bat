@echo off
chcp 65001 >nul 2>&1
title 中旅会展案例库 - 服务器

echo =====================================
echo    中旅会展案例库
echo =====================================
echo.

cd /d "%~dp0"

echo [1/3] 检查数据文件...
if not exist "data.json" (
    echo 初始化数据文件...
    echo {"cases": []} > data.json
)

echo.
echo [2/3] 显示访问地址...
echo.
echo =====================================
echo.
echo 本机访问: http://localhost:5173
echo 数据迁移: http://localhost:5173/migrate.html
echo.

for /f "tokens=14" %%a in ('ipconfig ^| findstr IPv4') do (
    echo 局域网访问: http://%%a:5173
)

echo.
echo =====================================
echo.
echo [3/3] 启动服务器...
echo.
echo 按 Ctrl+C 停止服务器
echo.
echo =====================================
echo.

call npm run dev
