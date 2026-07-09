/**
 * Auth API Service
 */

import { httpClient } from "./httpClient";
import { API_ENDPOINTS } from "../constants/apiEndpoints";
import type {
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RegisterResponse,
} from "../types/auth.types";

export const loginApi = async (
  payload: LoginRequest,
): Promise<LoginResponse> => {
  const response = await httpClient.post<LoginResponse>(
    API_ENDPOINTS.AUTH.LOGIN,
    payload,
  );
  return response.data;
};

export const registerApi = async (
  payload: RegisterRequest,
): Promise<RegisterResponse> => {
  const response = await httpClient.post<RegisterResponse>(
    API_ENDPOINTS.AUTH.REGISTER,
    payload,
  );
  return response.data;
};

export const logoutApi = async (): Promise<void> => {
  await httpClient.post(API_ENDPOINTS.AUTH.LOGOUT);
};

export const forgotPasswordApi = async (email: string): Promise<void> => {
  await httpClient.post(API_ENDPOINTS.AUTH.FORGOT_PASSWORD, { email });
};

export const resetPasswordApi = async (
  token: string,
  newPassword: string,
): Promise<void> => {
  await httpClient.post(API_ENDPOINTS.AUTH.RESET_PASSWORD, {
    token,
    newPassword,
  });
};
