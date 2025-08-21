@echo off
echo Starting AI Blog Automation...
echo.

echo Starting Backend (FastAPI)...
start "Backend" cmd /k "cd backend && pip install -r requirements.txt && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"

echo Waiting for backend to start...
timeout /t 5 /nobreak >nul

echo Starting Frontend (React)...
start "Frontend" cmd /k "cd frontend && npm install && npm run dev"

echo.
echo Both services are starting...
echo Backend will be available at: http://localhost:8000
echo Frontend will be available at: http://localhost:5173
echo.
echo Press any key to exit this launcher...
pause >nul
