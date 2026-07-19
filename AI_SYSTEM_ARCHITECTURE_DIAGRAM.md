# 🎨 AI Chat Assistant - System Architecture

## 📊 Complete System Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Mobile App (React Native)                    │
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                     AI Search Screen                          │  │
│  │  ┌───────────────────────────────────────────────────────┐  │  │
│  │  │  Chat Interface                                        │  │  │
│  │  │  • User types message                                 │  │  │
│  │  │  • AI responds with structured response               │  │  │
│  │  │  • Action buttons appear (Search/View/Book)           │  │  │
│  │  │  • Navigation on button click                         │  │  │
│  │  └───────────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────────┘  │
└───────────────────────────────┬─────────────────────────────────────┘
                                │ GraphQL over HTTP
                                │ (JWT Authentication)
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         API Gateway (Port 3000)                      │
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │              GraphQL Schema Stitching                        │  │
│  │  • Discovers available services                             │  │
│  │  • Stitches schemas together                                │  │
│  │  • Proxies requests to appropriate service                  │  │
│  │  • Handles authentication                                   │  │
│  └──────────────────────────────────────────────────────────────┘  │
└──────────┬──────────────┬──────────────┬─────────────────────────────┘
           │              │              │
           │ GraphQL      │ GraphQL      │ GraphQL
           ▼              ▼              ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────────────────────┐
│ Auth Service │  │Doctor Service│  │     AI Service (Port 4005)   │
│  Port 4001   │  │  Port 4003   │  │                              │
└──────────────┘  └──────┬───────┘  │  ┌────────────────────────┐  │
                         │          │  │   GraphQL Server       │  │
                         │ gRPC     │  │   • sendChatMessage    │  │
                         │ :50051   │  │   • getContext         │  │
                         │          │  │   • clearContext       │  │
                         │          │  └────────┬───────────────┘  │
                         └──────────┼───────────┘                  │
                                    │                              │
                    ┌───────────────┴───────────────┐             │
                    │                                │             │
                    ▼                                ▼             │
         ┌──────────────────────┐       ┌───────────────────────┐│
         │   Chat Service       │       │  Intent Detection     ││
         │   • Orchestrates     │       │  • OpenAI GPT-4       ││
         │   • Routes intents   │       │  • Entity extraction  ││
         │   • Calls services   │       │  • Confidence scoring ││
         └──────────┬───────────┘       └───────────────────────┘│
                    │                                             │
         ┌──────────┼────────────────────────────────┐           │
         │          │                                 │           │
         ▼          ▼                                 ▼           │
  ┌──────────┐ ┌─────────────┐            ┌──────────────────┐  │
  │  Redis   │ │  RAG Service│            │  gRPC Clients    │  │
  │  Cache   │ │  • ChromaDB │            │  • Doctor        │  │
  │  Context │ │  • Embeddings│           │  • Appointment   │  │
  └──────────┘ │  • Vector DB │           └──────────────────┘  │
               └─────────────┘                                   │
└──────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                         Data Layer                                   │
│                                                                       │
│  ┌────────────┐    ┌────────────┐    ┌────────────┐                │
│  │  MongoDB   │    │   Redis    │    │  ChromaDB  │                │
│  │  • AI DB   │    │  • Cache   │    │  • Medical │                │
│  │  • Logs    │    │  • Context │    │    Knowledge│               │
│  └────────────┘    └────────────┘    └────────────┘                │
└─────────────────────────────────────────────────────────────────────┘
```

## 🔄 Request Flow

### 1. User Sends Message

```
Mobile App → API Gateway → AI Service → Intent Detection
                                      ↓
                                  [OpenAI GPT-4]
                                      ↓
                          ┌───────────┴──────────┐
                          │                      │
                    Entity Extraction     Intent Classification
                          │                      │
                    • Specialization      • HEALTH_QUERY
                    • Symptoms           • SEARCH_DOCTOR
                    • Date               • SHOW_APPOINTMENTS
                          │                      │
                          └───────────┬──────────┘
                                      ▼
                              Chat Service Processing
                                      │
                    ┌─────────────────┼─────────────────┐
                    │                 │                 │
                    ▼                 ▼                 ▼
            Check Cache      RAG Search        Call Services
            [Redis]          [ChromaDB]        [gRPC]
                    │                 │                 │
                    └─────────────────┼─────────────────┘
                                      ▼
                          Generate Structured Response
                                      │
                    ┌─────────────────┴─────────────────┐
                    │                                    │
                Text Response                    Action Button
                + Disclaimer                     + Payload
                    │                                    │
                    └─────────────────┬──────────────────┘
                                      ▼
                          Store in Context [Redis]
                                      │
                                      ▼
                          Return to Mobile App
                                      │
                                      ▼
                          Display + Action Button
```

### 2. Action Button Click

```
User Clicks Button
        │
        ▼
