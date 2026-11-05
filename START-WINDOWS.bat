@echo off
setlocal
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is not installed.
  echo Install the current LTS version from https://nodejs.org/ then run this file again.
  echo.
  pause
  exit /b 1
)

node -e "const [major,minor]=process.versions.node.split('.').map(Number); if(major<18||(major===18&&minor<17)){console.error('Karlun Learn needs Node.js 18.17 or newer.');process.exit(1)}"
if errorlevel 1 (
  echo Please update Node.js from https://nodejs.org/ and try again.
  echo.
  pause
  exit /b 1
)

for /f "tokens=*" %%v in ('node -v') do echo Using Node.js %%v
start "Karlun Learn opener" cmd /c "ping 127.0.0.1 -n 2 >nul & start http://localhost:4173"
call npm run dev
if errorlevel 1 (
  echo.
  echo Karlun Learn could not start. Check the message above.
  pause
)
endlocal
