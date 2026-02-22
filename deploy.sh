#!/bin/bash

###############################################################################
# Smart Appointment System - Automated Deployment Script
# 
# This script builds all Docker images and deploys the complete system
# Usage: ./deploy.sh [OPTIONS]
#
# Options:
#   --no-cache    Build images without using cache
#   --detach      Run containers in detached mode (default)
#   --logs        Show logs after deployment
#   --clean       Remove all containers and volumes before deployment
###############################################################################

set -e  # Exit on any error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="smart-appointment-system"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Parse command line arguments
NO_CACHE=""
DETACH="-d"
SHOW_LOGS=false
CLEAN=false

for arg in "$@"; do
    case $arg in
        --no-cache)
            NO_CACHE="--no-cache"
            shift
            ;;
        --detach)
            DETACH="-d"
            shift
            ;;
        --logs)
            SHOW_LOGS=true
            shift
            ;;
        --clean)
            CLEAN=true
            shift
            ;;
        --help|-h)
            echo "Usage: ./deploy.sh [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --no-cache    Build images without using cache"
            echo "  --detach      Run containers in detached mode (default)"
            echo "  --logs        Show logs after deployment"
            echo "  --clean       Remove all containers and volumes before deployment"
            echo "  --help        Show this help message"
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $arg${NC}"
            exit 1
            ;;
    esac
done

