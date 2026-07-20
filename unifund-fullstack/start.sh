#!/bin/bash
set -e

echo "=========================================="
echo "  🚀 Starting UniFund"
echo "=========================================="

# Check if MongoDB is running
if ! pgrep -x "mongod" > /dev/null; then
    echo "⚠️  MongoDB is not running. Please start MongoDB first."
    exit 1
fi

cd backend
npm start &
BACKEND_PID=$!

echo "   Waiting for backend..."
sleep 3

cd ../frontend
BROWSER=none npm start &
FRONTEND_PID=$!

echo ""
echo "=========================================="
echo "  ✅ UniFund is running!"
echo "=========================================="
echo "   🌐 Frontend: http://localhost:3000"
echo "   🔌 API:      http://localhost:5000"
echo ""

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT
wait
