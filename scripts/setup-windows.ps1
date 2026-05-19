# ============================================================================
# Horus System — One-shot Windows setup script
# ----------------------------------------------------------------------------
# What it does:
#   1. Verifies admin privileges
#   2. Installs Git, Node.js LTS, and Visual Studio Build Tools if missing
#   3. Clones the repo into C:\horus (English path — avoids node-gyp issues
#      with non-ASCII paths)
#   4. Runs `npm install` inside desktop/
#   5. Launches the app
#
# Usage (in PowerShell as Administrator):
#   Set-ExecutionPolicy Bypass -Scope Process -Force
#   .\setup-windows.ps1
#
# Or one-liner from anywhere:
#   iex (irm https://raw.githubusercontent.com/Alaa2134/alsaka/claude/systemalaa-desktop-app-YK5q1/scripts/setup-windows.ps1)
# ============================================================================

#Requires -Version 5.1

$ErrorActionPreference = 'Stop'
$ProgressPreference    = 'SilentlyContinue'

$REPO_URL    = 'https://github.com/Alaa2134/alsaka.git'
$REPO_BRANCH = 'claude/systemalaa-desktop-app-YK5q1'
$TARGET_DIR  = 'C:\horus'

function Write-Step  { param($m) Write-Host "`n==> $m" -ForegroundColor Cyan }
function Write-Ok    { param($m) Write-Host "    OK $m"  -ForegroundColor Green }
function Write-Warn  { param($m) Write-Host "    !  $m"  -ForegroundColor Yellow }
function Write-Fail  { param($m) Write-Host "    X  $m"  -ForegroundColor Red }

function Require-Admin {
  $isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] 'Administrator')
  if (-not $isAdmin) {
    Write-Fail 'لازم تشغّل PowerShell كـ Administrator.'
    Write-Host '   - افتح Start Menu → ابحث عن "PowerShell"' -ForegroundColor Yellow
    Write-Host '   - يمين كليك → "Run as administrator"' -ForegroundColor Yellow
    Write-Host '   - ألصق السكريبت تاني' -ForegroundColor Yellow
    exit 1
  }
}