Based on actionType
        │
    ┌───┴────┬──────────────────┐
    │        │                  │
    ▼        ▼                  ▼
SEARCH   SHOW_APPOINTMENTS   BOOK
DOCTOR                       APPOINTMENT
    │        │                  │
    ▼        ▼                  ▼
Navigate  Navigate          Navigate to
to        to                Doctor Search
DoctorList AppointmentList  with specialty
```

## 📦 Component Architecture

### AI Service Internal Flow

```
┌─────────────────────────────────────────────────────────────┐
│                      AI Service                              │
│                                                              │
│  Entry Point: server.js                                     │
│       │                                                      │
│       ├── Initialize MongoDB                                │
│       ├── Initialize Redis                                  │
│       ├── Initialize gRPC Clients                           │
│       ├── Initialize RAG Service                            │
│       └── Start Apollo Server                               │
│                    │                                         │
│                    ▼                                         │
│         GraphQL Layer (typeDefs + resolvers)                │
│                    │                                         │
│       ┌────────────┴────────────┐                          │
│       │                         │                           │
│       ▼                         ▼                           │
│  Query: getContext        Mutation: sendChatMessage         │
│       │                         │                           │
│       │                         ▼                           │
│       │                  authMiddleware                     │
│       │                         │                           │
│       │                         ▼                           │
│       │                  chatService.processMessage          │
│       │                         │                           │
│       │          ┌──────────────┼──────────────┐           │
│       │          │              │              │            │
│       │          ▼              ▼              ▼            │
│       │   intentDetection  ragService    grpcClients        │
│       │          │              │              │            │
│       │          └──────────────┼──────────────┘           │
│       │                         │                           │
│       └─────────────────────────┼───────────────────────────┤
│                                 ▼                           │
│                          Return Response                    │
└─────────────────────────────────────────────────────────────┘
```

## 🎯 Intent to Action Mapping

```
┌──────────────────┐
│   User Query     │
└────────┬─────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│              Intent Detection (GPT-4)                        │
└────────┬─────────────────────────────────────┬──────────────┘
         │                                     │
         ▼                                     ▼
┌──────────────────┐                 ┌──────────────────────┐
│ HEALTH_QUERY     │                 │   Entity Extraction   │
│ "chest pain"     │                 │   • Specialization    │
└────────┬─────────┘                 │   • Symptoms          │
         │                           └──────────────────────┘
         ▼
┌──────────────────────────────────────────────────────────────┐
│                    Chat Service Router                        │
└────────┬──────────┬──────────┬──────────┬──────────┬─────────┘
         │          │          │          │          │
    HEALTH_Q   SEARCH_DR  SHOW_APPT  BOOK_APPT  CANCEL_APPT
         │          │          │          │          │
         ▼          ▼          ▼          ▼          ▼
    ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐
    │ RAG +  │ │ Doctor │ │Appoint │ │ Doctor │ │Appoint │
    │ GPT-4  │ │Service │ │Service │ │Service │ │Service │
    │Response│ │ gRPC   │ │ gRPC   │ │ gRPC   │ │ gRPC   │
    └────┬───┘ └────┬───┘ └────┬───┘ └────┬───┘ └────┬───┘
         │          │          │          │          │
         └──────────┴──────────┴──────────┴──────────┘
                              │
                              ▼
                   ┌─────────────────────┐
                   │ Structured Response │
                   │ • message           │
                   │ • actionType        │
                   │ • payload           │
                   │ • disclaimer        │
                   └─────────┬───────────┘
                             │
                             ▼
                   ┌─────────────────────┐
                   │  Mobile App Shows:  │
                   │  • AI message       │
                   │  • Action button    │
                   │  • Disclaimer       │
                   └─────────────────────┘
```

## 🗄️ Data Flow & Storage

```
┌────────────────────────────────────────────────────────────┐
│                      Redis Cache                            │
│                                                             │
│  chat:context:{userId}                                     │
│  ├── Message 1: { role, content, timestamp }              │
│  ├── Message 2: { role, content, timestamp }              │
│  └── ... (last 10 messages, TTL: 1 hour)                  │
│                                                             │
│  doctor:search:{specialization}                            │
│  └── [ {doctor1}, {doctor2}, ... ] (TTL: 5 min)          │
│                                                             │
│  appointments:user:{userId}                                │
│  └── [ {appt1}, {appt2}, ... ] (TTL: 3 min)              │
└────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│                    ChromaDB (Vector DB)                     │
│                                                             │
│  Collection: medical_knowledge                             │
│  ├── Document 1: "Chest pain → Cardiologist"              │
│  │   └── Embedding: [0.123, 0.456, ...]                  │
│  ├── Document 2: "Skin issues → Dermatologist"            │
│  │   └── Embedding: [0.789, 0.012, ...]                  │
│  └── ... (15 medical documents)                           │
│                                                             │
│  Search: Semantic similarity using embeddings              │
└────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│                      MongoDB                                │
│                                                             │
│  ai_db (Future: Store chat history, analytics)            │
└────────────────────────────────────────────────────────────┘
```

## 🔐 Security Flow

```
┌──────────────┐
│  Mobile App  │
└──────┬───────┘
       │ JWT Token in Authorization header
       ▼
