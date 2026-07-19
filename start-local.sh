#!/bin/bash
# Start all backend services locally

ROOT=/Users/sandeepdhankhar/Desktop/WorkFolder/Learnings/smart-clinic

echo "Starting auth-service on port 4001..."
cd "$ROOT/services/auth-service"
node src/server.js > /tmp/auth-service.log 2>&1 &
AUTH_PID=$!
echo "auth-service PID: $AUTH_PID"

echo "Starting doctor-service on port 4003..."
cd "$ROOT/services/doctor-service"
node src/server.js > /tmp/doctor-service.log 2>&1 &
DOCTOR_PID=$!
echo "doctor-service PID: $DOCTOR_PID"

echo "Starting appointment-service on port 4004..."
cd "$ROOT/services/appointment-service"
node src/server.js > /tmp/appointment-service.log 2>&1 &
APPT_PID=$!
echo "appointment-service PID: $APPT_PID"

echo "Starting ai-service on port 4005..."
cd "$ROOT/services/ai-service"
node src/server.js > /tmp/ai-service.log 2>&1 &
AI_PID=$!
echo "ai-service PID: $AI_PID"

sleep 15

echo "Starting api-gateway on port 3000..."
cd "$ROOT/api-gateway"
node src/index.js > /tmp/api-gateway.log 2>&1 &
GW_PID=$!
echo "api-gateway PID: $GW_PID"

echo ""
echo "All services started. PIDs saved to /tmp/service-pids.txt"
echo "$AUTH_PID $DOCTOR_PID $APPT_PID $AI_PID $GW_PID" > /tmp/service-pids.txt

echo ""
echo "Waiting 8 seconds for services to initialize..."
sleep 8

echo ""
echo "=== Service Health Check ==="
curl -s -o /dev/null -w "auth-service    (4001): %{http_code}\n" http://localhost:4001/health 2>/dev/null || echo "auth-service    (4001): not responding"
curl -s -o /dev/null -w "doctor-service  (4003): %{http_code}\n" http://localhost:4003/health 2>/dev/null || echo "doctor-service  (4003): not responding"
curl -s -o /dev/null -w "appointment-svc (4004): %{http_code}\n" http://localhost:4004/health 2>/dev/null || echo "appointment-svc (4004): not responding"
curl -s -o /dev/null -w "ai-service      (4005): %{http_code}\n" http://localhost:4005/health 2>/dev/null || echo "ai-service      (4005): not responding"
curl -s -o /dev/null -w "api-gateway     (3000): %{http_code}\n" http://localhost:3000/health 2>/dev/null || echo "api-gateway     (3000): not responding"

echo ""
echo "Log files:"
echo "  /tmp/auth-service.log"
echo "  /tmp/doctor-service.log"
echo "  /tmp/appointment-service.log"
echo "  /tmp/ai-service.log"
echo "  /tmp/api-gateway.log"
