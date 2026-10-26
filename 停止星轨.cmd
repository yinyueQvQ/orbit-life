@echo off
cd /d "%~dp0"
node local\launcher.mjs --stop
if errorlevel 1 pause
