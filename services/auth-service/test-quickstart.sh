#!/bin/bash

# Auth Service - Test Quick Start Script
# Run this script to quickly verify your test setup

echo "=================================================="
echo "Auth Service - Testing Quick Start"
echo "=================================================="
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the auth-service directory"
    exit 1
fi

echo "✅ Running from auth-service directory"
echo ""

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
else
    echo "✅ Dependencies already installed"
fi
echo ""

# Clear Jest cache
echo "🧹 Clearing Jest cache..."
npx jest --clearCache
echo ""

# Run utility tests (fast, should all pass)
echo "=================================================="
echo "Running Utility Tests (Password & JWT)"
echo "=================================================="
echo ""
npm test -- --testPathPattern="utils" --no-coverage
echo ""

# Show test files
echo "=================================================="
echo "Test Files Created:"
echo "=================================================="
find tests -name "*.test.js" | sort
echo ""

# Show test scripts
echo "=================================================="
echo "Available Test Scripts:"
echo "=================================================="
echo "  npm test                  # Run all tests with coverage"
echo "  npm run test:watch        # Watch mode (auto-rerun)"
echo "  npm run test:unit         # Unit tests only"
echo "  npm run test:integration  # Integration tests only"
echo "  npm run test:ci           # CI mode"
echo ""
echo "  npm test -- --testPathPattern='password'  # Password tests only"
echo "  npm test -- --testPathPattern='jwt'       # JWT tests only"
echo "  npm test -- --testPathPattern='utils'     # All utility tests"
echo "  npm test -- --no-coverage                 # Skip coverage (faster)"
echo ""

echo "=================================================="
echo "Documentation:"
echo "=================================================="
echo "  TESTING.md              # Comprehensive testing guide"
echo "  TEST_SETUP_SUMMARY.md   # Setup summary"
echo "  tests/README.md         # Test directory guide"
echo ""

echo "=================================================="
echo "✅ Test Setup Complete!"
echo "=================================================="
echo ""
echo "Next Steps:"
echo "  1. Run: npm test"
echo "  2. View coverage: open coverage/index.html"
echo "  3. Read: cat TESTING.md"
echo ""
