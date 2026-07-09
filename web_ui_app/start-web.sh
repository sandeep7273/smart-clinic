#!/bin/bash
cd "$(dirname "$0")"
echo "Starting Smart Clinic Web App from: $(pwd)"
node_modules/.bin/vite --port 5174
