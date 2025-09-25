#!/bin/bash

# Development startup script for Construction Management Backend

set -e

echo "🚀 Starting Construction Management Backend Development Server..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 20 or later."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm."
    exit 1
fi

# Create .env file if it doesn't exist
if [ ! -f ".env" ]; then
    echo "📄 Creating .env file from example..."
    cp .env.example .env
    echo "⚠️  Please update .env file with your configuration before running the server."
    exit 1
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Check if PostgreSQL is running (for local development)
if command -v psql &> /dev/null; then
    if ! pg_isready -q; then
        echo "⚠️  PostgreSQL is not running. Please start PostgreSQL service."
        echo "   macOS: brew services start postgresql"
        echo "   Ubuntu: sudo systemctl start postgresql"
        echo "   Or use Docker: docker-compose up -d postgres"
    fi
fi

# Check if Redis is running (for local development)
if command -v redis-cli &> /dev/null; then
    if ! redis-cli ping > /dev/null 2>&1; then
        echo "⚠️  Redis is not running. Please start Redis service."
        echo "   macOS: brew services start redis"
        echo "   Ubuntu: sudo systemctl start redis"
        echo "   Or use Docker: docker-compose up -d redis"
    fi
fi

# Generate Prisma client if it doesn't exist
if [ ! -d "node_modules/.prisma" ]; then
    echo "🔧 Generating Prisma client..."
    npx prisma generate
fi

# Run database migrations
echo "🗄️  Running database migrations..."
npx prisma migrate deploy

# Seed database with initial data (optional)
if [ "$1" = "--seed" ]; then
    echo "🌱 Seeding database with initial data..."
    npm run seed
fi

# Start the development server
echo "✅ Starting development server on port 3001..."
npm run dev