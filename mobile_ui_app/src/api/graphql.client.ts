/**
 * GraphQL Client for Doctor Service via API Gateway
 * Provides type-safe GraphQL queries and mutations through the API Gateway
 */

import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { API_CONFIG } from '../constants/config';
import {
  getAccessToken,
  refreshAccessToken,
  removeTokens,
} from '../services/auth.service';
import { authEvents } from '../utils/authEvents';

// Auth requirement: try refresh once, then force logout/login.
const MAX_RETRIES = 1;

// Flag to prevent multiple simultaneous refresh attempts
let isRefreshing = false;
let refreshSubscribers: Array<(token: string) => void> = [];

/**
 * Subscribe to token refresh
 */
const subscribeTokenRefresh = (cb: (token: string) => void) => {
  refreshSubscribers.push(cb);
};

/**
 * Notify all subscribers of new token
 */
const onTokenRefreshed = (token: string) => {
  refreshSubscribers.forEach(cb => cb(token));
  refreshSubscribers = [];
};

class GraphQLClient {
  private client: AxiosInstance;
  private endpoint: string;

  constructor() {
    // Use API Gateway GraphQL endpoint instead of direct doctor service
    this.endpoint = API_CONFIG.GRAPHQL_URL;

    console.log('[GraphQL Client] Initializing with endpoint:', this.endpoint);

    this.client = axios.create({
      baseURL: this.endpoint,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: API_CONFIG.TIMEOUT,
    });

    // Add request interceptor to inject auth token
    this.client.interceptors.request.use(
      async config => {
        const token = await getAccessToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
          console.log('[GraphQL Client] Added auth token to request');
        } else {
          console.warn('[GraphQL Client] No auth token found');
        }
        return config;
      },
      error => Promise.reject(error),
    );

