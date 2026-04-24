@echo off
echo Starting KINETIX Backend...
cd backend
start cmd /k "npm run dev"
echo Starting KINETIX Frontend...
cd ..\frontend
start cmd /k "npm start"
echo KINETIX is starting up...
echo Backend: http://localhost:5000
echo Frontend: http://localhost:3000
