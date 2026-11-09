@echo off
rem Glowup installer for Windows. Double-click it: it puts /glowup into your Claude Code commands folder.
rem It runs the same install.ps1 as the one-line command on the site.
echo Installing Glowup...
echo.
powershell -NoProfile -ExecutionPolicy Bypass -Command "irm https://raw.githubusercontent.com/drewguitarist18-lang/glowup/main/install.ps1 | iex"
if errorlevel 1 (
  echo.
  echo Something went wrong. Check your internet connection and try again.
)
echo.
pause
