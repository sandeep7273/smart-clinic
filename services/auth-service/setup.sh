#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}  Auth Service - Quick Start Setup${NC}"
echo -e "${GREEN}================================================${NC}"
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  .env file not found. Creating from .env.example...${NC}"
    cp .env.example .env
    echo -e "${GREEN}✓ Created .env file${NC}"
    echo -e "${YELLOW}📝 Please edit .env and set your JWT secrets!${NC}"
    echo ""
else
    echo -e "${GREEN}✓ .env file exists${NC}"
fi

# Check if node_modules exists
if [ ! -d node_modules ]; then
    echo -e "${YELLOW}📦 Installing dependencies...${NC}"
    npm install
    echo -e "${GREEN}✓ Dependencies installed${NC}"
    echo ""
else
    echo -e "${GREEN}✓ Dependencies already installed${NC}"
fi

# Check if MongoDB is running (optional)
echo -e "${YELLOW}🔍 Checking MongoDB connection...${NC}"
if command -v mongosh &> /dev/null; then
    # Try to connect to MongoDB
    if mongosh --eval "db.adminCommand('ping')" --quiet &> /dev/null; then
        echo -e "${GREEN}✓ MongoDB is running${NC}"
    else
        echo -e "${RED}✗ MongoDB is not accessible${NC}"
        echo -e "${YELLOW}  Start MongoDB or update MONGODB_URI in .env${NC}"
    fi
else
    echo -e "${YELLOW}  mongosh not found. Skipping MongoDB check.${NC}"
    echo -e "${YELLOW}  Make sure MongoDB is running at the URI in .env${NC}"
fi

echo ""
echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}  Setup Complete!${NC}"
echo -e "${GREEN}================================================${NC}"
echo ""
echo -e "To start the service:"
echo -e "${YELLOW}  Development:${NC} npm run dev"
echo -e "${YELLOW}  Production:${NC}  npm start"
echo ""
echo -e "API will be available at: ${GREEN}http://localhost:4001${NC}"
echo -e "Health check: ${GREEN}http://localhost:4001/health${NC}"
echo ""
echo -e "See ${YELLOW}README.md${NC} for API documentation"
echo -e "See ${YELLOW}API_EXAMPLES.md${NC} for request examples"
echo ""
