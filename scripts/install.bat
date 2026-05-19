@echo off
REM ============================================================
REM Horus System - double-click installer
REM Launches the PowerShell setup script with Admin privileges.
REM ============================================================
title Horus System - Setup

echo.
echo  ============================================
echo    Horus System - Windows Setup
echo  ============================================
echo.
echo  This will:
echo    1. Install Git, Node.js, VS Build Tools (if missing)
echo    2. Download Horus to C:\horus
echo    3. Install dependencies
echo    4. Launch the app
echo.
echo  First run takes ~20 minutes.
echo.
pause

REM Check for admin; re-launch elevated if not
net session >nul 2>&1
if %errorLevel% neq 0 (
  echo Requesting Administrator privileges...
  powershell -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
  exit /b
)

REM Run the PowerShell setup script
powershell -NoProfile -ExecutionPolicy Bypass -Command "iex ((New-Object System.Net.WebClient).DownloadString('https://raw.githubusercontent.com/Alaa2134/alsaka/claude/systemalaa-desktop-app-YK5q1/scripts/setup-windows.ps1'))"

echo.
echo  Setup finished. Press any key to exit.
pause >nul
