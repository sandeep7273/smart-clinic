/**
 * Application Configuration
 * Web version – reads from Vite environment variables
 */

export const APP_CONFIG = {
  API_BASE_URL:
    import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api",
  GRAPHQL_URL:
    import.meta.env.VITE_GRAPHQL_URL || "http://localhost:3000/graphql",
  API_TIMEOUT: Number(import.meta.env.VITE_API_TIMEOUT) || 30000,
};

export const API_CONFIG = {
  BASE_URL: APP_CONFIG.API_BASE_URL,
  GRAPHQL_URL: APP_CONFIG.GRAPHQL_URL,
  TIMEOUT: APP_CONFIG.API_TIMEOUT,
};
