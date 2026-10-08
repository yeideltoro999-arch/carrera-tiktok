@echo off
title CARRERA TIKTOK - CONTROL
cd /d "%~dp0"
where py >nul 2>&1
if %errorlevel%==0 (
  py -3 server.py
  goto :end
)
where python >nul 2>&1
if %errorlevel%==0 (
  python server.py
  goto :end
)
where node >nul 2>&1
if %errorlevel%==0 (
  node server.js
  goto :end
)
echo.
echo NO ENCONTRE PYTHON NI NODE EN ESTE PC.
echo Instala Python 3 o Node.js y vuelve a abrir este archivo.
echo.
pause
:end
