@echo off
echo =======================================================
echo    NOUS IMAGE ENGINE - PYINSTALLER BUILDER
echo =======================================================
echo This script will compile the Python Image Node into a standalone .exe
echo (This usually takes 5-15 minutes depending on CPU)

cd /d "C:\Users\Simon Sandrea\Documents\Respaldo 2026\Documents\prueba2\nous-local-image-node"

echo.
echo [*] Installing PyInstaller...
pip install pyinstaller

echo.
echo [*] Bundling ecosystem (Llama.cpp, PyTorch, Diffusers, WebSockets)...
pyinstaller --onefile --name nous-ai-core-x86_64-pc-windows-msvc ^
    --hidden-import="torch" ^
    --hidden-import="piexif" ^
    --hidden-import="accelerate" ^
    --hidden-import="transformers" ^
    --hidden-import="safetensors" ^
    --hidden-import="websockets" ^
    --hidden-import="llama_cpp" ^
    --hidden-import="huggingface_hub" ^
    server.py

echo.
echo [*] Build Complete! Moving binary to Tauri's folder...
mkdir "..\nous_2.0\src-tauri\binaries" 2>nul
copy /Y "dist\nous-ai-core-x86_64-pc-windows-msvc.exe" "..\nous_2.0\src-tauri\binaries\"

echo =======================================================
echo   DONE! You can now run: npm run tauri build
echo =======================================================
pause
