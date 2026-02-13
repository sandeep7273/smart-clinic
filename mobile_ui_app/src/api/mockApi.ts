/**
 * Dummy API Mock Server
 * 
 * This file simulates API responses for local development and testing.
 * In production, replace API_MODE in config.ts to 'production'
 * 
 * To use:
 * 1. Keep API_MODE as 'dummy' in config.ts
 * 2. Import and use mockApiInterceptor in App.tsx during development
 */

import MockAdapter from 'axios-mock-adapter';
import { httpClient } from './httpClient';
import { API_ENDPOINTS } from '../constants/apiEndpoints';
import { LoginResponse, RegisterResponse } from '../types/auth.types';

// Create mock adapter
const mock = new MockAdapter(httpClient, { delayResponse: 800 });

/**
 * Mock Users Database
 */
const mockUsers = [
  {
    id: 'user-001',
    email: 'patient@test.com',
    password: 'password123', // In real app, this would be hashed
    firstName: 'John',
    lastName: 'Doe',
    phoneNumber: '+1234567890',
    dateOfBirth: '1990-01-15',
    profilePicture: 'https://i.pravatar.cc/150?img=1',
    role: 'patient',
    tenantId: 'tenant-001',
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
  },
  {
    id: 'user-002',
    email: 'doctor@test.com',
    password: 'password123',
    firstName: 'Jane',
    lastName: 'Smith',
    phoneNumber: '+1234567891',
    role: 'doctor',
    tenantId: 'tenant-001',
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
  },
];

/**
 * Initialize Mock API Interceptors
 */
export const initializeMockApi = () => {
  console.log('🔧 Mock API Server initialized');

  /**
   * POST /auth/login
   */
  mock.onPost(API_ENDPOINTS.AUTH.LOGIN).reply(config => {
    const { email, password } = JSON.parse(config.data);

    // Find user
    const user = mockUsers.find(u => u.email === email);

    // Validate credentials
    if (!user || user.password !== password) {
      return [
        401,
        {
          success: false,
          message: 'Invalid email or password',
          errors: {
            auth: ['Invalid credentials'],
          },
        },
      ];
    }

    // Generate mock tokens
    const mockAccessToken = `mock_access_token_${user.id}_${Date.now()}`;
    const mockRefreshToken = `mock_refresh_token_${user.id}_${Date.now()}`;

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    const response: LoginResponse = {
      success: true,
      message: 'Login successful',
      data: {
        user: userWithoutPassword as any,
        accessToken: mockAccessToken,
        refreshToken: mockRefreshToken,
        expiresIn: 3600,
      },
    };

    return [200, response];
  });

  /**
   * POST /auth/register
   */
  mock.onPost(API_ENDPOINTS.AUTH.REGISTER).reply(config => {
    const data = JSON.parse(config.data);

    // Check if user already exists
    const existingUser = mockUsers.find(u => u.email === data.email);
    if (existingUser) {
      return [
        400,
        {
          success: false,
          message: 'User already exists',
          errors: {
            email: ['Email already registered'],
          },
        },
      ];
    }

    // Create new user
    const newUser = {
      id: `user-${Date.now()}`,
      email: data.email,
      password: data.password,
      firstName: data.firstName,
      lastName: data.lastName,
      phoneNumber: data.phoneNumber,
      dateOfBirth: data.dateOfBirth,
      role: 'patient' as const,
      tenantId: 'tenant-001',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    mockUsers.push(newUser);

    const { password: _, ...userWithoutPassword } = newUser;

    const response: RegisterResponse = {
      success: true,
      message: 'Registration successful',
      data: {
        user: userWithoutPassword as any,
        accessToken: `mock_access_token_${newUser.id}_${Date.now()}`,
        refreshToken: `mock_refresh_token_${newUser.id}_${Date.now()}`,
      },
    };

    return [201, response];
  });

  /**
   * POST /auth/logout
   */
  mock.onPost(API_ENDPOINTS.AUTH.LOGOUT).reply(() => {
    return [
      200,
      {
        success: true,
        message: 'Logout successful',
      },
    ];
  });

  /**
   * POST /auth/forgot-password
   */
  mock.onPost(API_ENDPOINTS.AUTH.FORGOT_PASSWORD).reply(config => {
    const { email } = JSON.parse(config.data);

    const user = mockUsers.find(u => u.email === email);
    if (!user) {
      return [
        404,
        {
          success: false,
          message: 'User not found',
        },
      ];
    }

    return [
      200,
      {
        success: true,
        message: 'Password reset email sent',
      },
    ];
  });

  /**
   * POST /auth/refresh
   * Refresh access token using refresh token
   */
  mock.onPost(API_ENDPOINTS.AUTH.REFRESH_TOKEN).reply(config => {
    const { refreshToken } = JSON.parse(config.data);

    // Validate refresh token format
    if (!refreshToken || !refreshToken.startsWith('mock_refresh_token_')) {
      return [
        401,
        {
          success: false,
          message: 'Invalid refresh token',
        },
      ];
    }

    // Extract user ID from refresh token (mock implementation)
    const tokenParts = refreshToken.split('_');
    const userId = tokenParts[3];

    // Find user by ID
    const user = mockUsers.find(u => u.id === userId);

    if (!user) {
      return [
        401,
        {
          success: false,
          message: 'Invalid refresh token',
        },
      ];
    }

    // Generate new tokens
    const newAccessToken = `mock_access_token_${user.id}_${Date.now()}`;
    const newRefreshToken = `mock_refresh_token_${user.id}_${Date.now()}`;

    return [
      200,
      {
        success: true,
        message: 'Token refreshed successfully',
        data: {
          accessToken: newAccessToken,
          refreshToken: newRefreshToken,
          expiresIn: 3600,
        },
      },
    ];
  });

  /**
   * GET /users/profile
   */
  mock.onGet(API_ENDPOINTS.USER.PROFILE).reply(() => {
    const { password: _, ...user } = mockUsers[0];
    return [
      200,
      {
        success: true,
        data: user,
      },
    ];
  });

  console.log('✅ Mock API routes configured');
  console.log('📧 Test credentials: patient@test.com / password123');
};

/**
 * Reset mock adapter (useful for testing)
 */
export const resetMockApi = () => {
  mock.reset();
};

/**
 * Get mock users (for development/testing)
 */
export const getMockUsers = () => mockUsers;
