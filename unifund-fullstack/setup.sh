#!/bin/bash
set -e

echo "=========================================="
echo "  UniFund - Setup & Start Script"
echo "=========================================="

# Check if MongoDB is running
if ! pgrep -x "mongod" > /dev/null; then
    echo "⚠️  MongoDB is not running. Please start MongoDB first."
    echo "   Ubuntu/Debian: sudo systemctl start mongod"
    echo "   macOS (brew): brew services start mongodb-community"
    echo "   Docker: docker run -d -p 27017:27017 --name mongodb mongo:latest"
    exit 1
fi

echo "✅ MongoDB is running"

# Backend setup
echo ""
echo "📦 Setting up backend..."
cd backend

if [ ! -d "node_modules" ]; then
    echo "   Installing backend dependencies..."
    npm install
else
    echo "   Backend dependencies already installed"
fi

if [ ! -f ".env" ]; then
    echo "   Creating .env from .env.example..."
    cp .env.example .env
    echo "   ⚠️  Please update .env with your MongoDB URI and JWT secret"
fi

echo "   Seeding database with demo users..."
node seed.js

echo "✅ Backend ready"

# Frontend setup
echo ""
echo "📦 Setting up frontend..."
cd ../frontend

if [ ! -d "node_modules" ]; then
    echo "   Installing frontend dependencies..."
    npm install
else
    echo "   Frontend dependencies already installed"
fi

echo "✅ Frontend ready"

echo ""
echo "=========================================="
echo "  🚀 Starting UniFund"
echo "=========================================="
echo ""

# Start backend in background
echo "   Starting backend on port 5000..."
cd ../backend
npm start &
BACKEND_PID=$!

# Wait for backend
echo "   Waiting for backend to start..."
sleep 3

# Start frontend
echo "   Starting frontend..."
cd ../frontend
BROWSER=none npm start &
FRONTEND_PID=$!

echo ""
echo "=========================================="
echo "  ✅ UniFund is running!"
echo "=========================================="
echo ""
echo "   🌐 Frontend: http://localhost:3000"
echo "   🔌 API:      http://localhost:5000"
echo ""
echo "   Demo accounts:"
echo "     📧 alice@unifund.com / password123"
echo "     📧 bob@unifund.com   / password123"
echo ""
echo "   Press Ctrl+C to stop both servers"
echo ""

# Trap Ctrl+C to kill both processes
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT

wait
