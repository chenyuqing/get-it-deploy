#!/bin/bash
# Stop the Get It dev server

PID=$(pgrep -f "next dev" | head -1 2>/dev/null)
if [ -n "$PID" ]; then
  echo "Stopping Get It dev server (PID: $PID)..."
  kill "$PID" 2>/dev/null
  sleep 1
  # Force kill if still running
  if kill -0 "$PID" 2>/dev/null; then
    kill -9 "$PID" 2>/dev/null
    echo "Force killed."
  else
    echo "Stopped."
  fi
else
  echo "Get It dev server is not running."
fi
