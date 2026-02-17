#!/bin/bash

# AI Service Quick Start Script
# This script helps you start the AI service and verify all dependencies

echo "🤖 Smart Appointment System - AI Service Setup"
echo "================================================"
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check if a service is running
check_service() {
    local name=$1
    local url=$2
    
    if curl -s "$url" > /dev/null; then
        echo -e "${GREEN}✓${NC} $name is running"
        return 0
    else
        echo -e "${RED}✗${NC} $name is NOT running"
        return 1
    fi
}

# Function to check if a port is in use
check_port() {
    local port=$1
    local service=$2
    
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null ; then
        echo -e "${GREEN}✓${NC} $service (port $port) is available"
        return 0
    else
        echo -e "${RED}✗${NC} $service (port $port) is NOT available"
        return 1
    fi
}

echo "Step 1: Checking Prerequisites"
echo "-------------------------------"

# Check Node.js
if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v)
    echo -e "${GREEN}✓${NC} Node.js installed: $NODE_VERSION"
else
    echo -e "${RED}✗${NC} Node.js is not installed"
    exit 1
fi

# Check MongoDB
if command -v mongod &> /dev/null || pgrep -x mongod > /dev/null; then
    echo -e "${GREEN}✓${NC} MongoDB is available"
else
    echo -e "${YELLOW}⚠${NC} MongoDB may not be running"
fi

# Check Redis
if command -v redis-cli &> /dev/null; then
    if redis-cli ping &> /dev/null; then
        echo -e "${GREEN}✓${NC} Redis is running"
    else
        echo -e "${YELLOW}⚠${NC} Redis is installed but not running"
        echo "  Start with: brew services start redis (macOS) or sudo systemctl start redis"
    fi
else
    echo -e "${RED}✗${NC} Redis is not installed"
fi

echo ""
echo "Step 2: Checking Required Services"
echo "-----------------------------------"

SERVICES_OK=true

# Check Auth Service
if ! check_service "Auth Service" "http://localhost:4001/health"; then
    SERVICES_OK=false
    echo "  Start with: cd services/auth-service && npm run dev"
fi

# Check Doctor Service
if ! check_service "Doctor Service" "http://localhost:4003/health"; then
    SERVICES_OK=false
    echo "  Start with: cd services/doctor-service && npm run dev"
fi

# Check Doctor gRPC
if ! check_port 50051 "Doctor gRPC"; then
    SERVICES_OK=false
fi

echo ""
echo "Step 3: AI Service Configuration"
echo "---------------------------------"

# Check if .env exists
if [ -f "services/ai-service/.env" ]; then
    echo -e "${GREEN}✓${NC} .env file exists"
    
    # Check for OpenAI API key
    if grep -q "OPENAI_API_KEY=sk-" services/ai-service/.env; then
        echo -e "${GREEN}✓${NC} OpenAI API key is configured"
    else
        echo -e "${RED}✗${NC} OpenAI API key is NOT configured"
        echo "  Please add your OpenAI API key to services/ai-service/.env"
        echo "  Get your key from: https://platform.openai.com/api-keys"
        exit 1
    fi
else
    echo -e "${RED}✗${NC} .env file not found"
    echo "  Creating from .env.example..."
    cp services/ai-service/.env.example services/ai-service/.env
    echo -e "${YELLOW}⚠${NC} Please edit services/ai-service/.env and add your OpenAI API key"
    exit 1
fi

# Check if dependencies are installed
if [ -d "services/ai-service/node_modules" ]; then
    echo -e "${GREEN}✓${NC} Dependencies installed"
else
    echo -e "${YELLOW}⚠${NC} Installing dependencies..."
    cd services/ai-service
    npm install
    cd ../..
    echo -e "${GREEN}✓${NC} Dependencies installed successfully"
fi

echo ""
echo "Step 4: Optional - ChromaDB"
echo "---------------------------"

if curl -s "http://localhost:8000/api/v1/heartbeat" > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} ChromaDB is running"
    echo "  You can seed medical knowledge with: cd services/ai-service && npm run seed:embeddings"
else
    echo -e "${YELLOW}⚠${NC} ChromaDB is not running (optional)"
    echo "  Install with: pip install chromadb"
    echo "  Run with: chroma run --host localhost --port 8000"
fi

echo ""
echo "================================================"

if [ "$SERVICES_OK" = false ]; then
    echo -e "${YELLOW}⚠${NC} Some required services are not running"
    echo ""
    echo "Please start the required services first, then run this script again."
    exit 1
fi

echo -e "${GREEN}✓${NC} All prerequisites met!"
echo ""
echo "Starting AI Service..."
echo "----------------------"

cd services/ai-service

# Start the service
npm run dev &
AI_PID=$!

# Wait a few seconds for startup
sleep 5

# Check if service started successfully
if check_service "AI Service" "http://localhost:4005/health"; then
    echo ""
    echo -e "${GREEN}🎉 AI Service is running successfully!${NC}"
    echo ""
    echo "📊 GraphQL Playground: http://localhost:4005/graphql"
    echo "🏥 Health Check: http://localhost:4005/health"
    echo ""
    echo "📱 Mobile App: Navigate to Dashboard → AI Assistant"
    echo ""
    echo "Press Ctrl+C to stop the service"
    
    # Keep script running
    wait $AI_PID
else
    echo -e "${RED}✗ Failed to start AI Service${NC}"
    echo "Check logs at: services/ai-service/logs/combined.log"
    kill $AI_PID 2>/dev/null
    exit 1
fi
