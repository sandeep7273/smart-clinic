/**
 * Doctor Service Type Definitions – mirrors mobile app
 */

export interface Doctor {
  id: string;
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
  reviewCount?: number;
  consultationFee?: number;
  status: string;
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
  sortBy?:
    | "rating"
    | "firstName"
    | "lastName"
    | "consultationFee"
    | "createdAt";
  sortOrder?: "asc" | "desc";
  status?: "active" | "inactive";
}

export interface DoctorSearchParams {
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
  specializations: string[];
  locations: Array<{ city: string; state: string }>;
}

export interface FilterOptionsResponse {
  success: boolean;
  data: FilterOptions;
}

export interface AvailableDoctorsParams {
  date?: string;
  specialization?: string;
}
