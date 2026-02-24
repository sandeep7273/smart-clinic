#!/bin/bash

# Script to configure API endpoint for physical device testing

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}🔧 API Configuration Helper${NC}"
echo -e "${BLUE}================================${NC}\n"

# Get local IP address
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    LOCAL_IP=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | head -n1 | awk '{print $2}')
else
    # Linux
    LOCAL_IP=$(hostname -I | awk '{print $1}')
fi

if [ -z "$LOCAL_IP" ]; then
    echo -e "${RED}❌ Could not detect local IP address${NC}"
    echo "Please enter your local IP manually:"
    read LOCAL_IP
fi

echo -e "${GREEN}📍 Detected Local IP: ${LOCAL_IP}${NC}\n"

CONFIG_FILE="src/constants/config.ts"

if [ ! -f "$CONFIG_FILE" ]; then
    echo -e "${RED}❌ Config file not found: ${CONFIG_FILE}${NC}"
    exit 1
fi

echo -e "${YELLOW}Current configuration:${NC}"
grep "PHYSICAL_DEVICE_URL\|PHYSICAL_DEVICE_GRAPHQL_URL\|DOCTOR_SERVICE_PHYSICAL_URL\|APPOINTMENT_SERVICE_PHYSICAL_URL" "$CONFIG_FILE"

echo -e "\n${BLUE}Would you like to update the physical device URLs? (y/n)${NC}"
read -r RESPONSE

if [[ "$RESPONSE" =~ ^[Yy]$ ]]; then
    # Backup original file
    cp "$CONFIG_FILE" "${CONFIG_FILE}.backup"
    echo -e "${GREEN}✅ Backup created: ${CONFIG_FILE}.backup${NC}"
    
    # Update URLs
    sed -i.tmp "s|PHYSICAL_DEVICE_URL: 'http://[0-9.]*:3000/api'|PHYSICAL_DEVICE_URL: 'http://${LOCAL_IP}:3000/api'|g" "$CONFIG_FILE"
    sed -i.tmp "s|PHYSICAL_DEVICE_GRAPHQL_URL: 'http://[0-9.]*:3000/graphql'|PHYSICAL_DEVICE_GRAPHQL_URL: 'http://${LOCAL_IP}:3000/graphql'|g" "$CONFIG_FILE"
    sed -i.tmp "s|DOCTOR_SERVICE_PHYSICAL_URL: 'http://[0-9.]*:4003/api'|DOCTOR_SERVICE_PHYSICAL_URL: 'http://${LOCAL_IP}:4003/api'|g" "$CONFIG_FILE"
    sed -i.tmp "s|APPOINTMENT_SERVICE_PHYSICAL_URL: 'http://[0-9.]*:4004'|APPOINTMENT_SERVICE_PHYSICAL_URL: 'http://${LOCAL_IP}:4004'|g" "$CONFIG_FILE"
    
    # Remove temp file
    rm -f "${CONFIG_FILE}.tmp"
    
    echo -e "${GREEN}✅ Configuration updated!${NC}\n"
    
    echo -e "${YELLOW}New configuration:${NC}"
    grep "PHYSICAL_DEVICE_URL\|PHYSICAL_DEVICE_GRAPHQL_URL\|DOCTOR_SERVICE_PHYSICAL_URL\|APPOINTMENT_SERVICE_PHYSICAL_URL" "$CONFIG_FILE"
    
    echo -e "\n${GREEN}🎉 Configuration complete!${NC}"
    echo -e "${BLUE}Next steps:${NC}"
    echo "1. Make sure your API Gateway is running on: http://${LOCAL_IP}:3000"
    echo "2. Connect your phone to the same WiFi network as your computer"
    echo "3. Build and install the APK: ./build-apk.sh debug"
else
    echo -e "${YELLOW}⚠️  Configuration not changed${NC}"
fi

echo -e "\n${BLUE}================================${NC}"
echo -e "${BLUE}📱 Testing Checklist:${NC}"
echo -e "${BLUE}================================${NC}"
echo "☐ API Gateway running: http://${LOCAL_IP}:3000"
echo "☐ Phone and computer on same WiFi"
echo "☐ Firewall allows connections on port 3000"
echo "☐ Test API: curl http://${LOCAL_IP}:3000/api/health"
