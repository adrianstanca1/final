#!/bin/bash

# run-multimodal.sh
# Enhanced script for running the multimodal system with better error handling

set -e  # Exit immediately if any command fails

echo "🚀 Starting Multimodal System..."

# Setup directories
mkdir -p logs
mkdir -p dist/types

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Log files
FRONTEND_LOG="logs/frontend-$(date +%Y%m%d-%H%M%S).log"
BACKEND_LOG="logs/backend-$(date +%Y%m%d-%H%M%S).log"
PYTHON_LOG="logs/python-$(date +%Y%m%d-%H%M%S).log"

echo -e "${BLUE}🔧 Setting up integration environment...${NC}"
./scripts/multimodal-integration-fixed.sh

echo -e "${BLUE}🔍 Fixing ESM imports...${NC}"
node scripts/fix-esm-imports.js

# Function to handle Ctrl+C gracefully
function cleanup {
  echo -e "\n${YELLOW}⚠️  Shutting down services...${NC}"
  kill $FRONTEND_PID 2>/dev/null || true
  kill $BACKEND_PID 2>/dev/null || true
  kill $PYTHON_PID 2>/dev/null || true
  echo -e "${GREEN}✅ All services stopped.${NC}"
  exit 0
}

trap cleanup SIGINT SIGTERM

# Start Python service in background
echo -e "${BLUE}🐍 Starting Python service...${NC}"
if [ -d ".venv" ]; then
  source .venv/bin/activate 2>/dev/null || true
else
  echo -e "${YELLOW}⚠️  Python virtual environment not found, creating one...${NC}"
  python -m venv .venv
  source .venv/bin/activate
  pip install -r mm_service/requirements.txt
fi

(cd mm_service && python -m uvicorn main:app --reload --port 8010 > ../$PYTHON_LOG 2>&1) &
PYTHON_PID=$!
echo -e "${GREEN}✅ Python service started on port 8010 (PID: $PYTHON_PID)${NC}"
echo -e "   Logs: $PYTHON_LOG"

# Check if the Python service is running
sleep 2
if ! ps -p $PYTHON_PID > /dev/null; then
  echo -e "${RED}❌ Python service failed to start. Check $PYTHON_LOG for details.${NC}"
  tail -n 10 $PYTHON_LOG
else
  echo -e "${GREEN}✅ Python service is running correctly.${NC}"
fi

# Start frontend service
echo -e "${BLUE}🌐 Starting frontend service...${NC}"
npm run preview > $FRONTEND_LOG 2>&1 &
FRONTEND_PID=$!
echo -e "${GREEN}✅ Frontend service started (PID: $FRONTEND_PID)${NC}"
echo -e "   Logs: $FRONTEND_LOG"

# Start backend service (if it exists)
if [ -f "dist-services/services/index.js" ]; then
  echo -e "${BLUE}🔌 Starting backend service...${NC}"
  node dist-services/services/index.js > $BACKEND_LOG 2>&1 &
  BACKEND_PID=$!
  echo -e "${GREEN}✅ Backend service started (PID: $BACKEND_PID)${NC}"
  echo -e "   Logs: $BACKEND_LOG"
else
  echo -e "${YELLOW}⚠️  Backend service not built yet. Run 'npm run build:services' first.${NC}"
fi

echo -e "\n${GREEN}🎉 Multimodal system is running!${NC}"
echo -e "   Frontend: http://localhost:4173"
echo -e "   Python API: http://localhost:8010"
echo -e "   Press Ctrl+C to stop all services"

# Keep the script running
wait $FRONTEND_PID