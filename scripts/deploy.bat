@echo off
setlocal enabledelayedexpansion

REM Check arguments
if "%1"=="" (
    echo Usage: %0 ^<branch^>
    exit /b 1
)

set BRANCH=%1
set WORKSPACE_DIR=.

REM Enter workspace directory
cd /d "%WORKSPACE_DIR%" || exit /b 1

echo Start deploying branch: %BRANCH%

REM Pull latest code
echo Pulling latest code...
git fetch origin
git checkout "%BRANCH%"
git pull origin "%BRANCH%"

REM Install dependencies
echo Installing dependencies...
if exist "yarn.lock" (
    call yarn install
) else if exist "package-lock.json" (
    call npm ci
) else (
    call npm install
)

REM Build project (if needed)
if exist "package.json" (
    findstr /C:"\"build\"" package.json >nul
    if not errorlevel 1 (
        echo Building project...
        call npm run build
    )
)

echo Deployment completed! 