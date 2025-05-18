@echo off
echo ===================================================
echo         LogLite - Log Anomaly Detection
echo ===================================================
echo.

echo Checking environment...

REM Check for Python installation
where python >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Python not found in PATH. Please install Python and try again.
    goto :end
)

REM Check if the model files exist
if not exist "models\model.safetensors" (
    if not exist "..\log_anomaly_model\model.safetensors" (
        echo WARNING: Model file not found in expected locations.
        echo The application might not work correctly without the model.
        echo Please place the model.safetensors file in the models directory.
        echo.
        echo Press any key to continue anyway or Ctrl+C to abort.
        pause >nul
    ) else (
        echo Found model in parent directory.
    )
) else (
    echo Found model in models directory.
)

echo Starting LogLite application...
python run.py

:end
pause 