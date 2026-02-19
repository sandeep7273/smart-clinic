#!/bin/bash

# Multi-Service Test Setup Script
# Automates installation of test dependencies for all microservices

echo "=================================================="
echo "Smart Appointment System - Multi-Service Testing Setup"
echo "=================================================="
echo ""

SERVICES=("auth-service" "doctor-service" "appointment-service" "ai-service")
API_GATEWAY="api-gateway"

cd "$(dirname "$0")"

echo "📦 Installing test dependencies for all services..."
echo ""

# Function to install dependencies for a service
install_service_deps() {
    local service_path=$1
    local service_name=$2
    
    if [ -d "$service_path" ]; then
        echo "🔧 Installing dependencies for $service_name..."
        cd "$service_path"
        npm install --save-dev \
            jest@^29.7.0 \
            supertest@^6.3.4 \
            @types/jest@^29.5.12 \
            mongodb-memory-server@^9.1.6 \
            @shelf/jest-mongodb@^4.2.0 \
            2>&1 | grep -v "npm WARN"
        
        if [ $? -eq 0 ]; then
            echo "✅ $service_name dependencies installed"
        else
            echo "❌ Failed to install $service_name dependencies"
        fi
        cd - > /dev/null
        echo ""
    else
        echo "⚠️  $service_path not found, skipping..."
        echo ""
    fi
}

# Install for each service
for service in "${SERVICES[@]}"; do
    install_service_deps "services/$service" "$service"
done

# Install for API Gateway
install_service_deps "$API_GATEWAY" "api-gateway"

echo "=================================================="
echo "✅ Test Setup Complete for All Services!"
echo "=================================================="
echo ""
echo "📋 Quick Start Commands:"
echo ""
echo "  # Test individual services:"
echo "  cd services/auth-service && npm test"
echo "  cd services/doctor-service && npm test"
echo "  cd services/appointment-service && npm test"
echo "  cd services/ai-service && npm test"
echo "  cd api-gateway && npm test"
echo ""
echo "  # Test all services (from root):"
echo "  ./test-all-services.sh"
echo ""
echo "  # Watch mode for development:"
echo "  cd services/YOUR-SERVICE && npm run test:watch"
echo ""
echo "📚 Documentation:"
echo "  - services/auth-service/TESTING.md"
echo "  - MULTI_SERVICE_TESTING_GUIDE.md"
echo ""
echo "=================================================="
