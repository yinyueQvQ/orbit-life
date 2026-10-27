@echo off
cd /d "%~dp0"
if exist "runtime\node.exe" ("runtime\node.exe" local\launcher.mjs) else (node local\launcher.mjs)
if errorlevel 1 pause
