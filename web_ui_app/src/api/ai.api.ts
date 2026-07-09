/**
 * AI Chat API – GraphQL mutations for the AI assistant
 */

import graphqlClient from "./graphql.client";

export const IntentType = {
  HEALTH_QUERY: "HEALTH_QUERY",
  SEARCH_DOCTOR: "SEARCH_DOCTOR",
  SHOW_APPOINTMENTS: "SHOW_APPOINTMENTS",
  BOOK_APPOINTMENT: "BOOK_APPOINTMENT",
  CANCEL_APPOINTMENT: "CANCEL_APPOINTMENT",
  UNKNOWN: "UNKNOWN",
} as const;
export type IntentType = (typeof IntentType)[keyof typeof IntentType];

export const ActionType = {
  NONE: "NONE",
  SEARCH_DOCTOR: "SEARCH_DOCTOR",
  SHOW_APPOINTMENTS: "SHOW_APPOINTMENTS",
  BOOK_APPOINTMENT: "BOOK_APPOINTMENT",
  NAVIGATE: "NAVIGATE",
} as const;
export type ActionType = (typeof ActionType)[keyof typeof ActionType];

export interface ChatMessage {
  id: string;
  userId: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

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

export interface ChatResponse {
  message: string;
  actionType: ActionType;
  payload?: SearchDoctorPayload | ShowAppointmentsPayload | any;
  disclaimer?: string;
}

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

const SEND_CHAT_MESSAGE = `
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

const GET_CONVERSATION_CONTEXT = `
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

const CLEAR_CONVERSATION_CONTEXT = `
  mutation ClearConversationContext($userId: ID!) {
    clearConversationContext(userId: $userId) {
      success
      message
    }
  }
`;

export const aiChatApi = {
  sendMessage: async (userId: string, message: string): Promise<ChatResult> => {
    const response = await graphqlClient.query(SEND_CHAT_MESSAGE, {
      userId,
      message,
    });
    if (!response?.sendChatMessage)
      throw new Error("Invalid response from server");
    return response.sendChatMessage;
  },

  getConversationContext: async (userId: string) => {
    try {
      const response = await graphqlClient.query(GET_CONVERSATION_CONTEXT, {
        userId,
      });
      return response?.getConversationContext || null;
    } catch {
      return null;
    }
  },

  clearContext: async (userId: string): Promise<void> => {
    await graphqlClient.mutate(CLEAR_CONVERSATION_CONTEXT, { userId });
  },
};
