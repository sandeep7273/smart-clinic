#!/bin/bash

###############################################################################
# QUICK START - Deploy Smart Appointment System
#
# This script provides an interactive quick-start for deploying the system
###############################################################################

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

clear

echo -e "${BLUE}"
cat << "EOF"
╔═══════════════════════════════════════════════════════════════════╗
║                                                                   ║
║         Smart Appointment System - Quick Start Deployment        ║
║                                                                   ║
╚═══════════════════════════════════════════════════════════════════╝
EOF
echo -e "${NC}"

echo ""
echo -e "${GREEN}This wizard will help you deploy the Smart Appointment System${NC}"
echo ""

# Check if running in correct directory
if [ ! -f "deploy.sh" ]; then
    echo -e "${YELLOW}⚠ Please run this script from the project root directory${NC}"
    exit 1
fi

# Ask user what they want to do
echo "What would you like to do?"
echo ""
echo "1) Deploy for PRODUCTION (Only API Gateway exposed - SECURE)"
echo "2) Deploy for DEVELOPMENT (All services exposed for debugging)"
echo "3) Deploy to AWS EC2 (View deployment guide)"
echo "4) View documentation"
echo "5) Exit"
echo ""
read -p "Enter your choice (1-5): " choice

case $choice in
    1)
        echo ""
        echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
        echo -e "${BLUE}           PRODUCTION DEPLOYMENT${NC}"
        echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
        echo ""
        echo "This will:"
        echo "  ✓ Build all Docker images"
        echo "  ✓ Start all services"
        echo "  ✓ Only expose API Gateway (port 3000)"
        echo "  ✓ Keep all other services internal"
        echo ""
        echo -e "${YELLOW}Security Note: Only API Gateway will be accessible externally.${NC}"
        echo ""
        read -p "Continue? (y/n): " confirm
        
        if [ "$confirm" = "y" ] || [ "$confirm" = "Y" ]; then
            echo ""
            echo -e "${GREEN}Starting production deployment...${NC}"
            ./deploy.sh --clean
            
            echo ""
            echo -e "${GREEN}═══════════════════════════════════════════════════════${NC}"
            echo -e "${GREEN}        DEPLOYMENT COMPLETE!${NC}"
            echo -e "${GREEN}═══════════════════════════════════════════════════════${NC}"
            echo ""
            echo "Your system is now running!"
            echo ""
            echo "Access your API at:"
            echo "  • Health Check: http://localhost:3000/health"
            echo "  • GraphQL:      http://localhost:3000/graphql"
            echo ""
            echo "Useful commands:"
            echo "  • View logs:        docker-compose logs -f"
            echo "  • Stop services:    docker-compose down"
            echo "  • Check status:     docker-compose ps"
            echo ""
        fi
        ;;
        
    2)
        echo ""
        echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
        echo -e "${BLUE}           DEVELOPMENT DEPLOYMENT${NC}"
        echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
        echo ""
        echo "This will:"
        echo "  ✓ Build all Docker images"
        echo "  ✓ Start all services"
        echo "  ✓ Expose ALL service ports for debugging"
        echo ""
        echo -e "${YELLOW}Warning: This configuration exposes all services publicly.${NC}"
        echo -e "${YELLOW}Only use for local development, NEVER in production!${NC}"
        echo ""
        read -p "Continue? (y/n): " confirm
        
        if [ "$confirm" = "y" ] || [ "$confirm" = "Y" ]; then
            echo ""
            echo -e "${GREEN}Starting development deployment...${NC}"
            
            # Build images
            ./deploy.sh --no-cache > /dev/null 2>&1 || true
            
            # Stop production deployment if running
            docker-compose down 2>/dev/null || true
            
            # Start development deployment
            docker-compose -f docker-compose.dev.yml up -d
            
            echo ""
            echo -e "${GREEN}═══════════════════════════════════════════════════════${NC}"
            echo -e "${GREEN}        DEVELOPMENT DEPLOYMENT COMPLETE!${NC}"
            echo -e "${GREEN}═══════════════════════════════════════════════════════${NC}"
            echo ""
            echo "All services are now accessible:"
            echo ""
            echo "  • API Gateway:         http://localhost:3000"
            echo "  • Auth Service:        http://localhost:4001"
            echo "  • Doctor Service:      http://localhost:4003"
            echo "  • Appointment Service: http://localhost:4004"
            echo "  • AI Service:          http://localhost:4005"
            echo "  • MongoDB:             localhost:27017"
            echo "  • Redis:               localhost:6379"
            echo "  • Kafka:               localhost:9092"
            echo ""
            echo "Useful commands:"
            echo "  • View logs:        docker-compose -f docker-compose.dev.yml logs -f"
            echo "  • Stop services:    docker-compose -f docker-compose.dev.yml down"
            echo "  • Check status:     docker-compose -f docker-compose.dev.yml ps"
            echo ""
        fi
        ;;
        
    3)
        echo ""
        echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
        echo -e "${BLUE}           AWS EC2 DEPLOYMENT GUIDE${NC}"
        echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
        echo ""
        
        if [ -f "EC2_DEPLOYMENT_GUIDE.md" ]; then
            echo "Opening EC2 Deployment Guide..."
            echo ""
            echo "Key steps for EC2 deployment:"
            echo ""
            echo "1. Launch EC2 instance (t3.large recommended)"
            echo "2. Configure security group (only ports 22, 80, 443, 3000)"
            echo "3. Install Docker and Docker Compose"
            echo "4. Clone repository"
            echo "5. Configure .env files"
            echo "6. Run: ./deploy.sh --clean"
            echo "7. Set up Nginx reverse proxy"
            echo "8. Configure SSL with Let's Encrypt"
            echo ""
            echo "For detailed instructions, see: EC2_DEPLOYMENT_GUIDE.md"
            echo ""
            read -p "Open guide now? (y/n): " open_guide
            
            if [ "$open_guide" = "y" ] || [ "$open_guide" = "Y" ]; then
                if command -v less &> /dev/null; then
                    less EC2_DEPLOYMENT_GUIDE.md
                else
                    cat EC2_DEPLOYMENT_GUIDE.md
                fi
            fi
        else
            echo "EC2_DEPLOYMENT_GUIDE.md not found!"
        fi
        ;;
        
    4)
        echo ""
        echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
        echo -e "${BLUE}                 DOCUMENTATION${NC}"
        echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
        echo ""
        echo "Available documentation:"
        echo ""
        echo "  1. DEPLOYMENT_README.md      - Deployment scripts reference"
        echo "  2. EC2_DEPLOYMENT_GUIDE.md   - AWS EC2 deployment guide"
        echo "  3. PRODUCTION_DEPLOYMENT.md  - Production best practices"
        echo "  4. README.md                 - Project overview"
        echo ""
        read -p "Enter number to view (or press Enter to skip): " doc_choice
        
        case $doc_choice in
            1) less DEPLOYMENT_README.md 2>/dev/null || cat DEPLOYMENT_README.md ;;
            2) less EC2_DEPLOYMENT_GUIDE.md 2>/dev/null || cat EC2_DEPLOYMENT_GUIDE.md ;;
            3) less PRODUCTION_DEPLOYMENT.md 2>/dev/null || cat PRODUCTION_DEPLOYMENT.md ;;
            4) less README.md 2>/dev/null || cat README.md ;;
            *) echo "Skipping..." ;;
        esac
        ;;
        
    5)
        echo ""
        echo "Goodbye!"
        exit 0
        ;;
        
    *)
        echo ""
        echo -e "${YELLOW}Invalid choice. Please run the script again.${NC}"
        exit 1
        ;;
esac

echo ""
echo -e "${GREEN}Thank you for using Smart Appointment System!${NC}"
echo ""
