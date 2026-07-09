/**
 * API Endpoints – mirrors mobile app endpoint constants
 */

export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: "/auth/login",
    REGISTER: "/auth/register",
    LOGOUT: "/auth/logout",
    REFRESH: "/auth/refresh",
    FORGOT_PASSWORD: "/auth/forgot-password",
    RESET_PASSWORD: "/auth/reset-password",
  },
  USER: {
    PROFILE: "/users/profile",
    UPDATE_PROFILE: "/users/profile",
    CHANGE_PASSWORD: "/users/change-password",
  },
  DOCTOR: {
    SEARCH: "/doctors/search",
    GET_BY_ID: (id: string) => `/doctors/${id}`,
    GET_SPECIALTIES: "/doctors/specialties",
    GET_AVAILABILITY: (id: string) => `/doctors/${id}/availability`,
  },
  APPOINTMENT: {
    CREATE: "/appointments",
    GET_ALL: "/appointments",
    GET_BY_ID: (id: string) => `/appointments/${id}`,
    CANCEL: (id: string) => `/appointments/${id}/cancel`,
  },
  AI: {
    SYMPTOM_SEARCH: "/ai/symptom-search",
    SPECIALTY_RECOMMENDATION: "/ai/specialty-recommendation",
  },
};
