/**
 * Centralized Authentication Service
 * Handles secure token storage, token refresh, and authentication state
 * Uses react-native-keychain for secure credential storage with AsyncStorage fallback
 */

import * as Keychain from 'react-native-keychain';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { httpClient } from '../api/httpClient';
import { API_ENDPOINTS } from '../constants/apiEndpoints';

// Token storage keys
const TOKEN_SERVICE = 'com.smartappointment.tokens';
const ACCESS_TOKEN_KEY = 'accessToken';
const REFRESH_TOKEN_KEY = 'refreshToken';

// Check if Keychain is available (native module loaded)
let isKeychainAvailable = true;

// Test Keychain availability on module load
(async () => {
  try {
    await Keychain.getSupportedBiometryType();
    isKeychainAvailable = true;
    console.log('✅ Keychain available');
  } catch (error) {
    isKeychainAvailable = false;
    console.warn('⚠️ Keychain not available, using AsyncStorage fallback');
  }
})();

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface AuthTokens {
  access: string;
  refresh: string;
}

/**
 * Save tokens securely using Keychain or AsyncStorage fallback
 */
export const saveTokens = async (tokens: TokenPair): Promise<boolean> => {
  try {
    if (isKeychainAvailable) {
      // Save access token
      await Keychain.setGenericPassword(
        ACCESS_TOKEN_KEY,
        tokens.accessToken,
        {
          service: `${TOKEN_SERVICE}.access`,
          accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED,
        }
      );

      // Save refresh token
      await Keychain.setGenericPassword(
        REFRESH_TOKEN_KEY,
        tokens.refreshToken,
        {
          service: `${TOKEN_SERVICE}.refresh`,
          accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED,
        }
      );
    } else {
      // Fallback to AsyncStorage (less secure, but works)
      await AsyncStorage.setItem(`${TOKEN_SERVICE}.${ACCESS_TOKEN_KEY}`, tokens.accessToken);
      await AsyncStorage.setItem(`${TOKEN_SERVICE}.${REFRESH_TOKEN_KEY}`, tokens.refreshToken);
    }

    return true;
  } catch (error) {
    console.error('Error saving tokens:', error);
    return false;
  }
};

/**
 * Retrieve tokens from secure storage
 */
export const getTokens = async (): Promise<TokenPair | null> => {
  try {
    if (isKeychainAvailable) {
      // Get access token
      const accessCredentials = await Keychain.getGenericPassword({
        service: `${TOKEN_SERVICE}.access`,
      });

      // Get refresh token
      const refreshCredentials = await Keychain.getGenericPassword({
        service: `${TOKEN_SERVICE}.refresh`,
      });

      if (accessCredentials && refreshCredentials) {
        return {
          accessToken: accessCredentials.password,
          refreshToken: refreshCredentials.password,
        };
      }
    } else {
      // Fallback to AsyncStorage
      const accessToken = await AsyncStorage.getItem(`${TOKEN_SERVICE}.${ACCESS_TOKEN_KEY}`);
      const refreshToken = await AsyncStorage.getItem(`${TOKEN_SERVICE}.${REFRESH_TOKEN_KEY}`);

      if (accessToken && refreshToken) {
        return { accessToken, refreshToken };
      }
    }

    return null;
  } catch (error) {
    console.error('Error retrieving tokens:', error);
    return null;
  }
};

/**
 * Get only the access token
 */
export const getAccessToken = async (): Promise<string | null> => {
  try {
    if (isKeychainAvailable) {
      const credentials = await Keychain.getGenericPassword({
        service: `${TOKEN_SERVICE}.access`,
      });
      return credentials ? credentials.password : null;
    } else {
      return await AsyncStorage.getItem(`${TOKEN_SERVICE}.${ACCESS_TOKEN_KEY}`);
    }
  } catch (error) {
    console.error('Error retrieving access token:', error);
    return null;
  }
};

/**
 * Get only the refresh token
 */
export const getRefreshToken = async (): Promise<string | null> => {
  try {
    if (isKeychainAvailable) {
      const credentials = await Keychain.getGenericPassword({
        service: `${TOKEN_SERVICE}.refresh`,
      });
      return credentials ? credentials.password : null;
    } else {
      return await AsyncStorage.getItem(`${TOKEN_SERVICE}.${REFRESH_TOKEN_KEY}`);
    }
  } catch (error) {
    console.error('Error retrieving refresh token:', error);
    return null;
  }
};

/**
 * Remove tokens from secure storage
 */
