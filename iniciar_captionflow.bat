@echo off
title CaptionFlow
echo Iniciando CaptionFlow...
echo La aplicacion estara disponible en http://localhost:5174 en unos segundos.
cd /d "%~dp0"
npm run dev
pause
