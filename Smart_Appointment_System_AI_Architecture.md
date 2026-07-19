# 🏥 Smart Appointment System

## AI Assistant + Microservices Architecture Documentation

------------------------------------------------------------------------

# 1️⃣ Overview

This document describes the architecture of a Smart Appointment System
with:

-   Microservices (auth-service, doctor-service, appointment-service)
-   API Gateway with GraphQL
-   AI Chat Assistant (ai-service)
-   gRPC for internal communication
-   Redis for caching
-   Embeddings + Vector Database (RAG)
-   Separate databases per service

------------------------------------------------------------------------

# 2️⃣ High-Level Architecture

React Native App ↓ GraphQL API Gateway (Express) ↓
------------------------------------------------- \| auth-service \| \|
doctor-service (gRPC Server) \| \| appointment-service (gRPC Client) \|
\| ai-service (LLM + RAG + Redis + gRPC Client) \|
------------------------------------------------- ↓ MongoDB (separate DB
per service) ↓ Redis (Caching + Context Memory) ↓ Vector DB (Embeddings
Storage)

------------------------------------------------------------------------

# 3️⃣ Microservices Overview

## 3.1 auth-service

-   User registration/login
-   JWT generation
-   Role-based access
-   Database: MongoDB (Auth DB)

## 3.2 doctor-service

-   Doctor profiles
-   Availability slots
-   Slot locking (atomic update)
-   gRPC server exposed for:
    -   CheckAndLockSlot
    -   GetDoctorsBySpecialization
-   Database: MongoDB (Doctor DB)

## 3.3 appointment-service

-   Create appointment
-   Cancel appointment
-   Fetch user appointments
-   Uses gRPC client to call doctor-service
-   Database: MongoDB (Appointment DB)

## 3.4 ai-service

Responsibilities: - Intent detection - Entity extraction - Query
enrichment using embeddings - Context memory - Redis caching - Calls
doctor-service & appointment-service via gRPC

------------------------------------------------------------------------

# 4️⃣ Communication Protocol Design

## External Communication

Frontend → API Gateway\
Protocol: HTTP (GraphQL)

## Internal Communication

Service-to-service → gRPC

Why gRPC? - Fast binary communication (Protocol Buffers) - Strong
contract enforcement - Efficient for microservices - Ideal for slot
locking and AI queries

------------------------------------------------------------------------

# 5️⃣ AI Assistant Design

## 5.1 Intent Types

  Intent              Description
  ------------------- ---------------------------
  HEALTH_QUERY        Health condition question
  SEARCH_DOCTOR       Looking for specialist
  SHOW_APPOINTMENTS   Retrieve bookings
  BOOK_APPOINTMENT    Booking request
  UNKNOWN             Fallback

## 5.2 Structured AI Response Format

``` json
{
  "message": "You should consult a Cardiologist.",
  "actionType": "SEARCH_DOCTOR",
  "payload": {
    "specialization": "Cardiologist"
  }
}
```

Frontend uses actionType to render navigation buttons.

------------------------------------------------------------------------

# 6️⃣ AI + gRPC Integration

AI Service Flow:

User Query\
↓\
Intent Detection\
↓\
If SEARCH_DOCTOR\
↓\
Call doctor-service via gRPC\
↓\
Return structured response

This ensures high performance and strong service boundaries.

------------------------------------------------------------------------

# 7️⃣ Embeddings + Vector DB (RAG)

RAG Flow:

User Question\
↓\
Generate embedding\
↓\
Search vector DB\
↓\
Retrieve relevant documents\
↓\
Send context + question to LLM\
↓\
Generate accurate response

Steps:

1.  Generate embeddings using LLM
2.  Store embeddings in Vector DB (Chroma/Pinecone/Qdrant)
3.  Perform similarity search
4.  Inject retrieved context into prompt
5.  Return structured response

------------------------------------------------------------------------

# 8️⃣ Redis Integration

Redis is used for:

-   Doctor search caching
-   Appointment caching
-   AI conversation memory
-   Rate limiting
-   Distributed locking (optional)

Example Keys:

doctor:specialization:Cardiologist\
appointments:userId\
chat:userId

------------------------------------------------------------------------

# 9️⃣ Booking Flow with gRPC + Redis

User clicks Confirm\
↓\
GraphQL Gateway\
↓\
appointment-service\
↓\
Check Redis lock\
↓\
Call doctor-service (gRPC)\
↓\
Atomic slot lock in MongoDB\
↓\
Create appointment record\
↓\
Invalidate appointment cache\
↓\
Return success

------------------------------------------------------------------------

# 🔟 Security Considerations

-   JWT validated at gateway
-   Services trust gateway
-   gRPC internal network only
-   Redis secured with password
-   Medical disclaimer in AI responses

------------------------------------------------------------------------

# 11️⃣ Technology Stack Summary

  Layer                    Technology
  ------------------------ -------------------
  Frontend                 React Native
  Gateway                  Express + GraphQL
  Internal Communication   gRPC
  Databases                MongoDB
  AI                       LLM + RAG
  Vector DB                Chroma/Pinecone
  Caching                  Redis

------------------------------------------------------------------------

# 🎯 Conclusion

This architecture integrates:

-   Microservices
-   GraphQL Gateway
-   gRPC communication
-   AI intent detection
-   Retrieval Augmented Generation
-   Redis caching
-   Distributed safety mechanisms

It represents a scalable, production-ready healthcare platform design.
