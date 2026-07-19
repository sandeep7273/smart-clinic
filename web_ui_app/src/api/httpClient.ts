/**
 * HTTP Client – Axios instance with JWT interceptors (web version)
 */

import axios, { AxiosError } from "axios";
import type { InternalAxiosRequestConfig } from "axios";
import { APP_CONFIG } from "../constants/config";
import {
  getAccessToken,
  refreshAccessToken,
  removeTokens,
} from "../services/auth.service";
import { authEvents } from "../utils/authEvents";

const MAX_RETRIES = 3;
let isRefreshing = false;
let refreshSubscribers: Array<(token: string) => void> = [];

const subscribeTokenRefresh = (cb: (token: string) => void) => {
  refreshSubscribers.push(cb);
};

const onTokenRefreshed = (token: string) => {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
};

export const httpClient = axios.create({
  baseURL: APP_CONFIG.API_BASE_URL,
  timeout: APP_CONFIG.API_TIMEOUT,
  headers: { "Content-Type": "application/json" },
});

// ── Request interceptor ────────────────────────────────────────────────────
httpClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const skipAuthEndpoints = [
      "/auth/login",
      "/auth/register",
      "/auth/refresh",
    ];
    const isAuthEndpoint = skipAuthEndpoints.some((ep) =>
      config.url?.includes(ep),
    );

    if (!isAuthEndpoint) {
      const token = getAccessToken();
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error: AxiosError) => Promise.reject(error),
);

// ── Response interceptor ───────────────────────────────────────────────────
httpClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retryCount?: number;
    };

    if (!originalRequest._retryCount) originalRequest._retryCount = 0;

    const is401 = error.response?.status === 401;

    if (is401 && originalRequest._retryCount < MAX_RETRIES) {
      originalRequest._retryCount += 1;

      if (!isRefreshing) {
        isRefreshing = true;
        try {
          const tokens = await refreshAccessToken();
          if (tokens) {
            isRefreshing = false;
            onTokenRefreshed(tokens.accessToken);
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${tokens.accessToken}`;
            }
            return httpClient(originalRequest);
          }
          throw new Error("Token refresh failed");
        } catch {
          isRefreshing = false;
          refreshSubscribers = [];
          removeTokens();
          authEvents.emitAuthError();
          return Promise.reject(error);
        }
      }

      return new Promise((resolve, reject) => {
        subscribeTokenRefresh((token: string) => {
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${token}`;
          }
          resolve(httpClient(originalRequest));
        });
        // If refresh fails entirely, reject queued requests too
        setTimeout(() => reject(error), APP_CONFIG.API_TIMEOUT);
      });
    }

    return Promise.reject(error);
  },
);
