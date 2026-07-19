import { createAsyncThunk } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { loginApi, logoutApi, registerApi } from '../../api/auth.api';
import { LoginRequest, RegisterRequest } from '../../types/auth.types';
import { saveTokens, getTokens, removeTokens } from '../../services/auth.service';

/**
 * Login User Thunk
 * Now uses secure Keychain storage for tokens
 */
export const loginUser = createAsyncThunk(
  'auth/login',
  async (payload: LoginRequest, { rejectWithValue }) => {
    try {
      const response = await loginApi(payload);
      
      // Store tokens securely in Keychain
      await saveTokens({
        accessToken: response.data.accessToken,
        refreshToken: response.data.refreshToken,
      });
      
      // Store user data in AsyncStorage (non-sensitive data)
      await AsyncStorage.setItem('user', JSON.stringify(response.data.user));
      
      return response.data;
    } catch (error: any) {
      console.error('Login error details:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Login failed';
      return rejectWithValue(errorMessage);
    }
  }
);

/**
 * Register User Thunk
 * Now uses secure Keychain storage for tokens
 */
export const registerUser = createAsyncThunk(
  'auth/register',
  async (payload: RegisterRequest, { rejectWithValue }) => {
    try {
      const response = await registerApi(payload);
      
      // Store tokens securely in Keychain
      await saveTokens({
        accessToken: response.data.accessToken,
        refreshToken: response.data.refreshToken,
      });
      
      // Store user data in AsyncStorage (non-sensitive data)
      await AsyncStorage.setItem('user', JSON.stringify(response.data.user));
      
      return response.data;
    } catch (error: any) {
      console.error('Registration error details:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Registration failed';
      return rejectWithValue(errorMessage);
    }
  }
);

/**
 * Logout User Thunk
 * Now uses secure storage removal
 */
export const logoutUser = createAsyncThunk(
  'auth/logout',
  async (_, { rejectWithValue }) => {
    try {
      await logoutApi();
      
      // Clear tokens from Keychain
      await removeTokens();
      
      // Clear user data from AsyncStorage
      await AsyncStorage.removeItem('user');
      
      return null;
    } catch (error: any) {
      // Even if API call fails, clear local data
      await removeTokens();
      await AsyncStorage.removeItem('user');
      return null;
    }
  }
);

/**
 * Check Authentication Status
 * Now uses Keychain for token retrieval
 */
export const checkAuthStatus = createAsyncThunk(
  'auth/checkStatus',
  async (_, { rejectWithValue }) => {
    try {
      // Get tokens from secure storage
      const tokens = await getTokens();
      
      // Get user data from AsyncStorage
      const userJson = await AsyncStorage.getItem('user');
      
      if (tokens && userJson) {
        return {
          user: JSON.parse(userJson),
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
        };
      }
      
      return null;
    } catch (error) {
      return rejectWithValue('Failed to check auth status');
    }
  }
);
