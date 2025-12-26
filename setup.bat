@echo off
REM Collaborative Workspace Backend - Windows Setup Script

echo ================================================
echo Collaborative Workspace Backend - Setup Script
echo ================================================
echo.

REM Check prerequisites
echo Checking prerequisites...

REM Check Docker
docker --version >nul 2>&1
if errorlevel 1 (
    echo [X] Docker is not installed. Please install Docker Desktop first.
    pause
    exit /b 1
)
echo [OK] Docker is installed

REM Check Docker Compose
docker-compose --version >nul 2>&1
if errorlevel 1 (
    echo [X] Docker Compose is not installed.
    pause
    exit /b 1
)
echo [OK] Docker Compose is installed

echo.

REM Setup environment
echo Setting up environment...

if not exist .env (
    if exist .env.example (
        copy .env.example .env >nul
        echo [OK] Created .env file from .env.example
        echo [!] Please update .env with your configuration before production use
    ) else (
        echo [X] .env.example file not found
        pause
        exit /b 1
    )
) else (
    echo [OK] .env file already exists
)

echo.

REM Pull Docker images
echo Pulling Docker images...
docker-compose pull

echo.

REM Start services
echo Starting services...
docker-compose up -d

echo.

REM Wait for services
echo Waiting for services to be ready...
timeout /t 10 /nobreak >nul

echo.

REM Check service health
echo Checking service health...

docker-compose ps | findstr "Up" >nul
if errorlevel 1 (
    echo [!] Some services may not be running properly
    echo     Check with: docker-compose ps
) else (
    echo [OK] Services are running
)

echo.

REM Display service URLs
echo Service URLs:
echo    API: http://localhost:3000
echo    API Docs: http://localhost:3000/api/docs
echo    WebSocket: ws://localhost:3001
echo.

REM Display useful commands
echo Useful commands:
echo    View logs: docker-compose logs -f
echo    Stop services: docker-compose down
echo    Restart services: docker-compose restart
echo.

REM Test API endpoint
echo Testing API endpoint...
curl -s http://localhost:3000/health >nul 2>&1
if errorlevel 1 (
    echo [!] Health check failed (API may still be starting)
    echo     Wait a minute and try: curl http://localhost:3000/health
) else (
    echo [OK] Health check successful
    curl -s http://localhost:3000/health
)

echo.
echo ================================================
echo Setup complete! Your backend is running!
echo ================================================
echo.
echo Next steps:
echo    1. Read QUICKSTART.md for a quick guide
echo    2. Visit http://localhost:3000/api/docs
echo    3. Follow API_TESTING.md for examples
echo.

pause
