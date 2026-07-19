# AI Chat Assistant Service

AI-powered chat assistant for the Smart Appointment System with intent detection, RAG (Retrieval Augmented Generation), and context-aware responses.

## 🎯 Features

- **Intent Detection**: Automatically identifies user intent (health queries, doctor search, appointments)
- **RAG System**: Uses vector database for medical knowledge retrieval
- **Context Memory**: Maintains conversation history using Redis
- **gRPC Integration**: Communicates with doctor-service and appointment-service
- **Structured Responses**: Returns actionable responses with navigation hints
- **Medical Disclaimer**: Automatically includes appropriate disclaimers

## 📋 Architecture

```
User Query
    ↓
Intent Detection (OpenAI GPT-4)
    ↓
Entity Extraction
    ↓
RAG Search (ChromaDB)
    ↓
gRPC Service Calls (Doctor/Appointment Services)
    ↓
Structured Response with Action Buttons
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- MongoDB
- Redis
- ChromaDB (optional, for RAG)
- OpenAI API Key
- Doctor Service running with gRPC
- Appointment Service (optional)

### Installation

```bash
# Navigate to ai-service directory
cd services/ai-service

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Update .env with your configurations
# IMPORTANT: Add your OPENAI_API_KEY
```

### Environment Configuration

Edit `.env` file:

```env
OPENAI_API_KEY=your_openai_api_key_here
DOCTOR_SERVICE_GRPC_HOST=localhost
DOCTOR_SERVICE_GRPC_PORT=50051
```

### Running the Service

```bash
# Development mode
npm run dev

# Production mode
npm start
```

The service will start on port **4005** by default.

## 📊 GraphQL API

### Endpoint
```
http://localhost:4005/graphql
```

### Mutations

#### 1. Send Chat Message

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
    }
  }
}
```

**Example Request:**
```json
{
  "userId": "user123",
  "message": "I have chest pain"
}
```

**Example Response:**
```json
{
  "data": {
    "sendChatMessage": {
      "success": true,
      "data": {
        "message": "Chest pain can be serious. I recommend consulting a Cardiologist. Would you like to search for available Cardiologists?",
        "actionType": "SEARCH_DOCTOR",
        "payload": {
          "specialization": "Cardiologist"
        },
        "disclaimer": "This is not a substitute for professional medical advice."
      },
      "intent": "HEALTH_QUERY",
      "entities": {
        "specialization": "Cardiologist",
        "symptoms": ["chest pain"]
      }
    }
  }
}
```

#### 2. Clear Conversation Context

```graphql
mutation ClearContext($userId: ID!) {
  clearConversationContext(userId: $userId) {
    success
    message
  }
}
```

### Queries

#### Get Conversation Context

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

## 🎭 Intent Types

| Intent | Description | Action Type |
|--------|-------------|-------------|
| `HEALTH_QUERY` | Health condition questions | `SEARCH_DOCTOR` or `NONE` |
| `SEARCH_DOCTOR` | Looking for a specialist | `SEARCH_DOCTOR` |
| `SHOW_APPOINTMENTS` | View appointments | `SHOW_APPOINTMENTS` |
| `BOOK_APPOINTMENT` | Book an appointment | `SEARCH_DOCTOR` |
| `CANCEL_APPOINTMENT` | Cancel appointment | `SHOW_APPOINTMENTS` |
| `UNKNOWN` | Cannot determine intent | `NONE` |

## 🔧 Action Types

Frontend should handle these action types:

- **`NONE`**: Just display the message
- **`SEARCH_DOCTOR`**: Show "Search Doctors" button → Navigate to doctor search
- **`SHOW_APPOINTMENTS`**: Show "View Appointments" button → Navigate to appointments
- **`BOOK_APPOINTMENT`**: Navigate to booking flow

## 🗄️ Redis Keys

The service uses Redis for caching and context:

```
chat:context:{userId}           - Conversation history
doctor:search:{specialization}  - Cached doctor search results
appointments:user:{userId}      - Cached user appointments
```

## 🤖 RAG System

### Setup ChromaDB (Optional)

```bash
# Install ChromaDB
pip install chromadb

# Run ChromaDB server
chroma run --host localhost --port 8000
```

### Seed Medical Knowledge

```bash
npm run seed:embeddings
```

This populates the vector database with medical knowledge for better responses.

## 📡 gRPC Clients

### Doctor Service Client

Connects to `doctor-service` gRPC server for:
- Getting doctor details
- Searching doctors by specialization
- Checking availability

### Appointment Service Client

Connects to `appointment-service` for:
- Getting user appointments
- Getting appointment details

## 🧪 Testing

### Health Check

```bash
curl http://localhost:4005/health
```

### GraphQL Playground

Visit: `http://localhost:4005/graphql`

### Example Queries

**Health Query:**
```
"I have a skin rash"
→ Recommends Dermatologist
```

**Search Doctor:**
```
"I need a heart doctor"
→ Searches for Cardiologists
```

**View Appointments:**
```
"Show my appointments"
→ Returns appointment list with count
```

## 🔒 Authentication

All GraphQL requests require authentication:

```
Authorization: Bearer <jwt_token>
```

The service validates tokens with the auth-service.

## 📝 Logging

Logs are written to:
- `logs/combined.log` - All logs
- `logs/error.log` - Error logs only
- Console (in development)

## 🏗️ Project Structure

```
ai-service/
├── src/
│   ├── config/
│   │   ├── index.js          # Configuration
│   │   └── redis.js          # Redis client
│   ├── grpc/
│   │   ├── doctorClient.js   # Doctor service gRPC client
│   │   └── appointmentClient.js
│   ├── services/
│   │   ├── chatService.js    # Main chat orchestration
│   │   ├── intentDetectionService.js
│   │   └── ragService.js     # RAG with vector DB
│   ├── graphql/
│   │   ├── typeDefs.js       # GraphQL schema
│   │   └── resolvers.js      # GraphQL resolvers
│   ├── middleware/
│   │   └── auth.js           # Authentication
│   ├── scripts/
│   │   └── seedEmbeddings.js # Seed vector DB
│   ├── utils/
│   │   └── logger.js         # Winston logger
│   └── server.js             # Main server
├── proto/
│   ├── doctor.proto
│   └── appointment.proto
├── logs/
├── package.json
└── README.md
```

## 🚨 Troubleshooting

### ChromaDB Connection Issues

If ChromaDB is not available, the service will continue to work without RAG:

```
[WARN] ChromaDB not available, RAG will be disabled
```

### gRPC Connection Issues

Ensure doctor-service is running with gRPC enabled on port 50051.

### OpenAI API Errors

Check your API key and rate limits:
```
OPENAI_API_KEY=your_valid_api_key
```

## 🔮 Future Enhancements

- [ ] Multi-language support
- [ ] Voice input/output
- [ ] Appointment booking via chat
- [ ] Integration with more medical knowledge bases
- [ ] Sentiment analysis
- [ ] Session management

## 📚 Dependencies

- `openai` - OpenAI GPT integration
- `chromadb` - Vector database for RAG
- `ioredis` - Redis client for caching
- `@grpc/grpc-js` - gRPC client
- `apollo-server-express` - GraphQL server
- `langchain` - LLM orchestration framework

## 📄 License

ISC
