/**
 * GraphQL Client – Web version (same logic as mobile, localStorage-based auth)
 */

import axios from "axios";
import type { AxiosInstance, InternalAxiosRequestConfig } from "axios";
import { API_CONFIG } from "../constants/config";
import {
  getAccessToken,
  refreshAccessToken,
  removeTokens,
} from "../services/auth.service";
import { authEvents } from "../utils/authEvents";

// Auth requirement: try refresh once, then force logout/login.
const MAX_RETRIES = 1;
let isRefreshing = false;
let refreshSubscribers: Array<(token: string) => void> = [];

const subscribeTokenRefresh = (cb: (token: string) => void) => {
  refreshSubscribers.push(cb);
};
const onTokenRefreshed = (token: string) => {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
};

class GraphQLClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_CONFIG.GRAPHQL_URL,
      headers: { "Content-Type": "application/json" },
      timeout: API_CONFIG.TIMEOUT,
    });

    this.client.interceptors.request.use(
      (config) => {
        const token = getAccessToken();
        if (token) config.headers.Authorization = `Bearer ${token}`;
        return config;
      },
      (error) => Promise.reject(error),
    );

    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & {
          _retryCount?: number;
        };
        if (!originalRequest._retryCount) originalRequest._retryCount = 0;

        const isAuthError =
          error.response?.status === 401 ||
          error.response?.data?.errors?.some(
            (err: any) =>
              err.extensions?.code === "UNAUTHENTICATED" ||
              err.extensions?.statusCode === 401 ||
              err.message?.toLowerCase().includes("authentication required") ||
              err.message?.toLowerCase().includes("authentication"),
          );

        if (isAuthError && originalRequest._retryCount < MAX_RETRIES) {
          originalRequest._retryCount += 1;

          if (!isRefreshing) {
            isRefreshing = true;
            try {
              const tokens = await refreshAccessToken();
              if (tokens) {
                isRefreshing = false;
                onTokenRefreshed(tokens.accessToken);
                if (originalRequest.headers) {
                  originalRequest.headers.Authorization = `Bearer ${tokens.accessToken}`;
                }
                return this.client(originalRequest);
              }
              throw new Error("Token refresh failed");
            } catch {
              isRefreshing = false;
              refreshSubscribers = [];
              removeTokens();
              authEvents.emitAuthError();
              return Promise.reject(error);
            }
          }

          return new Promise((resolve, reject) => {
            subscribeTokenRefresh((token: string) => {
              if (originalRequest.headers) {
                originalRequest.headers.Authorization = `Bearer ${token}`;
              }
              resolve(this.client(originalRequest));
            });
            setTimeout(() => reject(error), API_CONFIG.TIMEOUT);
          });
        }

        // If auth still fails after retry, force sign-out and route to login.
        if (isAuthError && originalRequest._retryCount >= MAX_RETRIES) {
          removeTokens();
          authEvents.emitAuthError();
        }

        return Promise.reject(error);
      },
    );
  }

  async query<T = any>(
    query: string,
    variables?: Record<string, any>,
    retryCount = 0,
  ): Promise<T> {
    try {
      const response = await this.client.post("", { query, variables });

      if (response.data.errors) {
        const authErr = response.data.errors.find(
          (e: any) =>
            e.extensions?.code === "UNAUTHENTICATED" ||
            e.extensions?.statusCode === 401 ||
            e.message?.toLowerCase().includes("authentication required") ||
            e.message?.toLowerCase().includes("authentication"),
        );

        if (authErr && retryCount < MAX_RETRIES) {
          if (!isRefreshing) {
            isRefreshing = true;
            try {
              const tokens = await refreshAccessToken();
              if (tokens) {
                isRefreshing = false;
                onTokenRefreshed(tokens.accessToken);
                return this.query<T>(query, variables, retryCount + 1);
              }
              throw new Error("Token refresh failed");
            } catch {
              isRefreshing = false;
              refreshSubscribers = [];
              removeTokens();
              authEvents.emitAuthError();
              throw new Error("Session expired. Please log in again.");
            }
          } else {
            return new Promise<T>((resolve, reject) => {
              subscribeTokenRefresh(() => {
                this.query<T>(query, variables, retryCount + 1)
                  .then(resolve)
                  .catch(reject);
              });
            });
          }
        }

        if (authErr && retryCount >= MAX_RETRIES) {
          removeTokens();
          authEvents.emitAuthError();
          throw new Error("Session expired. Please log in again.");
        }

        throw new Error(response.data.errors[0]?.message || "GraphQL Error");
      }

      return response.data.data;
    } catch (error: any) {
      if (error.response?.status === 401 && retryCount < MAX_RETRIES) {
        if (!isRefreshing) {
          isRefreshing = true;
          try {
            const tokens = await refreshAccessToken();
            if (tokens) {
              isRefreshing = false;
              onTokenRefreshed(tokens.accessToken);
              return this.query<T>(query, variables, retryCount + 1);
            }
            throw new Error("Token refresh failed");
          } catch {
            isRefreshing = false;
            refreshSubscribers = [];
            removeTokens();
            authEvents.emitAuthError();
            throw new Error("Session expired. Please log in again.");
          }
        }
      }
      throw error;
    }
  }

  async mutate<T = any>(
    mutation: string,
    variables?: Record<string, any>,
    retryCount = 0,
  ): Promise<T> {
    return this.query<T>(mutation, variables, retryCount);
  }
}

const graphqlClient = new GraphQLClient();
export default graphqlClient;

// ── Doctor GraphQL Operations ──────────────────────────────────────────────

