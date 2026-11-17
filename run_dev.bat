@echo off
title Reconstruct3D Development Runner
echo ========================================================
echo Starting Reconstruct3D in Development Mode
echo ========================================================
echo.

echo 1. Starting FastAPI Backend on http://127.0.0.1:8000 ...
start "Reconstruct3D Backend" cmd /k ".\.venv\Scripts\python.exe -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload"

echo 2. Starting Vite Frontend Dev Server on http://localhost:5173 ...
cd frontend
start "Reconstruct3D Vite Frontend" cmd /k "npm run dev"

echo.
echo Both servers launched!
echo Open your browser at http://localhost:5173 (or http://127.0.0.1:8000)
echo.
