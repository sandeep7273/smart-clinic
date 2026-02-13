/**
 * GraphQL Client for Doctor Service via API Gateway
 * Provides type-safe GraphQL queries and mutations through the API Gateway
 */

import axios, { AxiosInstance } from 'axios';
import { API_CONFIG } from '../constants/config';
import { getAccessToken } from '../services/auth.service';
import { authEvents } from '../utils/authEvents';

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
      async (config) => {
        const token = await getAccessToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
          console.log('[GraphQL Client] Added auth token to request');
        } else {
          console.warn('[GraphQL Client] No auth token found');
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Add response interceptor for 401 handling
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401) {
          authEvents.emitAuthError();
        }
        return Promise.reject(error);
      }
    );
  }

  /**
   * Execute GraphQL query
   */
  async query<T = any>(query: string, variables?: Record<string, any>): Promise<T> {
    try {
      const response = await this.client.post('', {
        query,
        variables,
      });

      if (response.data.errors) {
        throw new Error(response.data.errors[0]?.message || 'GraphQL Error');
      }

      return response.data.data;
    } catch (error: any) {
      console.error('GraphQL Query Error:', error);
      throw error;
    }
  }

  /**
   * Execute GraphQL mutation
   */
  async mutate<T = any>(mutation: string, variables?: Record<string, any>): Promise<T> {
    try {
      console.log('📤 GraphQL Mutation Variables:', JSON.stringify(variables, null, 2));
      
      const response = await this.client.post('', {
        query: mutation,
        variables,
      });

      if (response.data.errors) {
        console.error('❌ GraphQL Response Errors:', response.data.errors);
        throw new Error(response.data.errors[0]?.message || 'GraphQL Error');
      }

      return response.data.data;
    } catch (error: any) {
      console.error('GraphQL Mutation Error:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });
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

  const { search, page = 1, limit = 10, sortBy = 'rating', sortOrder = 'desc', ...filterFields } = filters;

  const variables = {
    search,
    filters: filterFields,
    page,
    limit,
    sortBy,
    sortOrder,
  };

  console.log('🔍 GraphQL searchDoctors query variables:', JSON.stringify(variables, null, 2));

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
export const getDoctorAvailability = async (doctorId: string, startDate: string, endDate: string) => {
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
    const result = await graphqlClient.query(query, { doctorId, startDate, endDate });
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
  limit: number = 10
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
    const result = await graphqlClient.query(query, { specialization, page, limit });
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
export const releaseSlot = async (doctorId: string, date: string, startTime: string) => {
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
    const result = await graphqlClient.mutate(mutation, { doctorId, date, startTime });
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
  if (appointmentData.firstName && appointmentData.lastName && appointmentData.email) {
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
    console.log('📤 Booking appointment with input:', JSON.stringify(input, null, 2));
    const result = await graphqlClient.mutate(mutation, { input });
    console.log("debugging appointment booking result", result);
    return result.bookAppointment;
  } catch (error: any) {
    throw new Error(error.response?.data?.errors?.[0]?.message || error.message || 'Failed to book appointment');
  }
};

/**
 * Get patient appointments
 */
export const getPatientAppointmentsGraphQL = async (
  patientId: string,
  status?: string,
  first?: number
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
    console.log("debugging patient appointments result", result);
    return result.patientAppointments;
  } catch (error: any) {
    console.error('❌ Error in getPatientAppointmentsGraphQL:', error);
    throw new Error(error.message || 'Failed to get appointments');
  }
};

/**
 * Get appointment by ID
 */
export const getAppointmentByIdGraphQL = async (appointmentId: string) => {
  const query = `
    query GetAppointment($id: ID!) {
      appointment(id: $id) {
        id
        patientId
        doctorId
        slotId
        title
        description
        status
        date
        startTime
        duration
        fee
        paymentStatus
        notes
        createdAt
        bookedAt
      }
    }
  `;

  try {
    const result = await graphqlClient.query(query, { id: appointmentId });
    return result.appointment;
  } catch (error: any) {
    console.error('❌ Error in getAppointmentByIdGraphQL:', error);
    throw new Error(error.message || 'Failed to get appointment');
  }
};

/**
 * Cancel appointment
 */
export const cancelAppointmentGraphQL = async (appointmentId: string, reason: string) => {
  const mutation = `
    mutation CancelAppointment($appointmentId: ID!, $reason: String) {
      cancelAppointment(appointmentId: $appointmentId, reason: $reason) {
        success
        message
        appointment {
          id
          status
          date
          startTime
        }
        errors {
          message
          code
        }
      }
    }
  `;

  try {
    const result = await graphqlClient.mutate(mutation, { appointmentId, reason });
    return result.cancelAppointment;
  } catch (error: any) {
    console.error('❌ Error in cancelAppointmentGraphQL:', error);
    throw new Error(error.message || 'Failed to cancel appointment');
  }
};

export default graphqlClient;
