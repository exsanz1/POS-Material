@echo off
title POS Toko Material & Bangunan
cd /d "%~dp0"

echo =======================================================
echo   MENYALAKAN POS TOKO MATERIAL & BANGUNAN
echo =======================================================
echo.

:: Periksa ketersediaan virtual environment lokal
if exist "%~dp0venv\Scripts\python.exe" (
    set "PYTHON_EXEC=%~dp0venv\Scripts\python.exe"
) else (
    set "PYTHON_EXEC=python"
)

:: Buka browser secara otomatis setelah jeda singkat 2 detik
start "" cmd /c "timeout /t 2 /nobreak >nul && start http://127.0.0.1:8000"

echo Menjalankan backend server di http://127.0.0.1:8000 ...
echo Halaman web akan terbuka otomatis di browser Anda.
echo.
echo Tekan tombol [Ctrl + C] di jendela ini jika ingin mematikan server.
echo =======================================================
echo.

"%PYTHON_EXEC%" run_app.py

if %ERRORLEVEL% neq 0 (
    echo.
    echo [ERROR] Terjadi kendala saat menjalankan server.
    pause
)
