/**
 * Doctor API Service
 * All API calls related to doctor operations
 * Uses GraphQL through API Gateway instead of direct REST calls
 */

import {
  searchDoctors as graphqlSearchDoctors,
  getDoctorById as graphqlGetDoctorById,
  getDoctorsBySpecialization as graphqlGetDoctorsBySpecialization,
  getPopularSpecializations,
  getDoctorAvailability,
} from './graphql.client';
import {
  DoctorListParams,
  DoctorSearchParams,
  DoctorListResponse,
  DoctorDetailResponse,
  FilterOptions,
  AvailableDoctorsParams,
} from '../types/doctor.types';

/**
 * Get all doctors with pagination and sorting
 * Internally uses GraphQL searchDoctors with no filters
 */
export const getDoctors = async (params: DoctorListParams = {}): Promise<DoctorListResponse> => {
  const {
    page = 1,
    limit = 50,
    sortBy = 'rating',
    sortOrder = 'desc',
    status = 'active',
  } = params;

  try {
    const result = await graphqlSearchDoctors({
      page,
      limit,
      sortBy,
      sortOrder,
    });

    return {
      success: true,
      data: result.doctors || [],
      pagination: {
        page: result.pagination?.page || page,
        limit: result.pagination?.limit || limit,
        total: result.pagination?.total || 0,
        pages: result.pagination?.totalPages || 0, // Map totalPages to pages
      },
    };
  } catch (error: any) {
    console.error('Error fetching doctors via GraphQL:', error);
    return {
      success: false,
      data: [],
      pagination: {
        page: 1,
        limit,
        total: 0,
        pages: 0,
      },
      error: error.message || 'Failed to fetch doctors',
    };
  }
};

/**
 * Search doctors with advanced filters
 * Uses GraphQL searchDoctors with filters
 */
export const searchDoctors = async (params: DoctorSearchParams): Promise<DoctorListResponse> => {
  try {
    const {
      search,
      specialization,
      city,
      state,
      minRating,
      maxFee,
      language,
      isAvailable,
      page = 1,
      limit = 50,
      sortBy = 'rating',
      sortOrder = 'desc',
    } = params;

    const result = await graphqlSearchDoctors({
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
    });

    return {
      success: true,
      data: result.doctors || [],
      pagination: {
        page: result.pagination?.page || page,
        limit: result.pagination?.limit || limit,
        total: result.pagination?.total || 0,
        pages: result.pagination?.totalPages || 0,
      },
    };
  } catch (error: any) {
    console.error('Error searching doctors via GraphQL:', error);
    return {
      success: false,
      data: [],
      pagination: {
        page: 1,
        limit: params.limit || 50,
        total: 0,
        pages: 0,
      },
      error: error.message || 'Failed to search doctors',
    };
  }
};

/**
 * Get single doctor by ID
 */
export const getDoctorById = async (id: string): Promise<DoctorDetailResponse> => {
  try {
    const doctor = await graphqlGetDoctorById(id);
    return {
      success: true,
      data: doctor,
    };
  } catch (error: any) {
    console.error('Error fetching doctor by ID via GraphQL:', error);
    return {
      success: false,
      data: null,
      error: error.message || 'Failed to fetch doctor details',
    };
  }
};

/**
 * Get available doctors for a specific date
 * Uses searchDoctors with isAvailable filter
 */
export const getAvailableDoctors = async (
  params: AvailableDoctorsParams
): Promise<DoctorListResponse> => {
  try {
    const {
      date,
      specialization,
      page = 1,
      limit = 50,
    } = params;

    // Use searchDoctors with isAvailable=true filter
    const result = await graphqlSearchDoctors({
      isAvailable: true,
      specialization,
      page,
      limit,
      sortBy: 'rating',
      sortOrder: 'desc',
    });

    return {
      success: true,
      data: result.doctors || [],
      pagination: {
        page: result.pagination?.page || page,
        limit: result.pagination?.limit || limit,
        total: result.pagination?.total || 0,
        pages: result.pagination?.totalPages || 0,
      },
    };
  } catch (error: any) {
    console.error('Error fetching available doctors via GraphQL:', error);
    return {
      success: false,
      data: [],
      pagination: {
        page: 1,
        limit: params.limit || 50,
        total: 0,
        pages: 0,
      },
      error: error.message || 'Failed to fetch available doctors',
    };
  }
};

