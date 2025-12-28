@echo off
echo ==========================================
echo      Deploying Talent Tracker Rules
echo ==========================================
echo.
echo NOTE: If this is your first time, it might ask you to log in.
echo.

call npx firebase-tools deploy --only firestore:rules

echo.
echo ==========================================
if %ERRORLEVEL% EQU 0 (
    echo    DEPLOYMENT SUCCESSFUL!
) else (
    echo    DEPLOYMENT FAILED.
)
echo ==========================================
pause