export const removeTokens = async (): Promise<boolean> => {
  try {
    if (isKeychainAvailable) {
      // Remove access token
      await Keychain.resetGenericPassword({
        service: `${TOKEN_SERVICE}.access`,
      });

      // Remove refresh token
      await Keychain.resetGenericPassword({
        service: `${TOKEN_SERVICE}.refresh`,
      });
    } else {
      // Remove from AsyncStorage
      await AsyncStorage.removeItem(`${TOKEN_SERVICE}.${ACCESS_TOKEN_KEY}`);
      await AsyncStorage.removeItem(`${TOKEN_SERVICE}.${REFRESH_TOKEN_KEY}`);
    }

    return true;
  } catch (error) {
    console.error('Error removing tokens:', error);
    return false;
  }
};

/**
 * Check if user is authenticated (has valid tokens)
 */
export const isAuthenticated = async (): Promise<boolean> => {
  const tokens = await getTokens();
  return tokens !== null && tokens.accessToken !== '';
};

/**
 * Refresh the access token using the refresh token
 */
export const refreshAccessToken = async (): Promise<TokenPair | null> => {
  try {
    const refreshToken = await getRefreshToken();

    if (!refreshToken) {
      console.log('No refresh token available');
      return null;
    }

    console.log('🔄 Refreshing token...');
    
    // Call refresh endpoint through API Gateway
    const response = await httpClient.post<{ 
      success: boolean;
      data: { accessToken: string; refreshToken: string } 
    }>(
      API_ENDPOINTS.AUTH.REFRESH,
      { refreshToken }
    );

    if (!response.data.success || !response.data.data) {
      console.error('Invalid refresh response:', response.data);
      await removeTokens();
      return null;
    }

    const newTokens: TokenPair = {
      accessToken: response.data.data.accessToken,
      refreshToken: response.data.data.refreshToken,
    };

    // Save new tokens
    await saveTokens(newTokens);
    console.log('✅ Token refreshed and saved successfully');

    return newTokens;
  } catch (error: any) {
    console.error('❌ Error refreshing token:', error.message);
    // If refresh fails, remove tokens
    await removeTokens();
    return null;
  }
};

/**
 * Decode JWT token to get expiration time
 * Returns expiration timestamp in milliseconds
 */
export const getTokenExpiration = (token: string): number | null => {
  try {
    // For mock tokens, return 15 minutes validity (matching backend config)
    if (token.startsWith('mock_')) {
      return Date.now() + 15 * 60 * 1000; // 15 minutes
    }

    // For real JWT tokens: decode the payload (base64 decode middle section)
    const parts = token.split('.');
    if (parts.length === 3) {
      try {
        // Decode the payload (second part of JWT)
        const payload = JSON.parse(
          Buffer.from(parts[1], 'base64').toString('utf-8')
        );
        
        // JWT exp is in seconds, convert to milliseconds
        if (payload.exp) {
          return payload.exp * 1000;
        }
      } catch (decodeError) {
        console.warn('Could not decode JWT token, using default expiry');
      }
    }
    
    // Fallback: return 15 minutes validity (matching backend ACCESS_TOKEN_EXPIRY)
    return Date.now() + 15 * 60 * 1000;
  } catch (error) {
    console.error('Error decoding token:', error);
    return Date.now() + 15 * 60 * 1000;
  }
};

/**
 * Check if token is expired or about to expire (within 5 minutes)
 */
export const isTokenExpired = (token: string): boolean => {
  const expiration = getTokenExpiration(token);
  if (!expiration) return true;

  const now = Date.now();
  const bufferTime = 5 * 60 * 1000; // 5 minutes in milliseconds

  return now >= expiration - bufferTime;
};

/**
 * Check if access token needs refresh
 */
export const shouldRefreshToken = async (): Promise<boolean> => {
  const accessToken = await getAccessToken();
  if (!accessToken) return false;

  return isTokenExpired(accessToken);
};

/**
 * Initialize authentication state
 * Checks if tokens exist and are valid
 */
export const initializeAuth = async (): Promise<{
  isAuthenticated: boolean;
  needsRefresh: boolean;
}> => {
  const tokens = await getTokens();

  if (!tokens) {
    return { isAuthenticated: false, needsRefresh: false };
  }

  const expired = isTokenExpired(tokens.accessToken);

  return {
    isAuthenticated: true,
    needsRefresh: expired,
  };
};

export default {
  saveTokens,
  getTokens,
  getAccessToken,
  getRefreshToken,
  removeTokens,
  isAuthenticated,
  refreshAccessToken,
  getTokenExpiration,
  isTokenExpired,
  shouldRefreshToken,
  initializeAuth,
};
