#!/usr/bin/env bash
set -euo pipefail

cleanup() {
  if [[ -n "${BACKEND_PID:-}" ]]; then
    kill "$BACKEND_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT INT TERM

if ! command -v python3 >/dev/null 2>&1; then
  echo "Python 3 is required. Install Python 3.11+ and try again."
  exit 1
fi

if [[ ! -d ".venv" ]]; then
  echo "Creating Python virtual environment..."
  python3 -m venv .venv
fi

source .venv/bin/activate
python -m pip install -q -r backend/requirements.txt

python -m uvicorn backend.live_app:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!

echo "VentusGPT Python backend: http://localhost:8000"
echo "Ventus Live WebSocket: ws://localhost:8000/api/live/ws"
echo "VentusGPT frontend: http://localhost:5173"

npm run dev:frontend
