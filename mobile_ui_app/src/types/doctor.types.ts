/**
 * Doctor Service Type Definitions
 */

export interface Doctor {
  id: string; // GraphQL uses 'id' instead of '_id'
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  specializations: string[];
  bio?: string;
  languages?: string[];
  address?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  qualifications?: Array<{
    degree: string;
    institution: string;
    year: number;
    field?: string;
  }>;
  licenses?: Array<{
    licenseNumber: string;
    issuingAuthority: string;
    state: string;
    expiryDate?: string;
    isActive: boolean;
  }>;
  awards?: string[];
  affiliations?: string[];
  services?: Array<{
    name: string;
    description?: string;
    duration: number;
    fee: number;
    category?: string;
  }>;
  experience?: number;
  rating?: number;
  reviewsCount?: number;
  consultationFee?: number;
  status: string; // ACTIVE, INACTIVE, ON_LEAVE, SUSPENDED
  isVerified: boolean;
  isAvailable: boolean;
  tenantId?: string;
  totalPatients?: number;
  totalAppointments?: number;
  profileImage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DoctorListParams {
  page?: number;
  limit?: number;
  sortBy?: 'rating' | 'firstName' | 'lastName' | 'consultationFee' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
  status?: 'active' | 'inactive';
}

export interface DoctorSearchParams {
  search?: string; // Search across name, specialization, etc.
  specialization?: string; // Filter by specialization
  city?: string; // Filter by city
  state?: string; // Filter by state
  minRating?: number; // Minimum rating filter
  maxFee?: number; // Maximum consultation fee filter
  language?: string; // Filter by language
  isAvailable?: boolean; // Filter by availability status
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: string;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface DoctorListResponse {
  success: boolean;
  data: Doctor[];
  pagination: PaginationInfo;
  error?: string;
}

export interface DoctorDetailResponse {
  success: boolean;
  data: Doctor | null;
  error?: string;
}

export interface FilterOptions {
  success: boolean;
  data: {
    specializations: string[];
    locations: string[];
    conditions: string[];
    symptoms: string[];
    languages: string[];
  };
  error?: string;
}

export interface AvailableDoctorsParams {
  date: string;
  specialty?: string;
  location?: string;
}
