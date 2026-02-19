#!/bin/bash

# ProvaNota - Quick Start Script
# Sets up local development environment

set -e

echo "🚀 ProvaNota - Quick Start Setup"
echo "================================="
echo ""

# Check prerequisites
echo "🔍 Checking prerequisites..."

if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 not found. Please install Python 3.11+"
    exit 1
fi

if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js 16+"
    exit 1
fi

if ! command -v yarn &> /dev/null; then
    echo "❌ Yarn not found. Installing..."
    npm install -g yarn
fi

echo "✅ All prerequisites found"
echo ""

# MongoDB check
echo "🔍 Checking MongoDB..."
if command -v mongod &> /dev/null; then
    echo "✅ MongoDB found locally"
    echo "   Make sure it's running: sudo systemctl start mongod"
else
    echo "⚠️  MongoDB not found locally"
    echo "   You can:"
    echo "   1. Install MongoDB locally"
    echo "   2. Use MongoDB Atlas (free tier)"
    echo "   "
    echo "   For Atlas: https://www.mongodb.com/cloud/atlas/register"
fi
echo ""

# Setup backend
echo "📦 Setting up Backend..."
cd backend

if [ ! -d "venv" ]; then
    echo "  Creating virtual environment..."
    python3 -m venv venv
fi

echo "  Activating virtual environment..."
source venv/bin/activate

echo "  Installing dependencies..."
pip install -q -r requirements.txt

if [ ! -f ".env" ]; then
    echo "  Creating .env file..."
    cp .env.example .env
    echo "  ⚠️  Please edit backend/.env with your MongoDB URL"
fi

echo "✅ Backend setup complete"
echo ""

# Setup frontend
echo "📦 Setting up Frontend..."
cd ../frontend

echo "  Installing dependencies..."
yarn install --silent

if [ ! -f ".env" ]; then
    echo "  Creating .env file..."
    cp .env.example .env
fi

echo "✅ Frontend setup complete"
echo ""

# Instructions
echo "================================="
echo "✨ Setup Complete!"
echo "================================="
echo ""
echo "📝 Next steps:"
echo ""
echo "1. Configure MongoDB:"
echo "   Edit backend/.env and set MONGO_URL"
echo ""
echo "2. Seed database:"
echo "   cd backend"
echo "   source venv/bin/activate"
echo "   python seed_data.py"
echo ""
echo "3. Start backend (Terminal 1):"
echo "   cd backend"
echo "   source venv/bin/activate"
echo "   uvicorn server:app --host 0.0.0.0 --port 8001 --reload"
echo ""
echo "4. Start frontend (Terminal 2):"
echo "   cd frontend"
echo "   yarn start"
echo ""
echo "5. Open browser:"
echo "   http://localhost:3000"
echo ""
echo "🔐 Test credentials:"
echo "   Admin: admin@provanota.com / admin123"
echo "   Student: estudante@provanota.com / estudante123"
echo ""
echo "📚 Documentation:"
echo "   README.md - Full setup guide"
echo "   DEPLOYMENT.md - Deploy to production"
echo "   CHECKLIST.md - Deployment checklist"
echo "================================="