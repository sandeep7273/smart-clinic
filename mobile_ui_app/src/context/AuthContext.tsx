/**
 * Authentication Context
 * Provides centralized authentication state and methods throughout the app
 */

import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { User } from '../types/auth.types';
import {
  isAuthenticated as checkIsAuthenticated,
  initializeAuth,
  removeTokens,
  getTokens,
  isTokenExpired,
  getAccessToken,
} from '../services/auth.service';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authEvents } from '../utils/authEvents';

interface AuthContextType {
  // State
  isLoading: boolean;
  isAuthenticated: boolean;
  user: User | null;
  
  // Methods
  checkAuth: () => Promise<void>;
  setUser: (user: User | null) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

/**
 * AuthProvider Component
 * Wraps the app to provide authentication state
 */
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUserState] = useState<User | null>(null);
  
  // References for token expiry monitoring
  const tokenExpiryTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  /**
   * Check authentication status
   * Called on app start and after login/logout
   */
  const checkAuth = async () => {
    try {
      setIsLoading(true);

      // Check if tokens exist
      const authStatus = await initializeAuth();

      if (authStatus.isAuthenticated) {
        // Load user data from AsyncStorage
        const userJson = await AsyncStorage.getItem('user');
        if (userJson) {
          const userData = JSON.parse(userJson);
          setUserState(userData);
          setIsAuthenticated(true);

          // If token needs refresh, it will be handled automatically by httpClient
          if (authStatus.needsRefresh) {
            console.log('Token will be refreshed on next API call');
          }
        } else {
          // Tokens exist but no user data - clear auth
          await logout();
        }
      } else {
        setIsAuthenticated(false);
        setUserState(null);
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
      setIsAuthenticated(false);
      setUserState(null);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Set user data
   */
  const setUser = (userData: User | null) => {
    setUserState(userData);
    setIsAuthenticated(userData !== null);
  };

  /**
   * Logout user
   */
  const logout = async () => {
    try {
      // Clear token expiry timer
      if (tokenExpiryTimerRef.current) {
        clearInterval(tokenExpiryTimerRef.current);
        tokenExpiryTimerRef.current = null;
      }
      
      // Remove tokens from secure storage
      await removeTokens();
      
      // Remove user data from AsyncStorage
      await AsyncStorage.removeItem('user');
      
      // Update state
      setUserState(null);
      setIsAuthenticated(false);
      
      console.log('✅ User logged out successfully');
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  /**
   * Start token expiry monitoring
   * Checks token validity every minute when user is authenticated
   */
  const startTokenExpiryMonitoring = () => {
    // Clear any existing timer
    if (tokenExpiryTimerRef.current) {
      clearInterval(tokenExpiryTimerRef.current);
    }

    // Check token expiry every minute (60 seconds)
    tokenExpiryTimerRef.current = setInterval(async () => {
      try {
        const accessToken = await getAccessToken();
        
        if (accessToken) {
          const expired = isTokenExpired(accessToken);
          
          if (expired) {
            console.warn('⚠️ Token expired - logging out user');
            await logout();
          }
        }
      } catch (error) {
        console.error('Error checking token expiry:', error);
      }
    }, 60 * 1000); // Check every 60 seconds

    console.log('✅ Token expiry monitoring started');
  };

  /**
   * Stop token expiry monitoring
   */
  const stopTokenExpiryMonitoring = () => {
    if (tokenExpiryTimerRef.current) {
      clearInterval(tokenExpiryTimerRef.current);
      tokenExpiryTimerRef.current = null;
      console.log('🛑 Token expiry monitoring stopped');
    }
  };

  /**
   * Handle app state changes
   * Monitor when app goes to background/foreground
   */
  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (nextAppState) => {
      // App coming to foreground
      if (
        appStateRef.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        console.log('📱 App came to foreground - checking token validity');
        
        if (isAuthenticated) {
          const accessToken = await getAccessToken();
          
          if (accessToken) {
            const expired = isTokenExpired(accessToken);
            
            if (expired) {
              console.warn('⚠️ Token expired while app was in background - logging out');
              await logout();
            }
          }
        }
      }

      appStateRef.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [isAuthenticated]);

  /**
   * Monitor authentication state changes
   * Start/stop token expiry monitoring based on auth status
   */
  useEffect(() => {
    if (isAuthenticated) {
      startTokenExpiryMonitoring();
    } else {
      stopTokenExpiryMonitoring();
    }

    // Cleanup on unmount
    return () => {
      stopTokenExpiryMonitoring();
    };
  }, [isAuthenticated]);

  /**
   * Subscribe to authentication errors (401 responses)
   * This ensures automatic logout when any API call gets a 401
   */
  useEffect(() => {
    const unsubscribe = authEvents.subscribe(async () => {
      console.log('🔒 Auth error received - logging out...');
      await logout();
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Check auth on mount
  useEffect(() => {
    checkAuth();
  }, []);

  const value: AuthContextType = {
    isLoading,
    isAuthenticated,
    user,
    checkAuth,
    setUser,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

/**
 * Hook to use auth context
 */
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
};

export default AuthContext;
