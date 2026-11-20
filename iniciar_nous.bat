@echo off
title NOUS - Motor Neuro-Simbolico de Humanizacion
echo =======================================================
echo Iniciando NOUS Desktop (Motor Neuro-Simbolico Pre-2022)
echo =======================================================

:: Comprobar y levantar Ollama local si no esta corriendo
curl -s http://localhost:11434/api/tags >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [OLLAMA] Levantando servicio Ollama en segundo plano...
    start /b "" "%LOCALAPPDATA%\Programs\Ollama\ollama.exe" serve
    timeout /t 3 /nobreak >nul
) else (
    echo [OLLAMA] Servicio local activo en http://localhost:11434
)

echo [ELECTRON] Iniciando aplicacion de escritorio...
cd desktop-app
call npm run electron:start