┌──────────────────┐
│   API Gateway    │
│ • Validates JWT  │
│ • Extracts user  │
└──────┬───────────┘
       │ Forward JWT + user context
       ▼
┌──────────────────┐
│   AI Service     │
│ • Auth middleware│
│ • Validates JWT  │
│   with auth-svc  │
└──────┬───────────┘
       │ User context in resolvers
       ▼
┌──────────────────┐
│   Resolvers      │
│ • Check userId   │
│ • Ensure user    │
│   owns resources │
└──────────────────┘
```

## 🎨 Mobile UI Components

```
┌─────────────────────────────────────────────────────┐
│              AI Search Screen                        │
│                                                      │
│  ┌───────────────────────────────────────────────┐  │
│  │  Header                                       │  │
│  │  ← | AI Health Assistant | 🗑️               │  │
│  └───────────────────────────────────────────────┘  │
│                                                      │
│  ┌───────────────────────────────────────────────┐  │
│  │  Messages ScrollView                          │  │
│  │                                               │  │
│  │  ┌─────────────────────────────────────────┐ │  │
│  │  │ 🤖 AI Assistant                        │ │  │
│  │  │ Hello! How can I help you today?       │ │  │
│  │  │ 10:30 AM                               │ │  │
│  │  └─────────────────────────────────────────┘ │  │
│  │                                               │  │
│  │               ┌─────────────────────────────┐ │  │
│  │               │ I have chest pain          │ │  │
│  │               │                     10:31 AM│ │  │
│  │               └─────────────────────────────┘ │  │
│  │                                               │  │
│  │  ┌─────────────────────────────────────────┐ │  │
│  │  │ 🤖 AI Assistant                        │ │  │
│  │  │ You should consult a Cardiologist...   │ │  │
│  │  │                                        │ │  │
│  │  │ ⚠️ This is not medical advice...       │ │  │
│  │  │                                        │ │  │
│  │  │  ┌─────────────────────────────────┐  │ │  │
│  │  │  │  🔍 Search Doctors              │  │ │  │
│  │  │  └─────────────────────────────────┘  │ │  │
│  │  │                              10:31 AM  │ │  │
│  │  └─────────────────────────────────────────┘ │  │
│  │                                               │  │
│  └───────────────────────────────────────────────┘  │
│                                                      │
│  ┌───────────────────────────────────────────────┐  │
│  │  Input Area                                   │  │
│  │  ┌─────────────────────────────────┐  ┌───┐  │  │
│  │  │ Type your message...            │  │📤 │  │  │
│  │  └─────────────────────────────────┘  └───┘  │  │
│  └───────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

## 📈 Performance Optimizations

```
┌──────────────────────────────────────────────────────┐
│              Caching Strategy                         │
│                                                       │
│  Request → Check Redis Cache                         │
│               │                                       │
│          Cache Hit?                                   │
│         ┌─────┴─────┐                                │
│         │           │                                 │
│        YES          NO                                │
│         │           │                                 │
│    Return      Call gRPC/                             │
│    Cached   → Get Data                                │
│    Data     → Store in Cache                          │
│         │    → Return Data                            │
│         │           │                                 │
│         └─────┬─────┘                                │
│               │                                       │
│          Return to User                               │
│                                                       │
│  TTLs:                                               │
│  • Doctor Search: 5 minutes                          │
│  • Appointments: 3 minutes                           │
│  • Conversation: 1 hour                              │
└──────────────────────────────────────────────────────┘
```

## 🔍 Monitoring & Debugging

```
┌──────────────────────────────────────────────────────┐
│              Logging & Monitoring                     │
│                                                       │
│  Winston Logger                                       │
│  ├── logs/error.log       (Errors only)             │
│  ├── logs/combined.log    (All logs)                │
│  └── Console output       (Development)              │
│                                                       │
│  Health Endpoints                                     │
│  ├── /health             (Service status)            │
│  └── /graphql            (GraphQL playground)        │
│                                                       │
│  Metrics to Monitor                                   │
│  ├── Response time       (OpenAI API calls)         │
│  ├── Cache hit rate      (Redis performance)        │
│  ├── gRPC call latency   (Service communication)    │
│  └── Intent accuracy     (ML model performance)     │
└──────────────────────────────────────────────────────┘
```

---

**📌 This diagram represents the complete, implemented AI Chat Assistant system!**