    // Add response interceptor for authentication error handling with token refresh
    this.client.interceptors.response.use(
      response => {
        // Check for GraphQL errors with authentication codes
        if (response.data?.errors) {
          const hasAuthError = response.data.errors.some(
            (err: any) =>
              err.extensions?.code === 'UNAUTHENTICATED' ||
              err.extensions?.statusCode === 401 ||
              err.message?.toLowerCase().includes('authentication'),
          );

          if (hasAuthError) {
            console.log(
              '[GraphQL Client] Authentication error detected in response',
            );
            // Don't reject here, let the query/mutation methods handle it
          }
        }
        return response;
      },
      async error => {
        const originalRequest = error.config as InternalAxiosRequestConfig & {
          _retryCount?: number;
        };

        // Initialize retry count
        if (!originalRequest._retryCount) {
          originalRequest._retryCount = 0;
        }

        // Check for authentication errors (401 status or UNAUTHENTICATED GraphQL error)
        const isAuthError =
          error.response?.status === 401 ||
          error.response?.data?.errors?.some(
            (err: any) =>
              err.extensions?.code === 'UNAUTHENTICATED' ||
              err.extensions?.statusCode === 401 ||
              err.message?.toLowerCase().includes('authentication'),
          );

        if (
          isAuthError &&
          originalRequest &&
          originalRequest._retryCount < MAX_RETRIES
        ) {
          originalRequest._retryCount += 1;
          console.log(
            `🔄 [GraphQL Client] Retry attempt ${originalRequest._retryCount}/${MAX_RETRIES}`,
          );

          if (!isRefreshing) {
            isRefreshing = true;

            try {
              console.log(
                '🔄 [GraphQL Client] Token expired, attempting refresh...',
              );
              const tokens = await refreshAccessToken();

              if (tokens) {
                console.log('✅ [GraphQL Client] Token refreshed successfully');
                isRefreshing = false;

                // Notify all waiting requests
                onTokenRefreshed(tokens.accessToken);

                // Retry the original request
                if (originalRequest.headers) {
                  originalRequest.headers.Authorization = `Bearer ${tokens.accessToken}`;
                }
                return this.client(originalRequest);
              } else {
                throw new Error('Token refresh failed');
              }
            } catch (refreshError) {
              console.error(
                '❌ [GraphQL Client] Token refresh failed:',
                refreshError,
              );
              isRefreshing = false;
              refreshSubscribers = [];

              // Clear all auth data
              await removeTokens();

              // Emit auth error to trigger app-wide logout
              console.log(
                '🚨 [GraphQL Client] Emitting auth error after failed refresh',
              );
              authEvents.emitAuthError();

              return Promise.reject({
                ...error,
                message: 'Session expired. Please log in again.',
                isAuthError: true,
              });
            }
          } else if (originalRequest._retryCount >= MAX_RETRIES) {
            // Max retries exceeded
            console.error(
              `❌ [GraphQL Client] Max retries (${MAX_RETRIES}) exceeded for auth error`,
            );
            await removeTokens();
            authEvents.emitAuthError();
            return Promise.reject({
              ...error,
              message:
                'Maximum retry attempts exceeded. Please try again later.',
              isAuthError: true,
            });
          }

          // Queue this request until token is refreshed
          return new Promise((resolve, reject) => {
            subscribeTokenRefresh((token: string) => {
              if (originalRequest.headers) {
                originalRequest.headers.Authorization = `Bearer ${token}`;
              }
              resolve(this.client(originalRequest));
            });
          });
        }

        return Promise.reject(error);
      },
    );
  }

  /**
   * Execute GraphQL query with automatic token refresh
   */
  async query<T = any>(
    query: string,
    variables?: Record<string, any>,
    retryCount: number = 0,
  ): Promise<T> {
    try {
      const response = await this.client.post('', {
        query,
        variables,
      });

      // Check for GraphQL errors in successful HTTP response
      if (response.data.errors) {
        const authError = response.data.errors.find(
          (err: any) =>
            err.extensions?.code === 'UNAUTHENTICATED' ||
            err.extensions?.statusCode === 401 ||
            err.message?.toLowerCase().includes('authentication'),
        );

        if (authError && retryCount < MAX_RETRIES) {
          console.log(
            `🔄 [GraphQL Client Query] Authentication error detected, attempting refresh... (Retry ${
              retryCount + 1
            }/${MAX_RETRIES})`,
          );

          if (!isRefreshing) {
            isRefreshing = true;

            try {
              const tokens = await refreshAccessToken();

              if (tokens) {
                console.log(
                  '✅ [GraphQL Client Query] Token refreshed successfully, retrying query...',
                );
                isRefreshing = false;
                onTokenRefreshed(tokens.accessToken);

                // Retry the query with new token
                return this.query<T>(query, variables, retryCount + 1);
              } else {
                throw new Error('Token refresh failed');
              }
            } catch (refreshError) {
              console.error(
                '❌ [GraphQL Client Query] Token refresh failed:',
                refreshError,
              );
              isRefreshing = false;
              refreshSubscribers = [];

              await removeTokens();
              console.log(
                '🚨 [GraphQL Client Query] Emitting auth error after failed refresh',
              );
              authEvents.emitAuthError();

              throw new Error('Session expired. Please log in again.');
            }
          } else {
            // Wait for ongoing refresh
            return new Promise<T>((resolve, reject) => {
              subscribeTokenRefresh(() => {
                console.log(
                  '🔄 [GraphQL Client Query] Using refreshed token from queue, retrying...',
                );
                this.query<T>(query, variables, retryCount + 1)
                  .then(resolve)
                  .catch(reject);
              });
            });
          }
        }

        if (authError && retryCount >= MAX_RETRIES) {
          // Max retries exceeded - must logout
          console.error(
            `❌ [GraphQL Client Query] Max retries (${MAX_RETRIES}) exceeded for authentication error`,
          );
          await removeTokens();
          authEvents.emitAuthError();
          throw new Error(
            'Maximum retry attempts exceeded. Please log in again.',
          );
        }

        // Non-auth GraphQL error
        throw new Error(response.data.errors[0]?.message || 'GraphQL Error');
      }

      return response.data.data;
    } catch (error: any) {
      // Handle axios errors (network errors, 401 HTTP status, etc.)
      if (error.response?.status === 401 && retryCount < MAX_RETRIES) {
        console.log(
          `🔄 [GraphQL Client Query] HTTP 401 detected, attempting refresh... (Retry ${
            retryCount + 1
          }/${MAX_RETRIES})`,
        );

        if (!isRefreshing) {
          isRefreshing = true;

          try {
            const tokens = await refreshAccessToken();

            if (tokens) {
              console.log(
                '✅ [GraphQL Client Query] Token refreshed, retrying...',
              );
              isRefreshing = false;
              onTokenRefreshed(tokens.accessToken);

              return this.query<T>(query, variables, retryCount + 1);
            } else {
              throw new Error('Token refresh failed');
            }
          } catch (refreshError) {
            console.error(
              '❌ [GraphQL Client Query] Refresh failed:',
              refreshError,
            );
            isRefreshing = false;
            refreshSubscribers = [];

            await removeTokens();
            authEvents.emitAuthError();

            throw new Error('Session expired. Please log in again.');
          }
        }
      }

      console.error('[GraphQL Client Query] Error:', error.message);
      throw error;
    }
  }

  /**
   * Execute GraphQL mutation with automatic token refresh
   */
  async mutate<T = any>(
    mutation: string,
    variables?: Record<string, any>,
    retryCount: number = 0,
  ): Promise<T> {
    try {
      console.log(
        '📤 [GraphQL Client Mutation] Variables:',
        JSON.stringify(variables, null, 2),
      );

      const response = await this.client.post('', {
        query: mutation,
        variables,
      });

      // Check for GraphQL errors in successful HTTP response
      if (response.data.errors) {
        const authError = response.data.errors.find(
          (err: any) =>
            err.extensions?.code === 'UNAUTHENTICATED' ||
            err.extensions?.statusCode === 401 ||
            err.message?.toLowerCase().includes('authentication'),
        );

        if (authError && retryCount < MAX_RETRIES) {
          console.log(
            `🔄 [GraphQL Client Mutation] Authentication error detected, attempting refresh... (Retry ${
              retryCount + 1
            }/${MAX_RETRIES})`,
          );

          if (!isRefreshing) {
            isRefreshing = true;

            try {
              const tokens = await refreshAccessToken();

              if (tokens) {
                console.log(
                  '✅ [GraphQL Client Mutation] Token refreshed successfully, retrying mutation...',
                );
                isRefreshing = false;
                onTokenRefreshed(tokens.accessToken);

                // Retry the mutation with new token
                return this.mutate<T>(mutation, variables, retryCount + 1);
              } else {
                throw new Error('Token refresh failed');
              }
            } catch (refreshError) {
              console.error(
                '❌ [GraphQL Client Mutation] Token refresh failed:',
                refreshError,
              );
              isRefreshing = false;
              refreshSubscribers = [];

              await removeTokens();
              console.log(
                '🚨 [GraphQL Client Mutation] Emitting auth error after failed refresh',
              );
              authEvents.emitAuthError();

              throw new Error('Session expired. Please log in again.');
            }
          } else {
            // Wait for ongoing refresh
            return new Promise<T>((resolve, reject) => {
              subscribeTokenRefresh(() => {
                console.log(
                  '🔄 [GraphQL Client Mutation] Using refreshed token from queue, retrying...',
                );
                this.mutate<T>(mutation, variables, retryCount + 1)
                  .then(resolve)
                  .catch(reject);
              });
            });
          }
        }

        if (authError && retryCount >= MAX_RETRIES) {
          // Max retries exceeded - must logout
          console.error(
            `❌ [GraphQL Client Mutation] Max retries (${MAX_RETRIES}) exceeded for authentication error`,
          );
          await removeTokens();
          authEvents.emitAuthError();
          throw new Error(
            'Maximum retry attempts exceeded. Please log in again.',
          );
        }

        // Non-auth GraphQL error
        console.error(
          '❌ [GraphQL Client Mutation] GraphQL Errors:',
          response.data.errors,
        );
        throw new Error(response.data.errors[0]?.message || 'GraphQL Error');
      }

      return response.data.data;
    } catch (error: any) {
      // Handle axios errors (network errors, 401 HTTP status, etc.)
      if (error.response?.status === 401 && retryCount < MAX_RETRIES) {
        console.log(
          `🔄 [GraphQL Client Mutation] HTTP 401 detected, attempting refresh... (Retry ${
            retryCount + 1
          }/${MAX_RETRIES})`,
        );

        if (!isRefreshing) {
          isRefreshing = true;

          try {
            const tokens = await refreshAccessToken();

            if (tokens) {
              console.log(
                '✅ [GraphQL Client Mutation] Token refreshed, retrying...',
              );
              isRefreshing = false;
              onTokenRefreshed(tokens.accessToken);

              return this.mutate<T>(mutation, variables, retryCount + 1);
            } else {
              throw new Error('Token refresh failed');
            }
          } catch (refreshError) {
            console.error(
              '❌ [GraphQL Client Mutation] Refresh failed:',
              refreshError,
            );
            isRefreshing = false;
            refreshSubscribers = [];

            await removeTokens();
            authEvents.emitAuthError();

            throw new Error('Session expired. Please log in again.');
          }
        }
      }

      console.error('[GraphQL Client Mutation] Error:', error.message);
      throw error;
    }
  }
}

