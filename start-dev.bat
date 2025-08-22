@echo off
echo Starting AI Blog Automation Development Environment...

echo.
echo Starting Backend Server...
cd backend
start "Backend Server" cmd /k "python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"

echo.
echo Starting Frontend Development Server...
cd ../frontend
start "Frontend Server" cmd /k "npm run dev"

echo.
echo Development servers starting...
echo Backend: http://localhost:8000
echo Frontend: http://localhost:5173
echo API Docs: http://localhost:8000/docs
echo.
pause