function Refresh-Path {
  $env:Path = [System.Environment]::GetEnvironmentVariable('Path','Machine') + ';' + `
              [System.Environment]::GetEnvironmentVariable('Path','User')
}

function Has-Command { param($name) [bool](Get-Command $name -ErrorAction SilentlyContinue) }

function Ensure-Winget {
  if (-not (Has-Command winget)) {
    Write-Fail 'winget مش موجود. حدّث ويندوز 10/11 أو نزّل App Installer من مايكروسوفت ستور.'
    Write-Host '   https://apps.microsoft.com/detail/9NBLGGH4NNS1' -ForegroundColor Yellow
    exit 1
  }
}

function Ensure-Git {
  if (Has-Command git) { Write-Ok "Git موجود ($((git --version) -replace 'git version ',''))"; return }
  Write-Step 'تثبيت Git'
  winget install --id Git.Git -e --source winget --silent --accept-package-agreements --accept-source-agreements | Out-Null
  Refresh-Path
  if (-not (Has-Command git)) { Write-Fail 'فشل تثبيت Git.'; exit 1 }
  Write-Ok 'تم تثبيت Git'
}

function Ensure-Node {
  if (Has-Command node) {
    $v = (node --version)
    $major = [int]($v -replace '[^0-9.].*','' -replace '^v','' -split '\.' | Select-Object -First 1)
    if ($major -ge 18) { Write-Ok "Node.js موجود ($v)"; return }
    Write-Warn "Node.js قديم ($v) — يحتاج 18+"
  }
  Write-Step 'تثبيت Node.js LTS'
  winget install OpenJS.NodeJS.LTS --silent --accept-package-agreements --accept-source-agreements | Out-Null
  Refresh-Path
  if (-not (Has-Command node)) { Write-Fail 'فشل تثبيت Node.js.'; exit 1 }
  Write-Ok "تم تثبيت Node.js ($(node --version))"
}

function Ensure-BuildTools {
  # better-sqlite3 needs MSVC. Detect cl.exe in any of the typical VS install
  # paths — `where.exe cl` may fail if VS env vars weren't loaded.
  $vsPaths = @(
    'C:\Program Files\Microsoft Visual Studio\2022\BuildTools\VC\Tools\MSVC',
    'C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\VC\Tools\MSVC',
    'C:\Program Files\Microsoft Visual Studio\2022\Community\VC\Tools\MSVC',
    'C:\Program Files (x86)\Microsoft Visual Studio\2022\Community\VC\Tools\MSVC',
    'C:\Program Files\Microsoft Visual Studio\2019\BuildTools\VC\Tools\MSVC',
    'C:\Program Files (x86)\Microsoft Visual Studio\2019\BuildTools\VC\Tools\MSVC'
  )
  foreach ($p in $vsPaths) {
    if (Test-Path $p) { Write-Ok "Visual Studio Build Tools موجود"; return }
  }

  Write-Step 'تثبيت Visual Studio Build Tools (~3-5GB, 10-15 دقيقة)'
  Write-Warn 'دي أكبر خطوة — متقفلش النافذة.'
  winget install Microsoft.VisualStudio.2022.BuildTools `
    --silent `
    --accept-package-agreements `
    --accept-source-agreements `
    --override "--wait --quiet --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended" | Out-Null
  Refresh-Path
  Write-Ok 'تم تثبيت Build Tools'
}

function Clone-Repo {
  Write-Step "جلب المشروع إلى $TARGET_DIR"
  if (Test-Path $TARGET_DIR) {
    Write-Warn "$TARGET_DIR موجود — مسحه..."
    Remove-Item -Recurse -Force $TARGET_DIR
  }
  git clone --branch $REPO_BRANCH --single-branch $REPO_URL $TARGET_DIR
  if (-not (Test-Path "$TARGET_DIR\desktop\package.json")) {
    Write-Fail "فشل تحميل المشروع — desktop\package.json مش موجود."
    exit 1
  }
  Write-Ok "تم التحميل في $TARGET_DIR"
}

function Install-Deps {
  Write-Step 'تثبيت تبعيات desktop (5-10 دقائق — بيبني better-sqlite3)'
  Set-Location "$TARGET_DIR\desktop"
  Remove-Item -Recurse -Force node_modules         -ErrorAction SilentlyContinue
  Remove-Item -Force      package-lock.json        -ErrorAction SilentlyContinue
  npm install
  if ($LASTEXITCODE -ne 0) {
    Write-Fail 'npm install فشل. شوف الـ output فوق.'
    Write-Warn 'جرّب يدويًا:  cd C:\horus\desktop ; npm install --verbose'
    exit 1
  }
  Write-Ok 'تم تثبيت كل التبعيات'
}

function Create-Shortcut {
  $shortcut = "$env:USERPROFILE\Desktop\Horus System.lnk"
  $WshShell = New-Object -ComObject WScript.Shell
  $sc = $WshShell.CreateShortcut($shortcut)
  $sc.TargetPath = 'powershell.exe'
  $sc.Arguments  = "-NoExit -Command `"cd '$TARGET_DIR\desktop'; npm run dev:electron`""
  $sc.WorkingDirectory = "$TARGET_DIR\desktop"
  $sc.IconLocation = 'powershell.exe,0'
  $sc.Description  = 'Horus System — اضغط مرتين للتشغيل'
  $sc.Save()
  Write-Ok "اختصار التشغيل على سطح المكتب: Horus System"
}

function Launch-App {
  Write-Step 'تشغيل التطبيق'
  Set-Location "$TARGET_DIR\desktop"
  Write-Host ''
  Write-Host '   ================================================' -ForegroundColor Green
  Write-Host '   🎉  Horus System جاهز' -ForegroundColor Green
  Write-Host '   ================================================' -ForegroundColor Green
  Write-Host "   تسجيل الدخول الأول:" -ForegroundColor White
  Write-Host "     Email:    admin@systemalaa.app" -ForegroundColor White
  Write-Host "     Password: admin" -ForegroundColor White
  Write-Host '   ================================================' -ForegroundColor Green
  Write-Host ''
  Start-Sleep -Seconds 2
  npm run dev:electron
}

# ─────────────── Main flow ───────────────
Write-Host ''
Write-Host '╔══════════════════════════════════════════╗' -ForegroundColor Magenta
Write-Host '║       Horus System — Setup Script        ║' -ForegroundColor Magenta
Write-Host '╚══════════════════════════════════════════╝' -ForegroundColor Magenta

Require-Admin
Ensure-Winget
Ensure-Git
Ensure-Node
Ensure-BuildTools
Clone-Repo
Install-Deps
Create-Shortcut
Launch-App
