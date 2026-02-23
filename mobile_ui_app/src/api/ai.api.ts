/**
 * AI Chat API
 * GraphQL queries and mutations for AI chat assistant
 */

import graphqlClient from './graphql.client';

/**
 * Intent Types
 */
export enum IntentType {
  HEALTH_QUERY = 'HEALTH_QUERY',
  SEARCH_DOCTOR = 'SEARCH_DOCTOR',
  SHOW_APPOINTMENTS = 'SHOW_APPOINTMENTS',
  BOOK_APPOINTMENT = 'BOOK_APPOINTMENT',
  CANCEL_APPOINTMENT = 'CANCEL_APPOINTMENT',
  UNKNOWN = 'UNKNOWN',
}

/**
 * Action Types
 */
export enum ActionType {
  NONE = 'NONE',
  SEARCH_DOCTOR = 'SEARCH_DOCTOR',
  SHOW_APPOINTMENTS = 'SHOW_APPOINTMENTS',
  BOOK_APPOINTMENT = 'BOOK_APPOINTMENT',
  NAVIGATE = 'NAVIGATE',
}

/**
 * Chat Message Type
 */
export interface ChatMessage {
  id: string;
  userId: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

/**
 * Doctor Information Type (for AI chat display)
 */
export interface DoctorInfo {
  id: string;
  name: string;
  specialization: string;
  rating?: number;
  consultationFee?: number;
  street?: string;
  city?: string;
  state?: string;
  languages?: string[];
  experience?: number;
}

/**
 * Appointment Information Type (for AI chat display)
 */
export interface AppointmentInfo {
  id: string;
  doctorId: string;
  doctorName: string;
  specialization?: string;
  city?: string;
  state?: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  type?: string;
}

/**
 * Payload types for different actions
 */
export interface SearchDoctorPayload {
  specialization?: string;
  location?: string;
  count: number;
  total: number;
  doctors?: DoctorInfo[];
}

export interface ShowAppointmentsPayload {
  count: number;
  hasAppointments: boolean;
  appointments?: AppointmentInfo[];
}

/**
 * Chat Response Type
 */
export interface ChatResponse {
  message: string;
  actionType: ActionType;
  payload?: SearchDoctorPayload | ShowAppointmentsPayload | any;
  disclaimer?: string;
}

/**
 * Chat Result Type
 */
export interface ChatResult {
  success: boolean;
  data?: ChatResponse;
  intent?: IntentType;
  entities?: {
    specialization?: string;
    symptoms?: string[];
    date?: string;
    location?: string;
  };
  message?: string;
}

/**
 * Send Chat Message Mutation
 */
export const SEND_CHAT_MESSAGE = `
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
`;

/**
 * Get Conversation Context Query
 */
export const GET_CONVERSATION_CONTEXT = `
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
`;

/**
 * Clear Conversation Context Mutation
 */
export const CLEAR_CONVERSATION_CONTEXT = `
  mutation ClearConversationContext($userId: ID!) {
    clearConversationContext(userId: $userId) {
      success
      message
    }
  }
`;

/**
 * AI Chat API Service
 */
export const aiChatApi = {
  /**
   * Send a chat message
   */
  sendMessage: async (userId: string, message: string): Promise<ChatResult> => {
    try {
      const response = await graphqlClient.query(SEND_CHAT_MESSAGE, {
        userId,
        message,
      });

      if (!response || !response.sendChatMessage) {
        throw new Error('Invalid response from server');
      }

      return response.sendChatMessage;
    } catch (error: any) {
      console.error('[AI Chat API] Error sending message:', error);
      throw error;
    }
  },

  /**
   * Get conversation history
   */
  getConversationContext: async (userId: string) => {
    try {
      const response = await graphqlClient.query(GET_CONVERSATION_CONTEXT, {
        userId,
      });

      if (!response || !response.getConversationContext) {
        throw new Error('Invalid response from server');
      }

      return response.getConversationContext;
    } catch (error: any) {
      console.error('[AI Chat API] Error getting conversation context:', error);
      throw error;
    }
  },

  /**
   * Clear conversation context
   */
  clearContext: async (userId: string) => {
    try {
      const response = await graphqlClient.query(CLEAR_CONVERSATION_CONTEXT, {
        userId,
      });

      if (!response || !response.clearConversationContext) {
        throw new Error('Invalid response from server');
      }

      return response.clearConversationContext;
    } catch (error: any) {
      console.error('[AI Chat API] Error clearing context:', error);
      throw error;
    }
  },
};
