@echo off
REM =====================================================================
REM  Email Builder launcher
REM  Double-click this file to start the local server and open the app.
REM  Leave the terminal window open while you're using the tool.
REM  Close the window to stop the server.
REM =====================================================================

setlocal
cd /d "%~dp0"

set PORT=8080
set URL=http://127.0.0.1:%PORT%/

REM Open the browser after a ~2s delay so the server has time to bind.
REM Runs in a hidden background cmd so the server window stays clean.
start /b "" cmd /c "timeout /t 2 /nobreak >nul 2>&1 & start %URL%"

REM --- Prefer Python: always-available, no download, fast to boot ---
where python >nul 2>&1
if %ERRORLEVEL%==0 (
    echo.
    echo  Email Builder running at %URL%
    echo  Leave this window open while using the tool.
    echo  Close this window to stop the server.
    echo.
    python -m http.server %PORT% --bind 127.0.0.1
    goto :eof
)

REM --- Fallback: npx serve (first run downloads ~1MB of dependencies) ---
where npx >nul 2>&1
if %ERRORLEVEL%==0 (
    echo.
    echo  Python not found. Falling back to 'npx serve'.
    echo  Email Builder running at %URL%
    echo  Leave this window open while using the tool.
    echo  Close this window to stop the server.
    echo.
    npx --yes serve . -l tcp://127.0.0.1:%PORT%
    goto :eof
)

REM --- Neither Python nor Node found ---
echo.
echo  ERROR: Neither Python nor Node (npx) was found on your PATH.
echo.
echo  Install one of these to use this launcher:
echo    Python:  https://www.python.org/downloads/
echo    Node:    https://nodejs.org/
echo.
pause