# Function to print colored output
print_header() {
    echo ""
    echo -e "${BLUE}=================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}=================================${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

# Function to check if required files exist
check_prerequisites() {
    print_header "Checking Prerequisites"
    
    local missing_files=()
    
    # Check environment files
    if [ ! -f "api-gateway/.env.gateway" ]; then
        missing_files+=("api-gateway/.env.gateway")
    fi
    
    if [ ! -f "services/auth-service/.env.auth" ]; then
        missing_files+=("services/auth-service/.env.auth")
    fi
    
    if [ ! -f "services/doctor-service/.env.doctor" ]; then
        missing_files+=("services/doctor-service/.env.doctor")
    fi
    
    if [ ! -f "services/appointment-service/.env.appointment" ]; then
        missing_files+=("services/appointment-service/.env.appointment")
    fi
    
    if [ ! -f "services/ai-service/.env.ai" ]; then
        missing_files+=("services/ai-service/.env.ai")
    fi
    
    if [ ${#missing_files[@]} -ne 0 ]; then
        print_error "Missing required environment files:"
        for file in "${missing_files[@]}"; do
            echo "  - $file"
        done
        exit 1
    fi
    
    # Check if Docker is running
    if ! docker info > /dev/null 2>&1; then
        print_error "Docker is not running. Please start Docker and try again."
        exit 1
    fi
    
    # Check if docker compose is available
    if ! command -v docker compose &> /dev/null; then
        print_error "docker compose is not installed. Please install it and try again."
        exit 1
    fi
    
    print_success "All prerequisites met"
}

# Function to clean up existing containers and volumes
cleanup() {
    print_header "Cleaning Up Existing Deployment"
    
    print_info "Stopping and removing containers..."
    docker compose down -v 2>/dev/null || true
    
    print_info "Removing dangling images..."
    docker image prune -f
    
    print_success "Cleanup complete"
}

# Function to build Docker images
build_images() {
    print_header "Building Docker Images"
    
    local services=(
        "api-gateway:kubsandeep/api-gateway-1000:latest"
        "services/auth-service:kubsandeep/auth-service-1001:latest"
        "services/doctor-service:kubsandeep/doctor-service-1003:latest"
        "services/appointment-service:kubsandeep/appointment-service-1004:latest"
        "services/ai-service:kubsandeep/ai-service-1005:latest"
    )
    
    for service_info in "${services[@]}"; do
        IFS=':' read -r path image_name <<< "$service_info"
        service_name=$(basename "$path")
        
        print_info "Building $service_name..."
        
        if cd "$path" 2>/dev/null; then
            if docker build $NO_CACHE -t "$image_name" . ; then
                print_success "$service_name built successfully"
            else
                print_error "Failed to build $service_name"
                cd "$SCRIPT_DIR"
                exit 1
            fi
            cd "$SCRIPT_DIR"
        else
            print_error "Directory not found: $path"
            exit 1
        fi
    done
    
    print_success "All images built successfully"
}

# Function to verify images
verify_images() {
    print_header "Verifying Docker Images"
    
    local images=(
        "kubsandeep/api-gateway-1000:latest"
        "kubsandeep/auth-service-1001:latest"
        "kubsandeep/doctor-service-1003:latest"
        "kubsandeep/appointment-service-1004:latest"
        "kubsandeep/ai-service-1005:latest"
    )
    
    for image in "${images[@]}"; do
        if docker image inspect "$image" > /dev/null 2>&1; then
            print_success "$image verified"
        else
            print_error "$image not found"
            exit 1
        fi
    done
}

# Function to start services
start_services() {
    print_header "Starting Services"
    
    print_info "Starting all services with docker compose..."
    
    if docker compose up $DETACH; then
        print_success "Services started successfully"
    else
        print_error "Failed to start services"
        exit 1
    fi
}

# Function to wait for services to be healthy
wait_for_health() {
    print_header "Waiting for Services to be Healthy"
    
    print_info "This may take up to 60 seconds..."
    
    local max_wait=60
    local elapsed=0
    local check_interval=5
    
    while [ $elapsed -lt $max_wait ]; do
        local unhealthy=$(docker compose ps | grep -E "unhealthy|starting" | wc -l)
        
        if [ "$unhealthy" -eq 0 ]; then
            print_success "All services are healthy"
            return 0
        fi
        
        sleep $check_interval
        elapsed=$((elapsed + check_interval))
        print_info "Still waiting... ($elapsed/$max_wait seconds)"
    done
    
    print_warning "Some services may still be starting. Check with: docker compose ps"
}

# Function to display service status
show_status() {
    print_header "Service Status"
    
    docker compose ps
    
    echo ""
    print_info "Service Endpoints:"
    echo "  • API Gateway:        http://localhost:3000"
    echo "  • API Gateway Health: http://localhost:3000/health"
    echo "  • GraphQL Endpoint:   http://localhost:3000/graphql"
    echo ""
    print_warning "Security Note: Only API Gateway (port 3000) should be exposed publicly."
    print_warning "All other service ports are for internal/development use only."
}

# Function to test endpoints
test_endpoints() {
    print_header "Testing Endpoints"
    
    print_info "Testing API Gateway health..."
    sleep 5  # Give services a moment to fully initialize
    
    if curl -s -f http://localhost:3000/health > /dev/null; then
        print_success "API Gateway is responding"
        
        print_info "Testing GraphQL endpoint..."
        local response=$(curl -s -X POST http://localhost:3000/graphql \
            -H "Content-Type: application/json" \
            -d '{"query":"{ __typename }"}')
        
        if echo "$response" | grep -q "Query"; then
            print_success "GraphQL endpoint is working"
        else
            print_warning "GraphQL endpoint may still be initializing"
        fi
    else
        print_warning "API Gateway is not responding yet. It may still be starting up."
    fi
}

# Function to show logs
show_deployment_logs() {
    print_header "Service Logs"
    
    print_info "Showing logs for all services (Press Ctrl+C to exit)..."
    echo ""
    
    docker compose logs -f
}

# Main execution flow
main() {
    print_header "Smart Appointment System Deployment"
    echo "Starting deployment process..."
    
    # Check prerequisites
    check_prerequisites
    
    # Clean up if requested
    if [ "$CLEAN" = true ]; then
        cleanup
    fi
    
    # Build images
    build_images
    
    # Verify images
    verify_images
    
    # Start services
    start_services
    
    # Wait for health checks
    if [ "$DETACH" = "-d" ]; then
        wait_for_health
        
        # Show status
        show_status
        
        # Test endpoints
        test_endpoints
        
        echo ""
        print_success "🎉 Deployment Complete!"
        echo ""
        print_info "Useful commands:"
        echo "  • View logs:        docker compose logs -f"
        echo "  • Stop services:    docker compose down"
        echo "  • Restart service:  docker compose restart <service-name>"
        echo "  • Check status:     docker compose ps"
        echo ""
        
        # Show logs if requested
        if [ "$SHOW_LOGS" = true ]; then
            show_deployment_logs
        fi
    else
        # Running in attached mode, logs will show automatically
        print_success "Services started in attached mode"
    fi
}

# Trap errors and cleanup
trap 'print_error "Deployment failed. Check the error messages above."; exit 1' ERR

# Run main function
main "$@"
