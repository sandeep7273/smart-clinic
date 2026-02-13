/**
 * Token Expiry Auto-Logout Tests
 * Verifies automatic logout functionality when JWT token expires
 */

import { renderHook, act, waitFor } from '@testing-library/react-hooks';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as authService from '../src/services/auth.service';
import { AuthProvider, useAuth } from '../src/context/AuthContext';

// Mock dependencies
jest.mock('@react-native-async-storage/async-storage');
jest.mock('../src/services/auth.service');
jest.mock('react-native/Libraries/AppState/AppState', () => ({
  addEventListener: jest.fn(),
  currentState: 'active',
}));

describe('Token Expiry Auto-Logout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('Token Expiry Detection', () => {
    it('should detect expired token and logout automatically', async () => {
      // Mock tokens that are expired
      const mockTokens = {
        accessToken: 'expired.token.here',
        refreshToken: 'refresh.token.here',
      };

      (authService.getTokens as jest.Mock).mockResolvedValue(mockTokens);
      (authService.initializeAuth as jest.Mock).mockResolvedValue({
        isAuthenticated: true,
        needsRefresh: false,
      });
      (authService.getAccessToken as jest.Mock).mockResolvedValue(
        mockTokens.accessToken
      );
      (authService.isTokenExpired as jest.Mock).mockReturnValue(true);
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify({ id: '1', email: 'test@example.com' })
      );

      const { result, waitForNextUpdate } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      // Wait for initial auth check
      await waitForNextUpdate();

      // User should be authenticated initially
      expect(result.current.isAuthenticated).toBe(true);

      // Fast-forward 60 seconds (one check interval)
      act(() => {
        jest.advanceTimersByTime(60 * 1000);
      });

      // Wait for logout to complete
      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(false);
      });

      // Verify tokens were removed
      expect(authService.removeTokens).toHaveBeenCalled();
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('user');
    });

    it('should not logout if token is still valid', async () => {
      const mockTokens = {
        accessToken: 'valid.token.here',
        refreshToken: 'refresh.token.here',
      };

      (authService.getTokens as jest.Mock).mockResolvedValue(mockTokens);
      (authService.initializeAuth as jest.Mock).mockResolvedValue({
        isAuthenticated: true,
        needsRefresh: false,
      });
      (authService.getAccessToken as jest.Mock).mockResolvedValue(
        mockTokens.accessToken
      );
      (authService.isTokenExpired as jest.Mock).mockReturnValue(false);
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify({ id: '1', email: 'test@example.com' })
      );

      const { result, waitForNextUpdate } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitForNextUpdate();

      expect(result.current.isAuthenticated).toBe(true);

      // Fast-forward 60 seconds
      act(() => {
        jest.advanceTimersByTime(60 * 1000);
      });

      // Should still be authenticated
      expect(result.current.isAuthenticated).toBe(true);
      expect(authService.removeTokens).not.toHaveBeenCalled();
    });
  });

  describe('App State Changes', () => {
    it('should check token validity when app comes to foreground', async () => {
      let appStateListener: ((state: string) => void) | null = null;

      (AppState.addEventListener as jest.Mock).mockImplementation(
        (event, callback) => {
          appStateListener = callback;
          return { remove: jest.fn() };
        }
      );

      const mockTokens = {
        accessToken: 'valid.token.here',
        refreshToken: 'refresh.token.here',
      };

      (authService.getTokens as jest.Mock).mockResolvedValue(mockTokens);
      (authService.initializeAuth as jest.Mock).mockResolvedValue({
        isAuthenticated: true,
        needsRefresh: false,
      });
      (authService.getAccessToken as jest.Mock).mockResolvedValue(
        mockTokens.accessToken
      );
      (authService.isTokenExpired as jest.Mock).mockReturnValue(true);
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify({ id: '1', email: 'test@example.com' })
      );

      const { result, waitForNextUpdate } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitForNextUpdate();

      // Simulate app going to background then coming back to foreground
      act(() => {
        if (appStateListener) {
          appStateListener('background');
          appStateListener('active');
        }
      });

      // Wait for logout to complete
      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(false);
      });

      expect(authService.removeTokens).toHaveBeenCalled();
    });
  });

  describe('Token Expiry Calculation', () => {
    it('should correctly decode JWT token expiry', () => {
      // Create a mock JWT token with 15 minute expiry
      const now = Date.now();
      const exp = Math.floor((now + 15 * 60 * 1000) / 1000); // 15 min in future, in seconds
      
      const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString(
        'base64'
      );
      const payload = Buffer.from(JSON.stringify({ exp, userId: '123' })).toString(
        'base64'
      );
      const signature = 'mock_signature';
      
      const mockToken = `${header}.${payload}.${signature}`;

      const expiry = authService.getTokenExpiration(mockToken);

      // Should return timestamp in milliseconds (exp * 1000)
      expect(expiry).toBe(exp * 1000);
    });

    it('should return 15 minute default for mock tokens', () => {
      const mockToken = 'mock_token_12345';
      const beforeTime = Date.now();
      const expiry = authService.getTokenExpiration(mockToken);
      const afterTime = Date.now();

      // Should be approximately 15 minutes from now
      expect(expiry).toBeGreaterThanOrEqual(beforeTime + 15 * 60 * 1000);
      expect(expiry).toBeLessThanOrEqual(afterTime + 15 * 60 * 1000 + 100); // +100ms tolerance
    });

    it('should detect expired tokens correctly', () => {
      // Create a token that expired 1 minute ago
      const now = Date.now();
      const expiredTime = Math.floor((now - 60 * 1000) / 1000); // 1 min ago, in seconds
      
      const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString(
        'base64'
      );
      const payload = Buffer.from(
        JSON.stringify({ exp: expiredTime, userId: '123' })
      ).toString('base64');
      const signature = 'mock_signature';
      
      const expiredToken = `${header}.${payload}.${signature}`;

      const isExpired = authService.isTokenExpired(expiredToken);
      expect(isExpired).toBe(true);
    });
  });

  describe('Cleanup', () => {
    it('should clear interval when logging out', async () => {
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');

      const mockTokens = {
        accessToken: 'valid.token.here',
        refreshToken: 'refresh.token.here',
      };

      (authService.getTokens as jest.Mock).mockResolvedValue(mockTokens);
      (authService.initializeAuth as jest.Mock).mockResolvedValue({
        isAuthenticated: true,
        needsRefresh: false,
      });
      (authService.getAccessToken as jest.Mock).mockResolvedValue(
        mockTokens.accessToken
      );
      (authService.isTokenExpired as jest.Mock).mockReturnValue(false);
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify({ id: '1', email: 'test@example.com' })
      );

      const { result, waitForNextUpdate } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitForNextUpdate();

      // Manually trigger logout
      await act(async () => {
        await result.current.logout();
      });

      // Verify interval was cleared
      expect(clearIntervalSpy).toHaveBeenCalled();
    });
  });
});
