#!/bin/bash
# Restart the Get It dev server (browser mode)
# Usage: ./restart.sh [port]

PORT="${1:-3000}"
PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "=== Get It Dev Server Restart ==="

# Stop existing server
PID=$(lsof -ti ":$PORT" -sTCP:LISTEN 2>/dev/null)
if [ -n "$PID" ]; then
  echo "Stopping server on port $PORT (PID: $PID)..."
  kill "$PID" 2>/dev/null
  sleep 2
  if kill -0 "$PID" 2>/dev/null; then
    kill -9 "$PID" 2>/dev/null
  fi
  echo "Stopped."
else
  echo "No server running on port $PORT."
fi

# Wait for port to be free
for i in $(seq 1 10); do
  if ! lsof -ti ":$PORT" -sTCP:LISTEN >/dev/null 2>&1; then
    break
  fi
  sleep 0.5
done

# Clean .next cache
if [ -d "$PROJECT_DIR/.next" ]; then
  echo "Cleaning .next cache..."
  rm -rf "$PROJECT_DIR/.next"
fi

# Start server
echo "Starting dev server on port $PORT..."

LOG_DIR="$PROJECT_DIR/logs"
mkdir -p "$LOG_DIR"
LOG_FILE="$LOG_DIR/dev.log"

# Clear log file on restart
: > "$LOG_FILE"

cd "$PROJECT_DIR" || exit 1
npm run browser:dev >> "$LOG_FILE" 2>&1 &
SERVER_PID=$!

# Wait for it to be ready
for i in $(seq 1 30); do
  if lsof -ti ":$PORT" -sTCP:LISTEN >/dev/null 2>&1; then
    echo ""
    echo "✅ Get It is ready at http://localhost:$PORT"
    open "http://localhost:$PORT"
    exit 0
  fi
  sleep 1
done

echo "⚠️  Server started but may not be ready yet. Check http://localhost:$PORT"
