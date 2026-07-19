import { httpClient } from './httpClient';
import { API_ENDPOINTS } from '../constants/apiEndpoints';
import {
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RegisterResponse,
} from '../types/auth.types';

/**
 * Authentication API Service
 * Handles all authentication-related API calls
 */

/**
 * Login user with email and password
 */
export const loginApi = async (
  payload: LoginRequest
): Promise<LoginResponse> => {
  const response = await httpClient.post<LoginResponse>(
    API_ENDPOINTS.AUTH.LOGIN,
    payload
  );
  return response.data;
};

/**
 * Register new user
 */
export const registerApi = async (
  payload: RegisterRequest
): Promise<RegisterResponse> => {
  const response = await httpClient.post<RegisterResponse>(
    API_ENDPOINTS.AUTH.REGISTER,
    payload
  );
  return response.data;
};

/**
 * Logout user
 */
export const logoutApi = async (): Promise<void> => {
  await httpClient.post(API_ENDPOINTS.AUTH.LOGOUT);
};

/**
 * Request password reset
 */
export const forgotPasswordApi = async (email: string): Promise<void> => {
  await httpClient.post(API_ENDPOINTS.AUTH.FORGOT_PASSWORD, { email });
};

/**
 * Reset password with token
 */
export const resetPasswordApi = async (
  token: string,
  newPassword: string
): Promise<void> => {
  await httpClient.post(API_ENDPOINTS.AUTH.RESET_PASSWORD, {
    token,
    newPassword,
  });
};
