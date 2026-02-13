/**
 * API Endpoints
 * Centralized API endpoint definitions
 */

export const API_ENDPOINTS = {
  // Auth endpoints
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    LOGOUT: '/auth/logout',
    REFRESH: '/auth/refresh',
    REFRESH_TOKEN: '/auth/refresh',
    FORGOT_PASSWORD: '/auth/forgot-password',
    RESET_PASSWORD: '/auth/reset-password',
  },
  
  // User endpoints
  USER: {
    PROFILE: '/users/profile',
    UPDATE_PROFILE: '/users/profile',
    CHANGE_PASSWORD: '/users/change-password',
  },
  
  // Doctor endpoints
  DOCTOR: {
    SEARCH: '/doctors/search',
    GET_BY_ID: (id: string) => `/doctors/${id}`,
    GET_SPECIALTIES: '/doctors/specialties',
    GET_AVAILABILITY: (id: string) => `/doctors/${id}/availability`,
  },
  
  // Appointment endpoints
  APPOINTMENT: {
    CREATE: '/appointments',
    GET_ALL: '/appointments',
    GET_BY_ID: (id: string) => `/appointments/${id}`,
    CANCEL: (id: string) => `/appointments/${id}/cancel`,
  },
  
  // AI Search endpoints
  AI: {
    SYMPTOM_SEARCH: '/ai/symptom-search',
    SPECIALTY_RECOMMENDATION: '/ai/specialty-recommendation',
  },
};
