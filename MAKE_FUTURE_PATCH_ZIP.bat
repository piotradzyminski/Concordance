@echo off
setlocal

set "SCRIPT=%~dp0make_future_patch_zip.ps1"
set "SOURCE=%~1"

if "%SOURCE%"=="" set "SOURCE=%CD%"

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT%" -Source "%SOURCE%"
if errorlevel 1 (
  echo.
  echo ZIP creation failed.
  pause
  exit /b 1
)

echo.
echo Slim patch-input ZIP created successfully.
pause