// Create singleton instance
const graphqlClient = new GraphQLClient();

/**
 * Search doctors with comprehensive filters
 */
export const searchDoctors = async (filters: {
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
  const query = `
    query SearchDoctors($search: String, $filters: DoctorSearchFilters, $page: Int, $limit: Int, $sortBy: String, $sortOrder: String) {
      searchDoctors(search: $search, filters: $filters, page: $page, limit: $limit, sortBy: $sortBy, sortOrder: $sortOrder) {
        doctors {
          id
          userId
          firstName
          lastName
          email
          phone
          specializations
          experience
          rating
          reviewsCount
          consultationFee
          languages
          address {
            street
            city
            state
            zipCode
            country
          }
          profileImage
          bio
          isVerified
          isAvailable
          status
          totalPatients
          totalAppointments
        }
        pagination {
          page
          limit
          total
          totalPages
          hasNext
          hasPrev
        }
      }
    }
  `;

  const {
    search,
    page = 1,
    limit = 10,
    sortBy = 'rating',
    sortOrder = 'desc',
    ...filterFields
  } = filters;

  const variables = {
    search,
    filters: filterFields,
    page,
    limit,
    sortBy,
    sortOrder,
  };

  console.log(
    '🔍 GraphQL searchDoctors query variables:',
    JSON.stringify(variables, null, 2),
  );

  try {
    const result = await graphqlClient.query(query, variables);
    return result.searchDoctors;
  } catch (error: any) {
    console.error('❌ Error in searchDoctors:', error);
    throw new Error(error.message || 'Failed to search doctors');
  }
};

/**
 * Get doctor by ID
 */
export const getDoctorById = async (id: string) => {
  const query = `
    query GetDoctor($id: ID!) {
      getDoctor(id: $id) {
        id
        userId
        firstName
        lastName
        email
        phone
        specializations
        qualifications {
          degree
          institution
          year
          field
        }
        licenses {
          licenseNumber
          issuingAuthority
          state
          expiryDate
          isActive
        }
        experience
        rating
        reviewsCount
        consultationFee
        languages
        address {
          street
          city
          state
          zipCode
          country
        }
        profileImage
        bio
        awards
        affiliations
        services {
          name
          description
          duration
          fee
          category
        }
        isVerified
        isAvailable
        status
        totalPatients
        totalAppointments
        createdAt
        updatedAt
      }
    }
  `;

  try {
    const result = await graphqlClient.query(query, { id });
    return result.getDoctor;
  } catch (error: any) {
    console.error('❌ Error in getDoctorById:', error);
    throw new Error(error.message || 'Failed to get doctor details');
  }
};

/**
 * Get doctor availability (time slots)
 */
export const getDoctorAvailability = async (
  doctorId: string,
  startDate: string,
  endDate: string,
) => {
  const query = `
    query GetDoctorAvailability($doctorId: ID!, $startDate: String!, $endDate: String!) {
      getDoctorAvailability(doctorId: $doctorId, startDate: $startDate, endDate: $endDate) {
        date
        startTime
        endTime
        status
        appointmentId
        notes
      }
    }
  `;

  try {
    const result = await graphqlClient.query(query, {
      doctorId,
      startDate,
      endDate,
    });
    return result.getDoctorAvailability;
  } catch (error: any) {
    console.error('❌ Error in getDoctorAvailability:', error);
    throw new Error(error.message || 'Failed to get doctor availability');
  }
};

/**
 * Get doctors by specialization
 */
export const getDoctorsBySpecialization = async (
  specialization: string,
  page: number = 1,
  limit: number = 10,
) => {
  const query = `
    query GetDoctorsBySpecialization($specialization: String!, $page: Int, $limit: Int) {
      getDoctorsBySpecialization(specialization: $specialization, page: $page, limit: $limit) {
        doctors {
          id
          userId
          firstName
          lastName
          specializations
          experience
          rating
          reviewsCount
          consultationFee
          languages
          address {
            city
            state
          }
          profileImage
          isVerified
          isAvailable
        }
        pagination {
          page
          limit
          total
          totalPages
          hasNext
          hasPrev
        }
      }
    }
  `;

  try {
    const result = await graphqlClient.query(query, {
      specialization,
      page,
      limit,
    });
    return result.getDoctorsBySpecialization;
  } catch (error: any) {
    console.error('❌ Error in getDoctorsBySpecialization:', error);
    throw new Error(error.message || 'Failed to get doctors by specialization');
  }
};

/**
 * Get popular specializations
 */
export const getPopularSpecializations = async (limit: number = 10) => {
  const query = `
    query GetPopularSpecializations($limit: Int) {
      getPopularSpecializations(limit: $limit) {
        specialization
        count
        avgRating
        avgFee
      }
    }
  `;

  try {
    const result = await graphqlClient.query(query, { limit });
    return result.getPopularSpecializations;
  } catch (error: any) {
    console.error('❌ Error in getPopularSpecializations:', error);
    throw new Error(error.message || 'Failed to get popular specializations');
  }
};

export const getDoctorLocations = async (limit: number = 10) => {
  const query = `
    query GetDoctorLocations($limit: Int) {
      getDoctorLocations(limit: $limit) {
        city
        state
        count
      }
    }
  `;

  try {
    const result = await graphqlClient.query(query, { limit });
    return result.getDoctorLocations;
  } catch (error: any) {
    console.error('❌ Error in getDoctorLocations:', error);
    throw new Error(error.message || 'Failed to get doctor locations');
  }
};

/**
 * Reserve a time slot (mutation)
 */
export const reserveSlot = async (slotData: {
  doctorId: string;
  date: string;
  startTime: string;
  endTime: string;
  userId: string;
  appointmentId?: string;
}) => {
  const mutation = `
    mutation ReserveSlot($input: SlotReservationInput!) {
      reserveSlot(input: $input) {
        date
        startTime
        endTime
        status
        appointmentId
      }
    }
  `;

  try {
    const result = await graphqlClient.mutate(mutation, { input: slotData });
    return result.reserveSlot;
  } catch (error: any) {
    console.error('❌ Error in reserveSlot:', error);
    throw new Error(error.message || 'Failed to reserve slot');
  }
};

/**
 * Release a reserved slot (mutation)
 */
export const releaseSlot = async (
  doctorId: string,
  date: string,
  startTime: string,
) => {
  const mutation = `
    mutation ReleaseSlot($doctorId: ID!, $date: String!, $startTime: String!) {
      releaseSlot(doctorId: $doctorId, date: $date, startTime: $startTime) {
        date
        startTime
        endTime
        status
      }
    }
  `;

  try {
    const result = await graphqlClient.mutate(mutation, {
      doctorId,
      date,
      startTime,
    });
    return result.releaseSlot;
  } catch (error: any) {
    console.error('❌ Error in releaseSlot:', error);
    throw new Error(error.message || 'Failed to release slot');
  }
};

/**
 * ====================
 * APPOINTMENT OPERATIONS
 * ====================
 */

/**
 * Book a new appointment through GraphQL
 */
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
  const mutation = `
    mutation BookAppointment($input: BookAppointmentInput!) {
      bookAppointment(input: $input) {
        success
        message
        appointment {
          id
          patientId
          doctorId
          slotId
          title
          description
          status
          date
          startTime
          endTime
          appointmentNumber
          duration
          notes
          createdAt
          bookedAt
        }
        sagaId
        errors {
          message
          code
        }
      }
    }
  `;

  // Build input object, excluding empty strings and undefined values
  const input: any = {
    patientId: appointmentData.userId,
    doctorId: appointmentData.doctorId,
    date: appointmentData.date,
    startTime: appointmentData.startTime,
    reason: appointmentData.reason,
  };

  // Add optional fields only if they have values
  if (appointmentData.endTime) input.endTime = appointmentData.endTime;
  if (appointmentData.duration) input.duration = appointmentData.duration;
  if (appointmentData.notes?.trim()) input.notes = appointmentData.notes.trim();
  if (appointmentData.symptoms && appointmentData.symptoms.length > 0) {
    input.symptoms = appointmentData.symptoms;
  }

  // Add patientDetails only if we have the data
  if (
    appointmentData.firstName &&
    appointmentData.lastName &&
    appointmentData.email
  ) {
    input.patientDetails = {
      firstName: appointmentData.firstName,
      lastName: appointmentData.lastName,
      email: appointmentData.email,
    };

    // Add optional phone if present
    if (appointmentData.phone?.trim()) {
      input.patientDetails.phone = appointmentData.phone.trim();
    }

    // Add optional dateOfBirth if present (don't send empty string)
    if (appointmentData.dateOfBirth?.trim()) {
      input.patientDetails.dateOfBirth = appointmentData.dateOfBirth.trim();
    }
  }

  try {
    console.log(
      '📤 Booking appointment with input:',
      JSON.stringify(input, null, 2),
    );
    const result = await graphqlClient.mutate(mutation, { input });
    console.log('debugging appointment booking result', result);
    return result.bookAppointment;
  } catch (error: any) {
    throw new Error(
      error.response?.data?.errors?.[0]?.message ||
        error.message ||
        'Failed to book appointment',
    );
  }
};

/**
 * Get patient appointments
 */
export const getPatientAppointmentsGraphQL = async (
  patientId: string,
  status?: string,
  first?: number,
) => {
  const query = `
    query GetPatientAppointments($patientId: String!, $status: [AppointmentStatus!], $first: Int) {
      patientAppointments(patientId: $patientId, status: $status, first: $first) {
        edges {
          node {
            id
            patientId
            doctorId
            slotId
            title
            description
            status
            date
            endTime
            reason
            appointmentNumber
            doctor {
              id
              name
              specialization
            }
            startTime
            duration
            notes
            createdAt
            bookedAt
          }
        }
        pageInfo {
          hasNextPage
          hasPreviousPage
          startCursor
          endCursor
        }
        totalCount
      }
    }
  `;

  try {
    // Convert single status to array if provided
    const variables: any = { patientId, first: first || 20 };
    if (status) {
      variables.status = [status];
    }

    const result = await graphqlClient.query(query, variables);
    console.log('debugging patient appointments result', result);
    return result.patientAppointments;
  } catch (error: any) {
    console.error('❌ Error in getPatientAppointmentsGraphQL:', error);
    throw new Error(error.message || 'Failed to get appointments');
  }
};

export default graphqlClient;
