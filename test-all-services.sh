#!/bin/bash

# Test All Services Script
# Runs tests for all microservices and generates combined report

echo "=================================================="
echo "Running Tests for All Services"
echo "=================================================="
echo ""

cd "$(dirname "$0")"

SERVICES=("services/auth-service" "services/doctor-service" "services/appointment-service" "services/ai-service" "api-gateway")
FAILED_SERVICES=()
PASSED_SERVICES=()

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test each service
for service in "${SERVICES[@]}"; do
    service_name=$(basename "$service")
    
    if [ -d "$service" ]; then
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo "Testing: $service_name"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo ""
        
        cd "$service"
        
        if npm test -- --no-coverage --silent 2>&1 | tail -20; then
            PASSED_SERVICES+=("$service_name")
            echo -e "${GREEN}✅ $service_name: PASSED${NC}"
        else
            FAILED_SERVICES+=("$service_name")
            echo -e "${RED}❌ $service_name: FAILED${NC}"
        fi
        
        cd - > /dev/null
        echo ""
        echo ""
    else
        echo -e "${YELLOW}⚠️  $service not found, skipping...${NC}"
        echo ""
    fi
done

# Summary
echo "=================================================="
echo "Test Summary"
echo "=================================================="
echo ""

if [ ${#PASSED_SERVICES[@]} -gt 0 ]; then
    echo -e "${GREEN}✅ Passed (${#PASSED_SERVICES[@]}):${NC}"
    for service in "${PASSED_SERVICES[@]}"; do
        echo "   - $service"
    done
    echo ""
fi

if [ ${#FAILED_SERVICES[@]} -gt 0 ]; then
    echo -e "${RED}❌ Failed (${#FAILED_SERVICES[@]}):${NC}"
    for service in "${FAILED_SERVICES[@]}"; do
        echo "   - $service"
    done
    echo ""
    exit 1
else
    echo -e "${GREEN}🎉 All services passed!${NC}"
    exit 0
fi
