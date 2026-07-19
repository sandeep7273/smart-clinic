# 🤖 AI Chat Assistant - Quick Reference

## ✅ What Has Been Implemented

### 1. AI Service (Backend)
**Location**: `services/ai-service/`

**Components**:
- ✅ Intent detection using OpenAI GPT-4
- ✅ Entity extraction (symptoms, specializations, dates)
- ✅ RAG (Retrieval Augmented Generation) with ChromaDB
- ✅ Redis caching and conversation context memory
- ✅ gRPC clients for Doctor and Appointment services
- ✅ GraphQL API with authentication
- ✅ Medical knowledge seeding script

**Key Files**:
```
services/ai-service/
├── src/
│   ├── server.js                          # Main server
│   ├── config/index.js                    # Configuration
│   ├── config/redis.js                    # Redis client
│   ├── services/
│   │   ├── chatService.js                 # Main chat logic
│   │   ├── intentDetectionService.js      # Intent detection
│   │   └── ragService.js                  # Vector DB + RAG
│   ├── grpc/
│   │   ├── doctorClient.js                # Doctor service client
│   │   └── appointmentClient.js           # Appointment client
│   ├── graphql/
│   │   ├── typeDefs.js                    # GraphQL schema
│   │   └── resolvers.js                   # GraphQL resolvers
│   └── scripts/
│       └── seedEmbeddings.js              # Seed medical knowledge
├── proto/
│   ├── doctor.proto                       # Doctor gRPC contract
│   └── appointment.proto                  # Appointment gRPC contract
├── package.json
├── .env.example
└── README.md
```

### 2. API Gateway Integration
**Location**: `api-gateway/src/graphql/`

**Added**:
- ✅ AI Service proxy (`aiServiceProxy.js`)
- ✅ Schema stitching integration
- ✅ Service discovery and health checks
- ✅ Configuration updated

**Modified Files**:
- `api-gateway/src/graphql/aiServiceProxy.js` (NEW)
- `api-gateway/src/graphql/simpleFederation.js` (UPDATED)
- `api-gateway/src/config/index.js` (UPDATED)
- `api-gateway/.env.example` (UPDATED)

### 3. Mobile App Integration
**Location**: `mobile_ui_app/src/`

**Added**:
- ✅ AI Chat API client (`src/api/ai.api.ts`)
- ✅ AI Search Screen with chat interface (`src/screens/AISearch/`)
- ✅ Navigation integration
- ✅ Dashboard navigation button

**Key Files**:
```
mobile_ui_app/src/
├── api/
│   └── ai.api.ts                          # AI GraphQL queries
├── screens/
│   ├── AISearch/
│   │   ├── AISearchScreen.tsx             # Chat UI
│   │   └── index.ts
│   └── Dashboard/
│       └── DashboardScreen.tsx            # Updated with AI button
└── navigation/
    ├── MainNavigator.tsx                  # Route added
    └── types.ts                           # Types defined
```

### 4. Documentation
- ✅ Comprehensive implementation guide
- ✅ AI Service README
- ✅ Quick start script
- ✅ Architecture documentation

## 🚀 Quick Start

### Start All Services

```bash
# Terminal 1: Auth Service
cd services/auth-service
npm run dev

# Terminal 2: Doctor Service
cd services/doctor-service
npm run dev

# Terminal 3: AI Service
cd services/ai-service
cp .env.example .env
# Edit .env and add your OPENAI_API_KEY
npm install
npm run dev

# Terminal 4: API Gateway
cd api-gateway
npm run dev

# Terminal 5: Mobile App
cd mobile_ui_app
npm start
```

### Or use the convenience script:
```bash
./start-ai-service.sh
```

## 📊 Service Ports

| Service | Port | Protocol | Endpoint |
|---------|------|----------|----------|
| Auth Service | 4001 | HTTP | http://localhost:4001 |
| Doctor Service | 4003 | HTTP | http://localhost:4003 |
| Doctor gRPC | 50051 | gRPC | localhost:50051 |
| AI Service | 4005 | HTTP/GraphQL | http://localhost:4005 |
| API Gateway | 3000 | HTTP/GraphQL | http://localhost:3000 |
| Mobile App | 19006 | HTTP | http://localhost:19006 |

## 🎯 User Flow

```
1. User opens mobile app
2. Logs in
3. Dashboard screen shows "AI Assistant" card
4. Taps AI Assistant
5. AI Chat screen opens
6. User types: "I have chest pain"
7. AI responds:
   - Message: "You should consult a Cardiologist..."
   - Disclaimer: "This is not medical advice..."
   - Button: "🔍 Search Doctors"
8. User taps button
9. Navigates to Doctor List filtered by Cardiologist
```

## 💬 Example Conversations

### Health Query
```
User: "I have chest pain and shortness of breath"

AI: "Chest pain with shortness of breath can be serious. I recommend 
consulting a Cardiologist as soon as possible. Would you like to 
search for available Cardiologists?

⚠️ This is not a substitute for professional medical advice.

[🔍 Search Doctors] ← Button to navigate"
```

### Search Doctor
```
User: "Find me a skin doctor"

AI: "I found 5 Dermatologists available. Would you like to view them?

[🔍 Search Doctors] ← Button to navigate"
```

### Show Appointments
```
User: "Show my appointments"

AI: "You have 2 appointments scheduled. Would you like to view them?

[📅 View Appointments] ← Button to navigate"
```

## 🔑 Key Features

