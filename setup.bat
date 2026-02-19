@echo off
REM ProvaNota - Quick Start Script (Windows)
REM Sets up local development environment

echo ================================
echo ProvaNota - Quick Start Setup
echo ================================
echo.

REM Check Python
echo Checking prerequisites...
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Error: Python not found. Please install Python 3.11+
    pause
    exit /b 1
)

REM Check Node.js
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Error: Node.js not found. Please install Node.js 16+
    pause
    exit /b 1
)

REM Check Yarn
yarn --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Installing Yarn...
    npm install -g yarn
)

echo All prerequisites found
echo.

REM Setup backend
echo Setting up Backend...
cd backend

if not exist "venv" (
    echo Creating virtual environment...
    python -m venv venv
)

echo Activating virtual environment...
call venv\Scripts\activate.bat

echo Installing dependencies...
pip install -q -r requirements.txt

if not exist ".env" (
    echo Creating .env file...
    copy .env.example .env
    echo Please edit backend\.env with your MongoDB URL
)

echo Backend setup complete
echo.

REM Setup frontend
echo Setting up Frontend...
cd ..\frontend

echo Installing dependencies...
yarn install

if not exist ".env" (
    echo Creating .env file...
    copy .env.example .env
)

echo Frontend setup complete
echo.

REM Instructions
echo ================================
echo Setup Complete!
echo ================================
echo.
echo Next steps:
echo.
echo 1. Configure MongoDB:
echo    Edit backend\.env and set MONGO_URL
echo.
echo 2. Seed database:
echo    cd backend
echo    venv\Scripts\activate.bat
echo    python seed_data.py
echo.
echo 3. Start backend (Terminal 1):
echo    cd backend
echo    venv\Scripts\activate.bat
echo    uvicorn server:app --host 0.0.0.0 --port 8001 --reload
echo.
echo 4. Start frontend (Terminal 2):
echo    cd frontend
echo    yarn start
echo.
echo 5. Open browser:
echo    http://localhost:3000
echo.
echo Test credentials:
echo    Admin: admin@provanota.com / admin123
echo    Student: estudante@provanota.com / estudante123
echo.
echo ================================
pause