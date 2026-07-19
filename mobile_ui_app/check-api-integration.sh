#!/bin/bash

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "========================================="
echo " Mobile App API Integration Check"
echo "========================================="
echo ""

# Check if API Gateway is running
echo -n "1. Checking API Gateway (port 3000)... "
if curl -s --max-time 2 http://localhost:3000/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Running${NC}"
else
    echo -e "${RED}✗ Not Running${NC}"
    echo "   Start it with: cd api-gateway && node src/index.js"
    exit 1
fi

# Check if Auth Service is running
echo -n "2. Checking Auth Service (port 4001)... "
if curl -s --max-time 2 http://localhost:4001/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Running${NC}"
else
    echo -e "${RED}✗ Not Running${NC}"
    echo "   Start it with: cd services/auth-service && npm start"
    exit 1
fi

# Test registration endpoint through gateway
echo -n "3. Testing registration endpoint... "
TEST_EMAIL="integration-test-$(date +%s)@example.com"
REGISTER_RESPONSE=$(curl -s --max-time 5 -X POST http://localhost:3000/api/auth/register \
    -H "Content-Type: application/json" \
    -d '{
        "email": "'$TEST_EMAIL'",
        "password": "Test123!@#",
        "firstName": "Integration",
        "lastName": "Test",
        "role": "patient"
    }' 2>&1)

if echo "$REGISTER_RESPONSE" | grep -q '"success":true'; then
    echo -e "${GREEN}✓ Working${NC}"
    echo "   Created test user: $TEST_EMAIL"
else
    echo -e "${RED}✗ Failed${NC}"
    echo "   Response: $REGISTER_RESPONSE" | head -c 200
    exit 1
fi

# Test login endpoint through gateway
echo -n "4. Testing login endpoint... "
LOGIN_RESPONSE=$(curl -s --max-time 5 -X POST http://localhost:3000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{
        "email": "'$TEST_EMAIL'",
        "password": "Test123!@#"
    }' 2>&1)

if echo "$LOGIN_RESPONSE" | grep -q '"accessToken"'; then
    echo -e "${GREEN}✓ Working${NC}"
    ACCESS_TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)
    echo "   Access token received: ${ACCESS_TOKEN:0:40}..."
else
    echo -e "${RED}✗ Failed${NC}"
    echo "   Response: $LOGIN_RESPONSE" | head -c 200
    exit 1
fi

echo ""
echo "========================================="
echo -e " ${GREEN}✓ All checks passed!${NC}"
echo "========================================="
echo ""
echo "Your mobile app is ready to connect!"
echo ""
echo "Configuration:"
echo "  • API Base URL: http://localhost:3000/api"
echo "  • API Mode: development"
echo ""
echo "Next steps:"
echo "  1. cd mobile_ui_app"
echo "  2. npm start"
echo "  3. Test registration and login in the app"
echo ""
echo "For iOS: Use http://localhost:3000/api"
echo "For Android Emulator: Use http://10.0.2.2:3000/api"
echo "For Physical Device: Use http://YOUR_IP:3000/api"
echo ""
