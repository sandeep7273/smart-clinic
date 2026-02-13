import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { getApiBaseUrl, APP_CONFIG } from '../constants/config';
import { getAccessToken, refreshAccessToken, removeTokens } from '../services/auth.service';
import { authEvents } from '../utils/authEvents';

/**
 * HTTP Client Configuration
 * Axios instance with interceptors for authentication and error handling
 */

// Flag to prevent multiple simultaneous refresh attempts
let isRefreshing = false;
let refreshSubscribers: Array<(token: string) => void> = [];

/**
 * Subscribe to token refresh
 */
const subscribeTokenRefresh = (cb: (token: string) => void) => {
  refreshSubscribers.push(cb);
};

/**
 * Notify all subscribers of new token
 */
const onTokenRefreshed = (token: string) => {
  refreshSubscribers.forEach(cb => cb(token));
  refreshSubscribers = [];
};

export const httpClient = axios.create({
  timeout: APP_CONFIG.API_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Request Interceptor
 * Attaches JWT token to all requests and sets dynamic baseURL
 */
httpClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    try {
      // Set baseURL dynamically to ensure platform-specific URL is used
      const baseURL = getApiBaseUrl();
      config.baseURL = baseURL;
      
      // Skip token attachment for auth endpoints that don't need it
      const skipAuthEndpoints = ['/auth/login', '/auth/register', '/auth/refresh'];
      const isAuthEndpoint = skipAuthEndpoints.some(endpoint =>
        config.url?.includes(endpoint)
      );

      if (!isAuthEndpoint) {
        const token = await getAccessToken();
        if (token && config.headers) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      }

      // Log request in development with full URL
      if (__DEV__) {
        const fullUrl = `${baseURL}${config.url}`;
        console.log(`📤 ${config.method?.toUpperCase()} ${fullUrl}`);
      }
    } catch (error) {
      console.error('Error in request interceptor:', error);
    }
    return config;
  },
  (error: AxiosError) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

/**
 * Response Interceptor
 * Handles common error scenarios and automatic token refresh
 */
httpClient.interceptors.response.use(
  response => {
    // Log response in development
    if (__DEV__) {
      console.log(`📥 ${response.config.method?.toUpperCase()} ${response.config.url} - ${response.status}`);
    }
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    // Handle 401 Unauthorized - Token expired or invalid
    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      // Skip refresh for auth endpoints
      if (originalRequest.url?.includes('/auth/login') || 
          originalRequest.url?.includes('/auth/register')) {
        return Promise.reject(error);
      }

      originalRequest._retry = true;

      if (!isRefreshing) {
        isRefreshing = true;

        try {
          console.log('🔄 Token expired, attempting refresh...');
          const tokens = await refreshAccessToken();

          if (tokens) {
            console.log('✅ Token refreshed successfully');
            isRefreshing = false;
            
            // Notify all waiting requests
            onTokenRefreshed(tokens.accessToken);

            // Retry the original request
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${tokens.accessToken}`;
            }
            return httpClient(originalRequest);
          } else {
            throw new Error('Token refresh failed');
          }
        } catch (refreshError) {
          console.error('❌ Token refresh failed:', refreshError);
          isRefreshing = false;
          refreshSubscribers = [];

          // Clear all auth data
          await removeTokens();

          // Emit auth error to trigger app-wide logout
          authEvents.emitAuthError();

          // Reject with a specific error
          return Promise.reject({
            ...error,
            message: 'Session expired. Please log in again.',
            isAuthError: true,
          });
        }
      }

      // Queue this request until token is refreshed
      return new Promise((resolve, reject) => {
        subscribeTokenRefresh((token: string) => {
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${token}`;
          }
          resolve(httpClient(originalRequest));
        });
      });
    }

    // Handle other error status codes
    if (error.response) {
      const status = error.response.status;
      
      if (__DEV__) {
        console.error(`❌ ${status} - ${originalRequest?.url}`);
        console.error('Response data:', error.response.data);
      }

      // Handle common HTTP errors
      switch (status) {
        case 400:
          console.error('Bad Request:', error.response.data);
          break;
        case 403:
          console.error('Forbidden:', error.response.data);
          break;
        case 404:
          console.error('Not Found:', error.response.data);
          break;
        case 500:
          console.error('Internal Server Error:', error.response.data);
          break;
        default:
          console.error('API Error:', error.response.data);
      }
    } else if (error.request) {
      // Network error - no response received
      console.error('Request config:', {
        url: error.config?.url,
        baseURL: error.config?.baseURL,
        method: error.config?.method,
      });
    } else {
      console.error('Request Setup Error:', error.message);
    }

    return Promise.reject(error);
  }
);

/**
 * Export a method to reset the refresh state (useful for testing)
 */
export const resetRefreshState = () => {
  isRefreshing = false;
  refreshSubscribers = [];
};
