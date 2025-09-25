#!/bin/bash
# setup-multimodal.sh
# Script to set up the multimodal environment

echo "Setting up multimodal environment..."

# Install Node.js dependencies
echo "Installing Node.js dependencies..."
npm install

# Create Python virtual environment if it doesn't exist
if [ ! -d ".venv" ]; then
  echo "Creating Python virtual environment..."
  python3 -m venv .venv
fi

# Activate virtual environment and install Python dependencies
echo "Installing Python dependencies..."
source .venv/bin/activate
pip install -r mm_service/requirements.txt
deactivate

echo "Installing development tools..."
npm install -g concurrently

echo "Building shared type definitions..."
npm run build:types

echo "Setup complete! Run 'npm run dev:mm' to start all services."