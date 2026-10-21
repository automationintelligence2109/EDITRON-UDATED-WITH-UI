@echo off
title Editron + Hyperframes Master Launcher

echo 🚀 Starting All Services...

:: Start Whisper AI Service
echo [1/3] Starting Whisper AI Service...
start cmd /k "cd mini-services/whisper-service && venv\Scripts\activate && python app.py"

:: Start Next.js Frontend
echo [2/3] Starting Frontend UI...
start cmd /k "npm run dev"

:: Open the project folder
echo [3/3] Opening project workspace...
explorer .

echo.
echo ✅ ALL SYSTEMS ARE GO!
echo.
echo 🌐 Frontend: http://localhost:3000
echo 🎙️ AI Service: http://localhost:5001
echo.
pause
