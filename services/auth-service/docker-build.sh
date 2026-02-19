#!/bin/bash

# Build and test script for auth-service Docker image
# Usage: ./docker-build.sh

set -e

echo "================================"
echo "Auth Service - Docker Build"
echo "================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
IMAGE_NAME="auth-service"
IMAGE_TAG="latest"
FULL_IMAGE_NAME="${IMAGE_NAME}:${IMAGE_TAG}"
CONTAINER_NAME="auth-service-test"

echo -e "${YELLOW}Step 1: Cleaning up old containers and images...${NC}"
docker stop ${CONTAINER_NAME} 2>/dev/null || true
docker rm ${CONTAINER_NAME} 2>/dev/null || true

echo ""
echo -e "${YELLOW}Step 2: Building Docker image...${NC}"
docker build -t ${FULL_IMAGE_NAME} .

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Build successful!${NC}"
else
    echo -e "${RED}✗ Build failed!${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}Step 3: Image details${NC}"
docker images | grep ${IMAGE_NAME}

echo ""
echo -e "${YELLOW}Step 4: Testing image (requires .env file)...${NC}"

if [ ! -f .env ]; then
    echo -e "${YELLOW}Warning: .env file not found. Creating from .env.example...${NC}"
    if [ -f .env.example ]; then
        cp .env.example .env
        echo -e "${YELLOW}Please update .env with your actual values before running the container.${NC}"
    else
        echo -e "${RED}No .env.example found. Please create .env manually.${NC}"
        exit 1
    fi
fi

# Prompt for MongoDB URI if running test
read -p "Do you want to test run the container? (y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo -e "${YELLOW}Starting test container...${NC}"
    docker run -d \
        --name ${CONTAINER_NAME} \
        -p 4001:4001 \
        --env-file .env \
        ${FULL_IMAGE_NAME}
    
    echo ""
    echo -e "${YELLOW}Waiting for service to start...${NC}"
    sleep 5
    
    echo ""
    echo -e "${YELLOW}Container logs:${NC}"
    docker logs ${CONTAINER_NAME}
    
    echo ""
    echo -e "${YELLOW}Testing health endpoint...${NC}"
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:4001/health)
    
    if [ "$HTTP_CODE" = "200" ]; then
        echo -e "${GREEN}✓ Health check passed! (HTTP $HTTP_CODE)${NC}"
        curl -s http://localhost:4001/health | jq '.' || curl -s http://localhost:4001/health
    else
        echo -e "${RED}✗ Health check failed! (HTTP $HTTP_CODE)${NC}"
        echo -e "${YELLOW}Container logs:${NC}"
        docker logs ${CONTAINER_NAME}
    fi
    
    echo ""
    echo -e "${YELLOW}Container status:${NC}"
    docker ps | grep ${CONTAINER_NAME}
    
    echo ""
    echo -e "${GREEN}Test container is running. To stop:${NC}"
    echo "  docker stop ${CONTAINER_NAME} && docker rm ${CONTAINER_NAME}"
    echo ""
    echo -e "${GREEN}To view logs:${NC}"
    echo "  docker logs -f ${CONTAINER_NAME}"
else
    echo ""
    echo -e "${GREEN}Build completed successfully!${NC}"
    echo ""
    echo "To run the container:"
    echo "  docker run -d --name ${CONTAINER_NAME} -p 4001:4001 --env-file .env ${FULL_IMAGE_NAME}"
fi

echo ""
echo -e "${GREEN}================================${NC}"
echo -e "${GREEN}Build process complete!${NC}"
echo -e "${GREEN}================================${NC}"
