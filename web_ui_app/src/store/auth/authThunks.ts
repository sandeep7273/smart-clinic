import { createAsyncThunk } from "@reduxjs/toolkit";
import { loginApi, logoutApi, registerApi } from "../../api/auth.api";
import type { LoginRequest, RegisterRequest } from "../../types/auth.types";
import {
  saveTokens,
  getTokens,
  removeTokens,
} from "../../services/auth.service";

const USER_STORAGE_KEY = "smart_clinic_user";

export const loginUser = createAsyncThunk(
  "auth/login",
  async (payload: LoginRequest, { rejectWithValue }) => {
    try {
      const response = await loginApi(payload);
      saveTokens({
        accessToken: response.data.accessToken,
        refreshToken: response.data.refreshToken,
      });
      localStorage.setItem(
        USER_STORAGE_KEY,
        JSON.stringify(response.data.user),
      );
      return response.data;
    } catch (error: any) {
      const message =
        error.response?.data?.message || error.message || "Login failed";
      return rejectWithValue(message);
    }
  },
);

export const registerUser = createAsyncThunk(
  "auth/register",
  async (payload: RegisterRequest, { rejectWithValue }) => {
    try {
      const response = await registerApi(payload);
      saveTokens({
        accessToken: response.data.accessToken,
        refreshToken: response.data.refreshToken,
      });
      localStorage.setItem(
        USER_STORAGE_KEY,
        JSON.stringify(response.data.user),
      );
      return response.data;
    } catch (error: any) {
      const message =
        error.response?.data?.message || error.message || "Registration failed";
      return rejectWithValue(message);
    }
  },
);

export const logoutUser = createAsyncThunk("auth/logout", async () => {
  try {
    await logoutApi();
  } catch {
    // Ignore API errors on logout
  } finally {
    removeTokens();
    localStorage.removeItem(USER_STORAGE_KEY);
  }
  return null;
});

export const checkAuthStatus = createAsyncThunk(
  "auth/checkStatus",
  async (_, { rejectWithValue }) => {
    try {
      const tokens = getTokens();
      const userJson = localStorage.getItem(USER_STORAGE_KEY);
      if (tokens && userJson) {
        return {
          user: JSON.parse(userJson),
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
        };
      }
      return null;
    } catch {
      return rejectWithValue("Failed to check auth status");
    }
  },
);
