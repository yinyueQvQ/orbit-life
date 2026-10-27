@echo off
cd /d "%~dp0"
if exist "runtime\node.exe" ("runtime\node.exe" local\configure-ai.mjs) else (node local\configure-ai.mjs)
pause
