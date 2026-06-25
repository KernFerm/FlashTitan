@echo off
setlocal
cd /d "%~dp0"

:menu
cls
echo ==========================================
echo           FlashTitan Protected Build
echo ==========================================
echo.
echo   1. Prepare protected stage
echo   2. Pack protected app
echo   3. Build protected installer
echo   4. Exit
echo.
set /p choice=Choose an option [1-4]: 

if "%choice%"=="1" goto prepare
if "%choice%"=="2" goto pack
if "%choice%"=="3" goto dist
if "%choice%"=="4" goto done

echo.
echo Invalid choice. Please pick 1, 2, 3, or 4.
pause
goto menu

:prepare
cls
echo Running: npm run prepare:protected
echo.
call npm run prepare:protected
if errorlevel 1 (
echo.
echo prepare:protected failed.
) else (
echo.
echo prepare:protected finished successfully.
)
echo.
pause
goto menu

:pack
cls
echo Running: npm run pack:protected
echo.
call npm run pack:protected
if errorlevel 1 (
echo.
echo pack:protected failed.
) else (
echo.
echo pack:protected finished successfully.
)
echo.
pause
goto menu

:dist
cls
echo Running: npm run dist:protected
echo.
call npm run dist:protected
if errorlevel 1 (
echo.
echo dist:protected failed.
) else (
echo.
echo dist:protected finished successfully.
)
echo.
pause
goto menu

:done
endlocal
exit /b 0
