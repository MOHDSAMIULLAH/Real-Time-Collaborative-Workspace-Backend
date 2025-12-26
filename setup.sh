#!/bin/bash

# Collaborative Workspace Backend - Setup Script
# This script helps with initial setup and verification

set -e

echo "🚀 Collaborative Workspace Backend - Setup Script"
echo "=================================================="
echo ""

# Check prerequisites
echo "📋 Checking prerequisites..."

# Check Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi
echo "✅ Docker is installed"

# Check Docker Compose
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi
echo "✅ Docker Compose is installed"

# Check Node.js (optional, for development)
if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v)
    echo "✅ Node.js is installed: $NODE_VERSION"
else
    echo "⚠️  Node.js is not installed (optional for Docker setup)"
fi

echo ""

# Setup environment
echo "🔧 Setting up environment..."

if [ ! -f .env ]; then
    if [ -f .env.example ]; then
        cp .env.example .env
        echo "✅ Created .env file from .env.example"
        echo "⚠️  Please update .env with your configuration before production use"
    else
        echo "❌ .env.example file not found"
        exit 1
    fi
else
    echo "✅ .env file already exists"
fi

echo ""

# Pull Docker images
echo "🐳 Pulling Docker images..."
docker-compose pull

echo ""

# Start services
echo "🚀 Starting services..."
docker-compose up -d

echo ""

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 10

# Check service health
echo "🔍 Checking service health..."

# Check PostgreSQL
if docker-compose exec -T postgres pg_isready -U postgres > /dev/null 2>&1; then
    echo "✅ PostgreSQL is ready"
else
    echo "❌ PostgreSQL is not ready"
fi

# Check MongoDB
if docker-compose exec -T mongodb mongosh --eval "db.adminCommand('ping')" > /dev/null 2>&1; then
    echo "✅ MongoDB is ready"
else
    echo "❌ MongoDB is not ready"
fi

# Check Redis
if docker-compose exec -T redis redis-cli ping > /dev/null 2>&1; then
    echo "✅ Redis is ready"
else
    echo "❌ Redis is not ready"
fi

# Check API
if curl -s http://localhost:3000/health > /dev/null 2>&1; then
    echo "✅ API server is ready"
else
    echo "❌ API server is not ready (this may take a minute)"
fi

echo ""

# Display service URLs
echo "🌐 Service URLs:"
echo "   API: http://localhost:3000"
echo "   API Docs: http://localhost:3000/api/docs"
echo "   WebSocket: ws://localhost:3001"
echo ""

# Display useful commands
echo "📚 Useful commands:"
echo "   View logs: docker-compose logs -f"
echo "   Stop services: docker-compose down"
echo "   Restart services: docker-compose restart"
echo "   Run tests: npm test (requires npm install)"
echo ""

# Test API endpoint
echo "🧪 Testing API endpoint..."
HEALTH_RESPONSE=$(curl -s http://localhost:3000/health)
if [ $? -eq 0 ]; then
    echo "✅ Health check successful:"
    echo "$HEALTH_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$HEALTH_RESPONSE"
else
    echo "⚠️  Health check failed (API may still be starting)"
    echo "   Wait a minute and try: curl http://localhost:3000/health"
fi

echo ""
echo "✨ Setup complete! Your collaborative workspace backend is running!"
echo ""
echo "📖 Next steps:"
echo "   1. Read QUICKSTART.md for a quick guide"
echo "   2. Visit http://localhost:3000/api/docs for API documentation"
echo "   3. Follow API_TESTING.md for testing examples"
echo ""
