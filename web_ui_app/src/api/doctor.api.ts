/**
 * Doctor API Service – uses GraphQL through API Gateway
 */

import {
  searchDoctors as graphqlSearchDoctors,
  getDoctorById as graphqlGetDoctorById,
  getPopularSpecializations,
  getDoctorLocations,
  getDoctorAvailability,
} from "./graphql.client";
import type {
  DoctorListParams,
  DoctorSearchParams,
  DoctorListResponse,
  DoctorDetailResponse,
  FilterOptionsResponse,
} from "../types/doctor.types";

export const getDoctors = async (
  params: DoctorListParams = {},
): Promise<DoctorListResponse> => {
  const {
    page = 1,
    limit = 50,
    sortBy = "rating",
    sortOrder = "desc",
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
        pages: result.pagination?.totalPages || 0,
      },
    };
  } catch (error: any) {
    return {
      success: false,
      data: [],
      pagination: { page: 1, limit, total: 0, pages: 0 },
      error: error.message || "Failed to fetch doctors",
    };
  }
};

export const searchDoctors = async (
  params: DoctorSearchParams,
): Promise<DoctorListResponse> => {
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
      sortBy = "rating",
      sortOrder = "desc",
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
    return {
      success: false,
      data: [],
      pagination: { page: 1, limit: params.limit || 50, total: 0, pages: 0 },
      error: error.message || "Failed to search doctors",
    };
  }
};

export const getDoctorDetail = async (
  id: string,
): Promise<DoctorDetailResponse> => {
  try {
    const doctor = await graphqlGetDoctorById(id);
    return { success: true, data: doctor };
  } catch (error: any) {
    return { success: false, data: null, error: error.message };
  }
};

export const getFilterOptions = async (): Promise<FilterOptionsResponse> => {
  try {
    const [specializations, locations] = await Promise.all([
      getPopularSpecializations(),
      getDoctorLocations(),
    ]);
    return {
      success: true,
      data: {
        specializations: specializations.map((s: any) => s.specialization || s),
        locations: locations.map((l: any) => ({
          city: l.city,
          state: l.state,
        })),
      },
    };
  } catch (error: any) {
    return { success: false, data: { specializations: [], locations: [] } };
  }
};

export const getDoctorAvailableSlots = async (
  doctorId: string,
  date: string,
): Promise<{ success: boolean; data: { slots: any[] } }> => {
  try {
    // getDoctorAvailability returns [TimeSlot] directly (not wrapped in DoctorAvailability)
    const timeSlots: any[] =
      (await getDoctorAvailability(doctorId, date)) || [];
    const slots = timeSlots.map((slot: any) => ({
      startTime: slot.startTime,
      endTime: slot.endTime,
      // isAvailable has null data on server; derive from status field
      available: slot.isAvailable ?? slot.status === "AVAILABLE",
      duration: 30,
    }));
    // Return ALL slots — unavailable ones are rendered as disabled (matching mobile app behaviour)
    return { success: true, data: { slots } };
  } catch (error: any) {
    return { success: false, data: { slots: [] } };
  }
};
