@echo off
title Reconstruct3D Photogrammetry Studio
echo ========================================================
echo Starting Reconstruct3D (FastAPI Backend + React Frontend)
echo ========================================================
echo.

if not exist .venv (
    echo Error: .venv virtual environment not found.
    pause
    exit /b 1
)

echo Activating Python environment...
call .\.venv\Scripts\activate.bat

echo Checking COLMAP binary...
if exist tools\colmap\COLMAP.bat (
    echo [OK] COLMAP 4.2.1 detected in tools\colmap\COLMAP.bat
) else (
    echo [WARNING] COLMAP.bat not found in tools\colmap. System will fallback to PATH.
)

echo.
echo Launching Application on http://127.0.0.1:8000 ...
echo Press Ctrl+C to stop the server.
echo.

.\.venv\Scripts\python.exe -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
pause
