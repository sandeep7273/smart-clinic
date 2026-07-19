/**
 * Auth Service – Web version using localStorage instead of Keychain
 */

import axios from "axios";
import { API_CONFIG } from "../constants/config";
import { API_ENDPOINTS } from "../constants/apiEndpoints";

const ACCESS_TOKEN_KEY = "smart_clinic_access_token";
const REFRESH_TOKEN_KEY = "smart_clinic_refresh_token";

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export const saveTokens = (tokens: TokenPair): void => {
  localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
};

export const getTokens = (): TokenPair | null => {
  const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY);
  const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
  if (accessToken && refreshToken) return { accessToken, refreshToken };
  return null;
};

export const getAccessToken = (): string | null => {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
};

export const getRefreshToken = (): string | null => {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
};

export const removeTokens = (): void => {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
};

export const isAuthenticated = (): boolean => {
  return getTokens() !== null;
};

/**
 * Decode JWT payload (without verification – verification happens server-side)
 */
const decodeJwtPayload = (token: string): Record<string, any> | null => {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(base64));
  } catch {
    return null;
  }
};

export const isTokenExpired = (token: string): boolean => {
  const payload = decodeJwtPayload(token);
  if (!payload?.exp) return true;
  return Date.now() >= payload.exp * 1000;
};

export const initializeAuth = (): {
  isAuthenticated: boolean;
  needsRefresh: boolean;
} => {
  const tokens = getTokens();
  if (!tokens) return { isAuthenticated: false, needsRefresh: false };
  const needsRefresh = isTokenExpired(tokens.accessToken);
  return { isAuthenticated: true, needsRefresh };
};

/**
 * Refresh the access token using the refresh token
 */
export const refreshAccessToken = async (): Promise<TokenPair | null> => {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;

  try {
    const response = await axios.post(
      `${API_CONFIG.BASE_URL}${API_ENDPOINTS.AUTH.REFRESH}`,
      { refreshToken },
      { headers: { "Content-Type": "application/json" } },
    );
    const tokens: TokenPair = {
      accessToken: response.data.data?.accessToken || response.data.accessToken,
      refreshToken:
        response.data.data?.refreshToken ||
        response.data.refreshToken ||
        refreshToken,
    };
    saveTokens(tokens);
    return tokens;
  } catch (error) {
    removeTokens();
    return null;
  }
};
