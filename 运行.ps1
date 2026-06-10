# 中旅会展案例库启动器.ps1

$ErrorActionPreference = "Continue"
$projectDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $projectDir

Write-Host "======================================"
Write-Host "   中旅会展案例库管理系统 启动器"
Write-Host "======================================"
Write-Host ""

# 检查node_modules
if (-not (Test-Path "node_modules")) {
    Write-Host "[提示] 首次运行，正在安装依赖..."
}

# 查找包管理器
$pkgCmd = $null

# 尝试pnpm
$pnpm = Get-Command pnpm -ErrorAction SilentlyContinue
if ($pnpm) {
    $pkgCmd = "pnpm"
    Write-Host "[找到] pnpm: $($pnpm.Source)"
}

# 尝试npm
if (-not $pkgCmd) {
    $npm = Get-Command npm -ErrorAction SilentlyContinue
    if ($npm) {
        $pkgCmd = "npm"
        Write-Host "[找到] npm: $($npm.Source)"
    }
}

if (-not $pkgCmd) {
    Write-Host "[错误] 未找到Node.js包管理器！"
    Write-Host "请先安装 Node.js: https://nodejs.org/"
    Read-Host "按Enter键退出"
    exit 1
}

Write-Host "[就绪] 使用: $pkgCmd"
Write-Host ""
Write-Host "[启动] 正在启动开发服务器..."
Write-Host "[提示] 请访问: http://localhost:5173"
Write-Host ""

# 启动开发服务器
$serverJob = Start-Job -ScriptBlock {
    param($dir, $cmd)
    Set-Location $dir
    & $cmd dev
} -ArgumentList $projectDir, $pkgCmd

# 等待服务器启动
Write-Host "[等待] 服务器启动中..."
Start-Sleep -Seconds 7

# 打开浏览器
Start-Process "http://localhost:5173"

Write-Host ""
Write-Host "======================================"
Write-Host "  启动完成！"
Write-Host "  浏览器已自动打开"
Write-Host "======================================"
Write-Host ""

Start-Sleep -Seconds 2
