@echo off
title NOUS - Motor Neuro-Simbolico de Humanizacion
echo =======================================================
echo Iniciando NOUS Desktop (Motor Neuro-Simbolico Pre-2022)
echo =======================================================

:: Si existe GEMINI_API_KEY en .env, Google AI Studio es el motor primario (no es necesario arrancar Ollama)
findstr /B /I "GEMINI_API_KEY=" ".env" >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [AI STUDIO] Clave GEMINI_API_KEY detectada en .env ^(Gemma 4 26B MoE + 10 reintentos + cascada activa^)
) else (
    curl -s http://localhost:11434/api/tags >nul 2>&1
    if %ERRORLEVEL% NEQ 0 (
        if exist "%LOCALAPPDATA%\Programs\Ollama\ollama.exe" (
            echo [OLLAMA] Levantando servicio Ollama en segundo plano...
            start /b "" "%LOCALAPPDATA%\Programs\Ollama\ollama.exe" serve
            timeout /t 3 /nobreak >nul
        ) else (
            echo [AVISO] No se encontro GEMINI_API_KEY en .env ni Ollama instalado localmente.
        )
    ) else (
        echo [OLLAMA] Servicio local activo en http://localhost:11434
    )
)

echo [ELECTRON] Iniciando aplicacion de escritorio...
cd desktop-app
call npm run electron:start
