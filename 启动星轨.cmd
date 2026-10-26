@echo off
cd /d "%~dp0"
node local\launcher.mjs
if errorlevel 1 pause
