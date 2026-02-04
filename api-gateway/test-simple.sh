#!/bin/bash

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

echo "========================================="
echo "API Gateway Integration Test"
echo "========================================="
echo ""

# Test 1: Gateway Health
echo -n "1. Gateway Health... "
response=$(curl -s --max-time 5 http://localhost:3000/health 2>&1)
if [ $? -eq 0 ]; then
    echo -e "${GREEN}PASS${NC}"
    echo "   $response" | head -c 100
    echo ""
else
    echo -e "${RED}FAIL${NC}"
fi
echo ""

# Test 2: Auth Service Health (Direct)
echo -n "2. Auth Service Direct... "
response=$(curl -s --max-time 5 http://localhost:4001/health 2>&1)
if [ $? -eq 0 ]; then
    echo -e "${GREEN}PASS${NC}"
else
    echo -e "${RED}FAIL${NC}"
fi
echo ""

# Test 3: Register via Auth Service Directly
echo -n "3. Direct Auth Registration... "
response=$(curl -s --max-time 5 -X POST http://localhost:4001/auth/register \
    -H "Content-Type: application/json" \
    -d '{
        "email": "direct'$(date +%s)'@test.com",
        "password": "Test123!@#",
        "firstName": "Direct",
        "lastName": "Test",
        "role": "patient"
    }' 2>&1)
if echo "$response" | grep -q "success"; then
    echo -e "${GREEN}PASS${NC}"
    echo "   $response" | head -c 150
    echo ""
else
    echo -e "${RED}FAIL${NC}"
    echo "   $response" | head -c 150
    echo ""
fi
echo ""

# Test 4: Register via Gateway
echo -n "4. Gateway Auth Registration... "
response=$(curl -s --max-time 5 -X POST http://localhost:3000/api/auth/register \
    -H "Content-Type: application/json" \
    -d '{
        "email": "gateway'$(date +%s)'@test.com",
        "password": "Test123!@#",
        "firstName": "Gateway",
        "lastName": "Test",
        "role": "patient"
    }' 2>&1)
if echo "$response" | grep -q "success"; then
    echo -e "${GREEN}PASS${NC}"
    echo "   $response" | head -c 150
    echo ""
else
    echo -e "${RED}FAIL or TIMEOUT${NC}"
    echo "   $response" | head -c 150
    echo ""
fi
echo ""

echo "========================================="
echo "Done!"
echo "========================================="
