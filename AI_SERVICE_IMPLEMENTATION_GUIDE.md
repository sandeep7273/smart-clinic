# AI Chat Assistant Implementation Guide

## 📋 Overview

This guide provides complete setup and implementation instructions for the AI Chat Assistant service in the Smart Appointment System. The AI assistant helps users by:

- Understanding health queries and symptoms
- Recommending appropriate medical specialists
- Searching for doctors based on specialization
- Viewing and managing appointments
- Providing conversational guidance

## 🏗️ Architecture

```
Mobile App (React Native)
    ↓ GraphQL
API Gateway
    ↓ GraphQL (Schema Stitching)
AI Service
    ├── OpenAI GPT-4 (Intent Detection & Response Generation)
    ├── ChromaDB (Medical Knowledge - RAG)
    ├── Redis (Conversation Context & Caching)
    ├── gRPC Client → Doctor Service
    └── gRPC Client → Appointment Service
```

## 🚀 Setup Instructions

### 1. Prerequisites

Before starting, ensure you have:

- ✅ Node.js 18+
- ✅ MongoDB running
- ✅ Redis running
- ✅ OpenAI API key
- ✅ Doctor service running (port 4003) with gRPC (port 50051)
- ✅ Appointment service running (port 4004)
- ✅ Auth service running (port 4001)

### 2. Install AI Service Dependencies

```bash
cd services/ai-service
npm install
```

### 3. Configure Environment Variables

Create `.env` file from `.env.example`:

```env
# Server
PORT=4005
NODE_ENV=development

# MongoDB
MONGODB_URI=mongodb://localhost:27017/ai_db

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# OpenAI - REQUIRED
OPENAI_API_KEY=sk-your-api-key-here
OPENAI_MODEL=gpt-4
OPENAI_EMBEDDING_MODEL=text-embedding-3-small

# Doctor Service gRPC
DOCTOR_SERVICE_GRPC_HOST=localhost
DOCTOR_SERVICE_GRPC_PORT=50051

# Auth Service
GW_AUTH_SERVICE_URL=http://localhost:4001
```

