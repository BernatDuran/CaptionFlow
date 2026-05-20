@echo off
setlocal
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\start-captionflow.ps1"
echo.
echo CaptionFlow se ha cerrado. Pulsa una tecla para salir.
pause >nul
