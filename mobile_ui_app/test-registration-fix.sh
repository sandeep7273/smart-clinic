#!/bin/bash

# Test Registration Fix
# Verifies that registration works with different payload combinations

echo "🧪 Testing Mobile App Registration Scenarios"
echo "=============================================="
echo ""

BASE_URL="http://localhost:3000/api"
TIMESTAMP=$(date +%s)

# Test 1: Registration with all fields
echo "📝 Test 1: Registration with all fields"
echo "---------------------------------------"
curl -s --max-time 5 -X POST ${BASE_URL}/auth/register \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"fulltest${TIMESTAMP}@example.com\",
    \"password\": \"Test123!@#\",
    \"firstName\": \"Full\",
    \"lastName\": \"Test\",
    \"role\": \"patient\",
    \"phoneNumber\": \"+1234567890\",
    \"dateOfBirth\": \"1990-01-01\"
  }" | python3 -c "import sys, json; data=json.load(sys.stdin); print(f\"✅ Success: {data.get('success')}\\n📧 Email: {data.get('data', {}).get('user', {}).get('email')}\\n🔑 Has Token: {bool(data.get('data', {}).get('accessToken'))}\")" 2>/dev/null || echo "❌ Test 1 Failed"

echo ""
sleep 1

# Test 2: Registration without optional fields
echo "📝 Test 2: Registration without optional phoneNumber and dateOfBirth"
echo "--------------------------------------------------------------------"
curl -s --max-time 5 -X POST ${BASE_URL}/auth/register \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"minimal${TIMESTAMP}@example.com\",
    \"password\": \"Test123!@#\",
    \"firstName\": \"Minimal\",
    \"lastName\": \"Test\",
    \"role\": \"patient\"
  }" | python3 -c "import sys, json; data=json.load(sys.stdin); print(f\"✅ Success: {data.get('success')}\\n📧 Email: {data.get('data', {}).get('user', {}).get('email')}\\n🔑 Has Token: {bool(data.get('data', {}).get('accessToken'))}\")" 2>/dev/null || echo "❌ Test 2 Failed"

echo ""
sleep 1

# Test 3: Registration with invalid password (should fail)
echo "📝 Test 3: Registration with invalid password (expected to fail)"
echo "---------------------------------------------------------------"
curl -s --max-time 5 -X POST ${BASE_URL}/auth/register \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"invalid${TIMESTAMP}@example.com\",
    \"password\": \"weak\",
    \"firstName\": \"Invalid\",
    \"lastName\": \"Test\",
    \"role\": \"patient\"
  }" | python3 -c "import sys, json; data=json.load(sys.stdin); print(f\"❌ Expected Failure: {not data.get('success')}\\n📋 Message: {data.get('message')}\")" 2>/dev/null || echo "⚠️  Test 3 had unexpected error"

echo ""
sleep 1

# Test 4: Registration with invalid phone format
echo "📝 Test 4: Registration with invalid phone format (expected to fail)"
echo "--------------------------------------------------------------------"
curl -s --max-time 5 -X POST ${BASE_URL}/auth/register \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"badphone${TIMESTAMP}@example.com\",
    \"password\": \"Test123!@#\",
    \"firstName\": \"Bad\",
    \"lastName\": \"Phone\",
    \"role\": \"patient\",
    \"phoneNumber\": \"123\"
  }" | python3 -c "import sys, json; data=json.load(sys.stdin); print(f\"❌ Expected Failure: {not data.get('success')}\\n📋 Message: {data.get('message')}\")" 2>/dev/null || echo "⚠️  Test 4 had unexpected error"

echo ""
echo "=============================================="
echo "✅ Registration fix testing complete!"
echo ""
echo "💡 Tips for mobile app testing:"
echo "  - PhoneNumber is now optional"
echo "  - DateOfBirth is optional"
echo "  - Password must be at least 8 chars with uppercase, number, special char"
echo "  - Check React Native console logs for detailed errors"
echo ""
