/**
 * Authentication Types – identical to mobile app
 */

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  dateOfBirth?: string;
  profilePicture?: string;
  role: "patient" | "doctor" | "admin";
  tenantId: string;
  createdAt: string;
  updatedAt: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  data: {
    user: User;
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  };
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role?: "patient" | "doctor" | "admin";
  phoneNumber?: string;
  dateOfBirth?: string;
}

export interface RegisterResponse {
  success: boolean;
  message: string;
  data: {
    user: User;
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  };
}

export interface AuthError {
  success: false;
  message: string;
  errors?: Record<string, string[]>;
}
