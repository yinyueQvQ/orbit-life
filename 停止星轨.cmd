@echo off
cd /d "%~dp0"
if exist "runtime\node.exe" ("runtime\node.exe" local\launcher.mjs --stop) else (node local\launcher.mjs --stop)
if errorlevel 1 pause
