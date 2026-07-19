#!/bin/bash

# API Gateway Docker Build Script
# This script builds and tests the API Gateway Docker image

set -e  # Exit on any error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
SERVICE_NAME="api-gateway"
IMAGE_NAME="smart-appointment-api-gateway"
VERSION="${1:-latest}"
FULL_IMAGE_NAME="${IMAGE_NAME}:${VERSION}"
CONTAINER_NAME="${SERVICE_NAME}-test"

echo "======================================"
echo "API Gateway Docker Build Script"
echo "======================================"
echo ""
echo "Service: ${SERVICE_NAME}"
echo "Image: ${FULL_IMAGE_NAME}"
echo ""

# Check if .env file exists
if [ ! -f .env ]; then
    echo -e "${YELLOW}Warning: .env file not found. Using .env.example as template${NC}"
    if [ -f .env.example ]; then
        cp .env.example .env
        echo -e "${GREEN}Created .env from .env.example${NC}"
    else
        echo -e "${RED}Error: Neither .env nor .env.example found${NC}"
        exit 1
    fi
fi

# Clean up any existing test container
cleanup() {
    echo ""
    echo -e "${YELLOW}Cleaning up test container...${NC}"
    docker rm -f ${CONTAINER_NAME} 2>/dev/null || true
}

trap cleanup EXIT

# Build the Docker image
echo -e "${YELLOW}Building Docker image...${NC}"
docker build -t ${FULL_IMAGE_NAME} .

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Docker image built successfully${NC}"
else
    echo -e "${RED}✗ Docker build failed${NC}"
    exit 1
fi

# Test the image
echo ""
read -p "Do you want to test the image? (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo -e "${YELLOW}Starting test container...${NC}"
    docker run -d \
        --name ${CONTAINER_NAME} \
        -p 3000:3000 \
        --env-file .env \
        ${FULL_IMAGE_NAME}

    # Wait for container to start
    echo -e "${YELLOW}Waiting for container to start...${NC}"
    sleep 5

    # Check if container is running
    if docker ps | grep -q ${CONTAINER_NAME}; then
        echo -e "${GREEN}✓ Container started successfully${NC}"
        
        # Test health endpoint
        echo ""
        echo -e "${YELLOW}Testing health endpoint...${NC}"
        HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/health)
        
        if [ "$HTTP_CODE" = "200" ]; then
            echo -e "${GREEN}✓ Health check passed! (HTTP $HTTP_CODE)${NC}"
            curl -s http://localhost:3000/health | jq '.' || curl -s http://localhost:3000/health
        else
            echo -e "${RED}✗ Health check failed (HTTP $HTTP_CODE)${NC}"
            echo ""
            echo "Container logs:"
            docker logs ${CONTAINER_NAME}
        fi

        # Show container info
        echo ""
        echo -e "${YELLOW}Container information:${NC}"
        docker ps --filter "name=${CONTAINER_NAME}" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    else
        echo -e "${RED}✗ Container failed to start${NC}"
        echo ""
        echo "Container logs:"
        docker logs ${CONTAINER_NAME}
        exit 1
    fi
fi

echo ""
echo -e "${GREEN}Build completed successfully!${NC}"
echo ""
echo "To run the container:"
echo "  docker run -d --name ${CONTAINER_NAME} -p 3000:3000 --env-file .env ${FULL_IMAGE_NAME}"
echo ""
echo "To view logs:"
echo "  docker logs -f ${CONTAINER_NAME}"
echo ""
echo "To stop the container:"
echo "  docker stop ${CONTAINER_NAME}"
echo ""
echo "To remove the container:"
echo "  docker rm ${CONTAINER_NAME}"
echo ""
