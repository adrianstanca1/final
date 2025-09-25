#!/bin/bash

# Start Python service in background
echo "Starting Python MM service..."
source .venv/bin/activate
cd mm_service
uvicorn main:app --reload --port 8010 &
MM_PID=$!
cd ..
deactivate

# Start backend service
echo "Starting backend services..."
node dist-services/services/index.js &
BACKEND_PID=$!

# Start frontend
echo "Starting frontend..."
npx vite preview &
FRONTEND_PID=$!

# Handle cleanup on exit
function cleanup {
  echo "Shutting down services..."
  kill $MM_PID 2>/dev/null
  kill $BACKEND_PID 2>/dev/null
  kill $FRONTEND_PID 2>/dev/null
  exit 0
}

trap cleanup SIGINT SIGTERM

# Wait for user input
echo "Multimodal system running. Press Ctrl+C to stop."
wait
