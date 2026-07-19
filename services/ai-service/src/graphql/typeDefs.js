const { gql } = require('apollo-server-express');

const typeDefs = gql`
  # Scalars
  scalar DateTime
  scalar JSON

  # Enums
  enum IntentType {
    HEALTH_QUERY
    SEARCH_DOCTOR
    SHOW_APPOINTMENTS
    BOOK_APPOINTMENT
    CANCEL_APPOINTMENT
    UNKNOWN
  }

  enum ActionType {
    NONE
    SEARCH_DOCTOR
    SHOW_APPOINTMENTS
    BOOK_APPOINTMENT
    NAVIGATE
  }

  # Types
  type ChatMessage {
    id: ID!
    userId: String!
    role: String!
    content: String!
    timestamp: DateTime!
  }

  type IntentEntity {
    specialization: String
    symptoms: [String!]
    date: String
    location: String
  }

  type ChatResponse {
    message: String!
    actionType: ActionType!
    payload: JSON
    disclaimer: String
  }

  type ChatResult {
    success: Boolean!
    data: ChatResponse
    intent: IntentType
    entities: IntentEntity
    message: String
  }

  type ConversationContext {
    userId: String!
    messages: [ChatMessage!]!
    messageCount: Int!
  }

  type ClearContextResult {
    success: Boolean!
    message: String!
  }

  # Queries
  type Query {
    # Get conversation history
    getConversationContext(userId: ID!): ConversationContext!
    
    # Health check
    healthCheck: String!
  }

  # Mutations
  type Mutation {
    # Send a chat message
    sendChatMessage(
      userId: ID!
      message: String!
    ): ChatResult!

    # Clear conversation context
    clearConversationContext(userId: ID!): ClearContextResult!
  }
`;

module.exports = typeDefs;
