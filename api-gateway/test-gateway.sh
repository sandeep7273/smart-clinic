#!/bin/bash

echo "Testing API Gateway..."
echo ""

# Test health endpoint
echo "1. Testing Health Endpoint:"
curl -s http://localhost:3000/health | jq .
echo ""

# Test auth registration through gateway
echo "2. Testing Auth Registration through Gateway:"
curl -s -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "gatewaytest@example.com",
    "password": "Test123!@#",
    "firstName": "Gateway",
    "lastName": "Test",
    "role": "patient"
  }' | jq .
echo ""

# Test auth login through gateway
echo "3. Testing Auth Login through Gateway:"
curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "gatewaytest@example.com",
    "password": "Test123!@#"
  }' | jq .
echo ""

# Test direct auth service (for comparison)
echo "4. Testing Direct Auth Service:"
curl -s http://localhost:4001/health | jq .
echo ""

echo "Tests complete!"