/**
 * Get doctors by specialization
 */
export const getDoctorsBySpecialization = async (
  specialization: string,
  page = 1,
  limit = 50
): Promise<DoctorListResponse> => {
  try {
    const result = await graphqlGetDoctorsBySpecialization(specialization, page, limit);
    return {
      success: true,
      data: result.doctors || [],
      pagination: {
        page: result.pagination?.page || page,
        limit: result.pagination?.limit || limit,
        total: result.pagination?.total || 0,
        pages: result.pagination?.totalPages || 0,
      },
    };
  } catch (error: any) {
    console.error('Error fetching doctors by specialization via GraphQL:', error);
    return {
      success: false,
      data: [],
      pagination: {
        page,
        limit,
        total: 0,
        pages: 0,
      },
      error: error.message || 'Failed to fetch doctors by specialization',
    };
  }
};

/**
 * Get filter options (specializations, locations, conditions, symptoms)
 * Uses getPopularSpecializations for now
 */
export const getFilterOptions = async (): Promise<FilterOptions> => {
  try {
    const specializations = await getPopularSpecializations(50);
    
    // Transform GraphQL response to match FilterOptions type
    return {
      success: true,
      data: {
        specializations: specializations.map((s: any) => s.specialization),
        locations: [], // TODO: Add location query if needed
        conditions: [],
        symptoms: [],
      },
    };
  } catch (error: any) {
    console.error('Error fetching filter options via GraphQL:', error);
    return {
      success: false,
      data: {
        specializations: [],
        locations: [],
        conditions: [],
        symptoms: [],
      },
      error: error.message || 'Failed to fetch filter options',
    };
  }
};

/**
 * Get doctor statistics
 * Note: This might not be available in GraphQL yet
 */
export const getDoctorStats = async (doctorId: string): Promise<any> => {
  // For now, return basic stats from getDoctorById
  try {
    const doctor = await graphqlGetDoctorById(doctorId);
    return {
      success: true,
      data: {
        totalPatients: doctor.totalPatients || 0,
        totalAppointments: doctor.totalAppointments || 0,
        rating: doctor.rating || 0,
        reviewsCount: doctor.reviewsCount || 0,
      },
    };
  } catch (error: any) {
    console.error('Error fetching doctor stats via GraphQL:', error);
    return {
      success: false,
      data: null,
      error: error.message || 'Failed to fetch doctor statistics',
    };
  }
};

/**
 * Get doctor's available slots for a date
 * Fetches from doctor service via GraphQL which generates slots and checks availability
 */
export const getDoctorAvailableSlots = async (
  doctorId: string,
  date: string
): Promise<{ success: boolean; data: { slots: Array<{ startTime: string; endTime: string; available: boolean }> } }> => {
  try {
    
    // Calculate end date (same as start date for single day)
    const endDate = date;
    
    // Fetch availability from doctor service
    const slots = await getDoctorAvailability(doctorId, date, endDate);
    
    // Transform to expected format
    const formattedSlots = slots.map((slot: any) => ({
      startTime: slot.startTime,
      endTime: slot.endTime,
      available: slot.status === 'AVAILABLE'
    }));
    
    return {
      success: true,
      data: { slots: formattedSlots },
    };
  } catch (error: any) {
    console.error('❌ Error fetching doctor availability:', error);
    throw new Error(error.message || 'Failed to fetch doctor availability');
  }
};

// Export all functions as default object for convenience
export default {
  getDoctors,
  searchDoctors,
  getDoctorById,
  getAvailableDoctors,
  getDoctorsBySpecialization,
  getFilterOptions,
  getDoctorStats,
  getDoctorAvailableSlots,
};
