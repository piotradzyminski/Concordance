@echo off
setlocal

set "SCRIPT=%~dp0make_future_backup_zip.ps1"
set "SOURCE=%~1"

if "%SOURCE%"=="" set "SOURCE=%CD%"

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT%" -Source "%SOURCE%"
if errorlevel 1 (
  echo.
  echo Runtime backup ZIP creation failed.
  pause
  exit /b 1
)

echo.
echo Future Noir runtime backup created successfully.
pause
