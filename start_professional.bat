@echo off
:: ===================================================================
:: MPP to XML Converter - Professional Edition Launcher
:: ===================================================================
:: 
:: Launcher script for Windows with professional error handling
:: and system checks
::
:: Version: 1.0.0
:: Author: Development Team
:: ===================================================================

title MPP to XML Converter - Professional Edition

:: Set colors
color 0A

:: Display professional header
echo.
echo =====================================================
echo    MPP TO XML CONVERTER - PROFESSIONAL EDITION
echo =====================================================
echo    Version: 1.0.0
echo    Status:  Production Ready
echo    Support: suporte@conversormpp.com
echo =====================================================
echo.

:: Check if Python is installed
echo [INFO] Checking system requirements...
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python not found in PATH
    echo [SOLUTION] Please install Python 3.8+ from https://python.org
    echo [SOLUTION] Make sure to check "Add Python to PATH" during installation
    pause
    exit /b 1
)

:: Get Python version
for /f "tokens=2" %%i in ('python --version') do set PYTHON_VERSION=%%i
echo [OK] Python %PYTHON_VERSION% detected

:: Check if required directories exist
echo [INFO] Checking directory structure...

if not exist "public" (
    echo [ERROR] Missing 'public' directory
    echo [SOLUTION] Make sure you're running from the project root
    pause
    exit /b 1
)

if not exist "config" (
    echo [INFO] Creating config directory...
    mkdir config
)

if not exist "temp_downloads" (
    echo [INFO] Creating temp_downloads directory...
    mkdir temp_downloads
)

if not exist "logs" (
    echo [INFO] Creating logs directory...
    mkdir logs
)

echo [OK] Directory structure verified

:: Create virtual environment if it doesn't exist
if not exist "venv" (
    echo [INFO] Creating virtual environment...
    python -m venv venv
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to create virtual environment
        echo [SOLUTION] Try running as administrator
        pause
        exit /b 1
    )
    echo [OK] Virtual environment created
)

:: Activate virtual environment
echo [INFO] Activating virtual environment...
call venv\Scripts\activate.bat
if %errorlevel% neq 0 (
    echo [WARNING] Could not activate virtual environment
    echo [INFO] Continuing with system Python...
)

:: Install/upgrade dependencies
echo [INFO] Checking dependencies...
if exist "requirements.txt" (
    echo [INFO] Installing/updating Python packages...
    pip install -r requirements.txt --quiet --upgrade
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to install dependencies
        echo [SOLUTION] Check your internet connection
        echo [SOLUTION] Try running: pip install -r requirements.txt
        pause
        exit /b 1
    )
    echo [OK] Dependencies installed successfully
) else (
    echo [WARNING] requirements.txt not found, skipping dependency check
)

:: Check for server file
if not exist "server_professional.py" (
    if exist "mini_server.py" (
        echo [INFO] Using mini_server.py as fallback
        set SERVER_FILE=mini_server.py
    ) else (
        echo [ERROR] No server file found
        echo [SOLUTION] Make sure server_professional.py exists
        pause
        exit /b 1
    )
) else (
    set SERVER_FILE=server_professional.py
)

:: Check if port is available
echo [INFO] Checking port availability...
netstat -an | find "8082" | find "LISTENING" >nul
if %errorlevel% equ 0 (
    echo [WARNING] Port 8082 is already in use
    echo [INFO] Attempting to kill existing processes...
    taskkill /f /im python.exe >nul 2>&1
    timeout /t 2 /nobreak >nul
)

:: Start the server
echo.
echo =====================================================
echo               STARTING SERVER
echo =====================================================
echo.
echo [INFO] Server file: %SERVER_FILE%
echo [INFO] Port: 8082
echo [INFO] Access URL: http://localhost:8082
echo [INFO] Network URL: http://%COMPUTERNAME%:8082
echo.
echo [CONTROLS]
echo   - Press Ctrl+C to stop the server
echo   - Press Ctrl+Break for force stop
echo.
echo =====================================================
echo.

:: Log startup
echo %date% %time% - Server started with %SERVER_FILE% >> logs\startup.log

:: Start the Python server with error handling
python %SERVER_FILE%
set EXIT_CODE=%errorlevel%

:: Handle server exit
echo.
echo =====================================================
echo                SERVER STOPPED
echo =====================================================
echo.

if %EXIT_CODE% equ 0 (
    echo [INFO] Server shut down normally
    echo %date% %time% - Server stopped normally >> logs\startup.log
) else (
    echo [ERROR] Server stopped with error code: %EXIT_CODE%
    echo %date% %time% - Server stopped with error %EXIT_CODE% >> logs\startup.log
    echo.
    echo [TROUBLESHOOTING]
    echo 1. Check logs\server.log for detailed error information
    echo 2. Make sure no other application is using port 8082
    echo 3. Verify all files are present and permissions are correct
    echo 4. Try running as administrator
    echo.
)

:: Cleanup
if exist "venv\Scripts\deactivate.bat" (
    call venv\Scripts\deactivate.bat
)

echo.
echo Press any key to exit...
pause >nul