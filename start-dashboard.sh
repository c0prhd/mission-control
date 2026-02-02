#!/bin/bash
# Mission Control Dashboard Startup Script
cd ~/.clawdbot/dashboard

# Kill any existing vite processes
pkill -f 'vite.*clawdbot' 2>/dev/null

# Start with explicit host binding for Tailscale access
nohup npx vite --host 0.0.0.0 --port 3000 > dashboard.log 2>&1 &
echo $! > dashboard.pid
echo "Dashboard started on http://0.0.0.0:3000 (PID $!)"
echo "Tailscale: http://100.114.127.115:3000"