export const searchDoctors = async (params: {
  search?: string;
  specialization?: string;
  city?: string;
  state?: string;
  minRating?: number;
  maxFee?: number;
  language?: string;
  isAvailable?: boolean;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: string;
}) => {
  const {
    search,
    specialization,
    city,
    state,
    minRating,
    maxFee,
    language,
    isAvailable,
    page,
    limit,
    sortBy,
    sortOrder,
  } = params;

  // Build optional filters object – only include defined values
  const filters: Record<string, any> = {};
  if (specialization) filters.specialization = specialization;
  if (city) filters.city = city;
  if (state) filters.state = state;
  if (minRating !== undefined) filters.minRating = minRating;
  if (maxFee !== undefined) filters.maxFee = maxFee;
  if (language) filters.language = language;
  if (isAvailable !== undefined) filters.isAvailable = isAvailable;

  const SEARCH_DOCTORS = `
    query SearchDoctors(
      $search: String
      $filters: DoctorSearchFilters
      $page: Int
      $limit: Int
      $sortBy: String
      $sortOrder: String
    ) {
      searchDoctors(
        search: $search
        filters: $filters
        page: $page
        limit: $limit
        sortBy: $sortBy
        sortOrder: $sortOrder
      ) {
        doctors {
          id
          userId
          firstName
          lastName
          email
          phone
          specializations
          bio
          languages
          experience
          rating
          reviewsCount
          consultationFee
          status
          isVerified
          isAvailable
          profileImage
          address {
            street
            city
            state
            zipCode
            country
          }
          qualifications {
            degree
            institution
            year
            field
          }
          createdAt
          updatedAt
        }
        pagination {
          page
          limit
          total
          totalPages
        }
      }
    }
  `;
  const variables = {
    search,
    filters: Object.keys(filters).length > 0 ? filters : undefined,
    page,
    limit,
    sortBy,
    sortOrder,
  };
  const data = await graphqlClient.query(SEARCH_DOCTORS, variables);
  return data.searchDoctors;
};

export const getDoctorById = async (id: string) => {
  const GET_DOCTOR = `
    query GetDoctor($id: ID!) {
      doctor(id: $id) {
        id
        userId
        firstName
        lastName
        email
        phone
        specializations
        bio
        languages
        experience
        rating
        reviewsCount
        consultationFee
        status
        isVerified
        isAvailable
        profileImage
        address {
          street
          city
          state
          zipCode
          country
        }
        qualifications {
          degree
          institution
          year
          field
        }
        services {
          name
          description
          duration
          fee
          category
        }
        createdAt
        updatedAt
      }
    }
  `;
  const data = await graphqlClient.query(GET_DOCTOR, { id });
  return data.doctor;
};

export const getDoctorsBySpecialization = async (
  specialization: string,
  page = 1,
  limit = 20,
) => {
  return searchDoctors({ specialization, page, limit });
};

export const getPopularSpecializations = async () => {
  const QUERY = `
    query {
      getPopularSpecializations {
        specialization
        count
      }
    }
  `;
  const data = await graphqlClient.query(QUERY);
  return data.getPopularSpecializations || [];
};

export const getDoctorLocations = async () => {
  const QUERY = `
    query {
      getDoctorLocations {
        city
        state
        count
      }
    }
  `;
  const data = await graphqlClient.query(QUERY);
  return data.getDoctorLocations || [];
};

export const getDoctorAvailability = async (doctorId: string, date: string) => {
  const QUERY = `
    query GetDoctorAvailability($doctorId: ID!, $startDate: String!, $endDate: String!) {
      getDoctorAvailability(doctorId: $doctorId, startDate: $startDate, endDate: $endDate) {
        startTime
        endTime
        status
      }
    }
  `;
  const data = await graphqlClient.query(QUERY, {
    doctorId,
    startDate: date,
    endDate: date,
  });
  // Schema returns [TimeSlot] directly – no wrapper object
  return data.getDoctorAvailability;
};

// ── Appointment GraphQL Operations ─────────────────────────────────────────

export const bookAppointmentGraphQL = async (appointmentData: {
  userId: string;
  doctorId: string;
  date: string;
  startTime: string;
  endTime: string;
  duration?: number;
  reason: string;
  notes?: string;
  symptoms?: string[];
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  dateOfBirth?: string;
}) => {
  const MUTATION = `
    mutation BookAppointment($input: BookAppointmentInput!) {
      bookAppointment(input: $input) {
        success
        message
        sagaId
        appointment {
          id
          appointmentNumber
          patientId
          doctorId
          date
          startTime
          endTime
          duration
          status
        }
      }
    }
  `;
  const { userId, firstName, lastName, email, phone, dateOfBirth, ...rest } =
    appointmentData;
  const input = {
    ...rest,
    patientId: userId,
    patientDetails: { firstName, lastName, email, phone, dateOfBirth },
  };
  const data = await graphqlClient.mutate(MUTATION, { input });
  return data.bookAppointment;
};

export const getPatientAppointmentsGraphQL = async (
  patientId: string,
  status?: string,
  first?: number,
) => {
  const QUERY = `
    query GetPatientAppointments($patientId: String!, $status: [AppointmentStatus!], $first: Int) {
      patientAppointments(patientId: $patientId, status: $status, first: $first) {
        edges {
          node {
            id
            appointmentNumber
            patientId
            doctorId
            date
            startTime
            endTime
            duration
            status
            reason
            notes
            doctor {
              id
              name
              specialization
            }
            createdAt
            updatedAt
          }
        }
        totalCount
        pageInfo {
          hasNextPage
          hasPreviousPage
        }
      }
    }
  `;
  // status arg is [AppointmentStatus] – wrap single string in array, uppercased
  const statusList = status ? [status.toUpperCase()] : undefined;
  const data = await graphqlClient.query(QUERY, {
    patientId,
    status: statusList,
    first,
  });
  return data.patientAppointments;
};
