#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "========================================="
echo "API Gateway Integration Test"
echo "========================================="
echo ""

# Function to test endpoint with timeout
test_endpoint() {
    local name="$1"
    local method="$2"
    local url="$3"
    local data="$4"
    local expected_status="$5"
    
    echo -n "Testing $name... "
    
    if [ -z "$data" ]; then
        response=$(timeout 5 curl -s -w "\n%{http_code}" -X "$method" "$url" 2>&1)
    else
        response=$(timeout 5 curl -s -w "\n%{http_code}" -X "$method" "$url" \
            -H "Content-Type: application/json" \
            -d "$data" 2>&1)
    fi
    
    exit_code=$?
    
    if [ $exit_code -eq 124 ]; then
        echo -e "${RED}TIMEOUT${NC}"
        return 1
    elif [ $exit_code -ne 0 ]; then
        echo -e "${RED}FAILED (curl error: $exit_code)${NC}"
        return 1
    fi
    
    # Extract status code (last line)
    status_code=$(echo "$response" | tail -1)
    body=$(echo "$response" | head -n -1)
    
    if [ "$status_code" = "$expected_status" ] || [ -z "$expected_status" ]; then
        echo -e "${GREEN}SUCCESS${NC} (HTTP $status_code)"
        if [ ! -z "$body" ]; then
            echo "    Response: $body" | head -c 200
            echo ""
        fi
        return 0
    else
        echo -e "${RED}FAILED${NC} (HTTP $status_code, expected $expected_status)"
        echo "    Response: $body"
        return 1
    fi
}

# Check if auth service is running
echo "1. Checking Auth Service (Direct)"
test_endpoint "Auth Service Health" "GET" "http://localhost:4001/health" "" "200"
echo ""

# Check if gateway is running
echo "2. Checking API Gateway"
test_endpoint "Gateway Health" "GET" "http://localhost:3000/health" "" "200"
echo ""

# Test auth service directly
echo "3. Testing Auth Service Directly"
test_data='{
  "email": "directtest'$(date +%s)'@example.com",
  "password": "Test123!@#",
  "firstName": "Direct",
  "lastName": "Test",
  "role": "patient"
}'
test_endpoint "Direct Registration" "POST" "http://localhost:4001/auth/register" "$test_data" "201"
echo ""

# Test auth service through gateway
echo "4. Testing Auth Service Through Gateway"
test_data='{
  "email": "gatewaytest'$(date +%s)'@example.com",
  "password": "Test123!@#",
  "firstName": "Gateway",
  "lastName": "Test",
  "role": "patient"
}'
test_endpoint "Gateway Registration" "POST" "http://localhost:3000/api/auth/register" "$test_data" "201"
echo ""

# Test login through gateway
echo "5. Testing Login Through Gateway"
login_data='{
  "email": "gatewaytest'$(date +%s)'@example.com",
  "password": "Test123!@#"
}'
test_endpoint "Gateway Login" "POST" "http://localhost:3000/api/auth/login" "$login_data" ""
echo ""

echo "========================================="
echo "Test Summary"
echo "========================================="
echo "Check the results above to see if all tests passed."
echo ""