### Intent Detection
Automatically detects:
- HEALTH_QUERY - Health questions
- SEARCH_DOCTOR - Finding specialists
- SHOW_APPOINTMENTS - View appointments
- BOOK_APPOINTMENT - Booking requests
- CANCEL_APPOINTMENT - Cancellations

### Entity Extraction
Extracts:
- Medical specializations (Cardiologist, Dermatologist, etc.)
- Symptoms
- Date preferences
- Location preferences

### Action Buttons
Based on intent, shows:
- 🔍 Search Doctors → Navigate to DoctorList
- 📅 View Appointments → Navigate to AppointmentList
- 📝 Book Appointment → Navigate to DoctorList

### Context Memory
- Stores last 10 messages
- 1-hour TTL in Redis
- Enables multi-turn conversations

### Caching
- Doctor searches: 5 minutes
- Appointments: 3 minutes
- Context: 1 hour

## 📱 Mobile UI Features

- Real-time chat interface
- Message bubbles (user vs AI)
- Action buttons for navigation
- Medical disclaimers
- Typing indicator
- Scroll to latest message
- Clear conversation option
- Conversation history loading

## 🛠️ Configuration

### Required Environment Variables

**AI Service** (`services/ai-service/.env`):
```env
OPENAI_API_KEY=sk-your-key-here     # REQUIRED
PORT=4005
MONGODB_URI=mongodb://localhost:27017/ai_db
REDIS_HOST=localhost
REDIS_PORT=6379
DOCTOR_SERVICE_GRPC_HOST=localhost
DOCTOR_SERVICE_GRPC_PORT=50051
```

**API Gateway** (`.env`):
```env
AI_SERVICE_URL=http://localhost:4005
```

## 🧪 Testing

### 1. GraphQL Playground
Visit: http://localhost:4005/graphql

```graphql
mutation {
  sendChatMessage(
    userId: "test-user-id"
    message: "I have a headache"
  ) {
    success
    data {
      message
      actionType
      payload
    }
    intent
  }
}
```

### 2. Mobile App
1. Launch app
2. Login
3. Dashboard → AI Assistant
4. Type message
5. Verify response and action button

### 3. Health Checks
```bash
curl http://localhost:4005/health
curl http://localhost:3000/health
```

## 📊 GraphQL API

### Mutations

**sendChatMessage**
```graphql
mutation SendChatMessage($userId: ID!, $message: String!) {
  sendChatMessage(userId: $userId, message: $message) {
    success
    data {
      message
      actionType
      payload
      disclaimer
    }
    intent
    entities {
      specialization
      symptoms
    }
  }
}
```

**clearConversationContext**
```graphql
mutation ClearContext($userId: ID!) {
  clearConversationContext(userId: $userId) {
    success
    message
  }
}
```

### Queries

**getConversationContext**
```graphql
query GetContext($userId: ID!) {
  getConversationContext(userId: $userId) {
    userId
    messages {
      role
      content
      timestamp
    }
    messageCount
  }
}
```

## 🐛 Common Issues

### "OpenAI API Error"
- Check API key in `.env`
- Verify API key at https://platform.openai.com/api-keys
- Check rate limits

### "Doctor service unavailable"
- Ensure doctor-service is running on port 4003
- Verify gRPC is running on port 50051

### "Redis connection error"
- Start Redis: `brew services start redis` (macOS)
- Check with: `redis-cli ping`

### "No AI response"
- Check logs: `services/ai-service/logs/combined.log`
- Verify all services are running
- Check health endpoints

## 📚 Documentation Files

1. **AI_SERVICE_IMPLEMENTATION_GUIDE.md** - Complete setup guide
2. **services/ai-service/README.md** - AI service documentation
3. **Smart_Appointment_System_AI_Architecture.md** - Architecture overview
4. **This file** - Quick reference

## ✅ Verification Checklist

Before using:
- [ ] OpenAI API key configured
- [ ] All services running (auth, doctor, ai, gateway)
- [ ] Redis running
- [ ] MongoDB running
- [ ] Health checks passing
- [ ] Mobile app can connect to gateway
- [ ] Can send chat message successfully
- [ ] Action buttons work
- [ ] Navigation works from AI chat

## 🎓 Next Steps

1. **Get OpenAI API Key**
   - Visit: https://platform.openai.com/api-keys
   - Create new key
   - Add to `services/ai-service/.env`

2. **Start Services**
   - Use `./start-ai-service.sh` or start manually
   - Verify health checks

3. **Test Mobile App**
   - Launch app
   - Navigate to AI Assistant
   - Send test message

4. **Optional: Setup ChromaDB**
   - Install: `pip install chromadb`
   - Run: `chroma run --host localhost --port 8000`
   - Seed: `npm run seed:embeddings`

## 🎉 Success Indicators

You'll know it's working when:
- ✅ AI Service health check responds
- ✅ Mobile app loads AI chat screen
- ✅ Can send message and get AI response
- ✅ Action buttons appear in responses
- ✅ Clicking buttons navigates correctly
- ✅ Conversation context is maintained

## 📞 Need Help?

Check these in order:
1. Service logs: `services/ai-service/logs/`
2. Health endpoints: `curl http://localhost:4005/health`
3. GraphQL playground: http://localhost:4005/graphql
4. Implementation guide: `AI_SERVICE_IMPLEMENTATION_GUIDE.md`

---

**🚀 You're all set! The AI Chat Assistant is ready to use!**