**⚠️ IMPORTANT**: You must obtain an OpenAI API key from [https://platform.openai.com/api-keys](https://platform.openai.com/api-keys)

### 4. Setup ChromaDB (Optional - for RAG)

ChromaDB provides enhanced medical knowledge retrieval:

```bash
# Install ChromaDB
pip install chromadb chromadb-client

# Run ChromaDB server
chroma run --host localhost --port 8000
```

Then seed the medical knowledge base:

```bash
cd services/ai-service
npm run seed:embeddings
```

### 5. Start AI Service

```bash
# Development mode
npm run dev

# Production mode
npm start
```

The service will be available at: `http://localhost:4005`

### 6. Configure API Gateway

Update API Gateway `.env`:

```env
AI_SERVICE_URL=http://localhost:4005
```

The API Gateway automatically discovers and integrates the AI service GraphQL schema.

### 7. Mobile App Integration

The mobile app is already configured! Just:

1. Ensure the API Gateway is running
2. Launch the mobile app
3. Navigate to Dashboard → AI Assistant

## 📱 Using the AI Assistant

### From Mobile App

1. **Launch App** → Login with your credentials
2. **Dashboard** → Tap "AI Assistant" card
3. **Chat Interface** → Type your query

**Example Queries:**

```
"I have chest pain"
→ Recommends Cardiologist + "Search Doctors" button

"Show my appointments"
→ Lists appointments + "View Appointments" button

"I need a skin doctor"
→ Finds Dermatologists + navigation option

"I have a headache and fever"
→ Analyzes symptoms and suggests specialist
```

### Response Actions

The AI provides actionable buttons:

| Action Button        | Function                                      |
| -------------------- | --------------------------------------------- |
| 🔍 Search Doctors    | Navigate to doctor search with specialization |
| 📅 View Appointments | Navigate to appointments list                 |
| 📝 Book Appointment  | Navigate to doctor search for booking         |

## 🧪 Testing with GraphQL Playground

Access: `http://localhost:4005/graphql`

### Test Query 1: Send Chat Message

```graphql
mutation {
  sendChatMessage(userId: "your-user-id", message: "I have chest pain") {
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

### Test Query 2: Get Conversation History

```graphql
query {
  getConversationContext(userId: "your-user-id") {
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

### Test Query 3: Clear Context

```graphql
mutation {
  clearConversationContext(userId: "your-user-id") {
    success
    message
  }
}
```

## 🔑 Key Features

### 1. Intent Detection

The AI automatically detects user intent:

- **HEALTH_QUERY**: Health condition questions
- **SEARCH_DOCTOR**: Looking for specialists
- **SHOW_APPOINTMENTS**: View appointments
- **BOOK_APPOINTMENT**: Booking requests
- **CANCEL_APPOINTMENT**: Cancellation requests

### 2. Entity Extraction

Extracts structured data:

- Medical specializations (Cardiologist, Dermatologist, etc.)
- Symptoms
- Date preferences
- Location preferences

### 3. Context-Aware Conversations

Redis stores conversation history (last 10 messages) with 1-hour TTL, enabling:

- Multi-turn conversations
- Context retention
- Follow-up questions

### 4. Caching Strategy

Smart caching for performance:

```
doctor:search:{specialization} → 5 minutes
appointments:user:{userId} → 3 minutes
chat:context:{userId} → 1 hour
```

### 5. Medical Disclaimer

Automatically includes disclaimers for health queries:

> "This is not a substitute for professional medical advice."

## 🎯 Intent to Action Mapping

| User Query             | Detected Intent   | Action Type       | Navigation                |
| ---------------------- | ----------------- | ----------------- | ------------------------- |
| "I have chest pain"    | HEALTH_QUERY      | SEARCH_DOCTOR     | DoctorList (Cardiologist) |
| "Find a cardiologist"  | SEARCH_DOCTOR     | SEARCH_DOCTOR     | DoctorList (Cardiologist) |
| "Show my appointments" | SHOW_APPOINTMENTS | SHOW_APPOINTMENTS | AppointmentList           |
| "Book an appointment"  | BOOK_APPOINTMENT  | SEARCH_DOCTOR     | DoctorList                |

## 🔧 Component Architecture

### AI Service Components

```
ai-service/
├── src/
│   ├── config/
│   │   ├── index.js           # Configuration
│   │   └── redis.js           # Redis client with caching
│   ├── services/
│   │   ├── chatService.js     # Main orchestrator
│   │   ├── intentDetectionService.js  # Intent + entities
│   │   └── ragService.js      # Vector DB + embeddings
│   ├── grpc/
│   │   ├── doctorClient.js    # gRPC → Doctor Service
│   │   └── appointmentClient.js # gRPC → Appointment Service
│   ├── graphql/
│   │   ├── typeDefs.js        # GraphQL schema
│   │   └── resolvers.js       # Query/Mutation resolvers
│   └── middleware/
│       └── auth.js            # JWT validation
```

### Mobile App Components

```
mobile_ui_app/src/
├── api/
│   └── ai.api.ts              # AI GraphQL client
├── screens/
│   └── AISearch/
│       ├── AISearchScreen.tsx # Chat interface
│       └── index.ts
└── navigation/
    └── MainNavigator.tsx      # Route registration
```

## 🐛 Troubleshooting

### Issue: "OpenAI API Error"

**Solution**: Verify your API key:

```bash
echo $OPENAI_API_KEY
```

Check rate limits: [https://platform.openai.com/account/limits](https://platform.openai.com/account/limits)

### Issue: "Doctor service unavailable"

**Solution**: Ensure doctor-service gRPC is running:

```bash
# Check doctor service logs
cd services/doctor-service
npm run dev
```

Verify gRPC port 50051 is accessible.

### Issue: "ChromaDB connection failed"

**Solution**: ChromaDB is optional. Service works without it, but with reduced medical knowledge.

To enable:

```bash
chroma run --host localhost --port 8000
npm run seed:embeddings
```

### Issue: "Redis connection error"

**Solution**: Start Redis:

```bash
# macOS
brew services start redis

# Linux
sudo systemctl start redis

# Docker
docker run -d -p 6379:6379 redis
```

### Issue: "No response from AI"

**Solution**: Check service logs:

```bash
tail -f services/ai-service/logs/combined.log
```

Verify all dependencies are running:

```bash
# Check health endpoints
curl http://localhost:4001/health  # Auth service
curl http://localhost:4003/health  # Doctor service
curl http://localhost:4005/health  # AI service
curl http://localhost:3000/health  # API Gateway
```

## 📊 Monitoring

### Health Check

```bash
curl http://localhost:4005/health
```

Response:

```json
{
  "status": "healthy",
  "service": "ai-service",
  "timestamp": "2026-02-15T10:30:00.000Z"
}
```

### Logs

```bash
# View all logs
tail -f services/ai-service/logs/combined.log

# View errors only
tail -f services/ai-service/logs/error.log
```

### Redis Cache Inspection

```bash
redis-cli

# List all AI service keys
KEYS chat:*
KEYS doctor:search:*
KEYS appointments:user:*

# View specific conversation
GET chat:context:user123
```

## 🔒 Security

### Authentication

All GraphQL requests require JWT authentication:

```
Authorization: Bearer <token>
```

### User Isolation

Users can only:

- Send messages as themselves
- Access their own conversation history
- Clear their own context

### Token Validation

AI service validates tokens with auth-service on every request.

## 🎨 Customization

### Add New Intent Types

Edit `services/ai-service/src/services/intentDetectionService.js`:

```javascript
this.INTENTS = {
  HEALTH_QUERY: "HEALTH_QUERY",
  SEARCH_DOCTOR: "SEARCH_DOCTOR",
  SHOW_APPOINTMENTS: "SHOW_APPOINTMENTS",
  YOUR_NEW_INTENT: "YOUR_NEW_INTENT", // Add here
  // ...
};
```

### Add Medical Knowledge

Edit `services/ai-service/src/scripts/seedEmbeddings.js`:

```javascript
const medicalDocuments = [
  {
    text: "Your medical knowledge here...",
    metadata: { category: "specialty", severity: "medium" },
  },
  // Add more documents
];
```

Then run: `npm run seed:embeddings`

### Customize Specialization Mapping

Edit `services/ai-service/src/services/intentDetectionService.js`:

```javascript
this.specializationMap = {
  heart: "Cardiologist",
  "your-keyword": "Your-Specialist",
  // Add more mappings
};
```

## 📈 Performance Optimization

### Caching Configuration

Adjust TTL values in `.env`:

```env
CACHE_TTL_DOCTOR_SEARCH=300    # 5 minutes
CACHE_TTL_APPOINTMENT=180      # 3 minutes
CONTEXT_TTL=3600              # 1 hour
```

### Rate Limiting

Configure in `.env`:

```env
RATE_LIMIT_WINDOW=60000       # 1 minute
RATE_LIMIT_MAX_REQUESTS=100   # Max requests per window
```

### OpenAI Settings

Optimize response generation:

```env
OPENAI_MAX_TOKENS=1000        # Limit response length
OPENAI_TEMPERATURE=0.7        # Creativity (0-1)
```

## 🚦 Service Status

Check all services are running:

| Service             | Port     | Health Check                     |
| ------------------- | -------- | -------------------------------- |
| Auth Service        | 4001     | http://localhost:4001/health     |
| Doctor Service      | 4003     | http://localhost:4003/health     |
| Appointment Service | 4004     | http://localhost:4004/health     |
| **AI Service**      | **4005** | **http://localhost:4005/health** |
| API Gateway         | 3000     | http://localhost:3000/health     |

## 📚 API Reference

### GraphQL Mutations

#### sendChatMessage

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
      date
      location
    }
    message
  }
}
```

#### clearConversationContext

```graphql
mutation ClearConversationContext($userId: ID!) {
  clearConversationContext(userId: $userId) {
    success
    message
  }
}
```

### GraphQL Queries

#### getConversationContext

```graphql
query GetConversationContext($userId: ID!) {
  getConversationContext(userId: $userId) {
    userId
    messages {
      id
      role
      content
      timestamp
    }
    messageCount
  }
}
```

## 🎓 Best Practices

1. **Always validate OpenAI API key** before deployment
2. **Monitor OpenAI usage** to manage costs
3. **Cache aggressively** to reduce API calls
4. **Set appropriate TTLs** based on data freshness needs
5. **Include medical disclaimers** for health-related responses
6. **Log all AI interactions** for debugging and improvement
7. **Implement rate limiting** to prevent abuse
8. **Use gRPC** for internal service communication
9. **Seed vector DB** with quality medical knowledge
10. **Test conversations** across multiple turns

## 🔮 Future Enhancements

- [ ] Multi-language support
- [ ] Voice input/output
- [ ] Direct appointment booking via chat
- [ ] Image-based symptom analysis
- [ ] Integration with external medical databases
- [ ] Sentiment analysis
- [ ] Proactive health reminders
- [ ] Doctor availability real-time updates

## 📞 Support

For issues or questions:

1. Check the [AI Service README](services/ai-service/README.md)
2. Review logs: `services/ai-service/logs/`
3. Verify all prerequisites are met
4. Check OpenAI API status: [https://status.openai.com/](https://status.openai.com/)

## ✅ Checklist

Before launching:

- [ ] OpenAI API key configured
- [ ] All services running (auth, doctor, appointment, ai)
- [ ] Redis running and accessible
- [ ] MongoDB running
- [ ] API Gateway configured with ai-service URL
- [ ] ChromaDB seeded (optional but recommended)
- [ ] Health checks passing for all services
- [ ] Mobile app can reach API Gateway
- [ ] Test chat conversation works end-to-end

## 🎉 Success!

If you can:

1. ✅ Open AI Assistant in mobile app
2. ✅ Send a message about symptoms
3. ✅ Get an AI response with action button
4. ✅ Click "Search Doctors" and navigate successfully

**Congratulations!** Your AI Chat Assistant is fully operational! 🚀
