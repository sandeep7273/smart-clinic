/**
 * Doctor Service GraphQL Schema
 * Defines types and operations for doctor management
 */

const { gql } = require('apollo-server-express');

const typeDefs = gql`
  # Doctor types
  type Doctor {
    id: ID!
    userId: String!
    firstName: String!
    lastName: String!
    email: String!
    phone: String
    specializations: [String!]!
    qualifications: [Qualification!]!
    licenses: [License!]!
    experience: Int
    rating: Float
    reviewsCount: Int
    consultationFee: Int
    languages: [String!]
    address: Address
    availability: DoctorAvailability
    profileImage: String
    bio: String
    awards: [String!]
    affiliations: [String!]
    services: [MedicalService!]
    status: DoctorStatus!
    isVerified: Boolean!
    isAvailable: Boolean!
    tenantId: String
    totalPatients: Int
    totalAppointments: Int
    createdAt: String!
    updatedAt: String!
  }

  type Qualification {
    degree: String!
    institution: String!
    year: Int!
    field: String
  }

  type License {
    licenseNumber: String!
    issuingAuthority: String!
    state: String!
    expiryDate: String
    isActive: Boolean!
  }

  type Address {
    street: String!
    city: String!
    state: String!
    zipCode: String!
    country: String!
  }

  type DoctorAvailability {
    weeklySchedule: [WeeklySchedule!]!
    specialHours: [SpecialHour!]
    timeSlots: [TimeSlot!]!
  }

  type WeeklySchedule {
    dayOfWeek: Int!
    isAvailable: Boolean!
    startTime: String
    endTime: String
    breaks: [Break!]
  }

  type Break {
    startTime: String!
    endTime: String!
  }

  type SpecialHour {
    date: String!
    startTime: String
    endTime: String
    isAvailable: Boolean!
    reason: String
  }

  type TimeSlot {
    date: String!
    startTime: String!
    endTime: String!
    status: SlotStatus!
    appointmentId: String
    notes: String
  }

  type MedicalService {
    name: String!
    description: String
    duration: Int!
    fee: Int!
    category: String
  }

  enum DoctorStatus {
    ACTIVE
    INACTIVE
    ON_LEAVE
    SUSPENDED
  }

  enum SlotStatus {
    AVAILABLE
    BOOKED
    CANCELLED
    COMPLETED
  }

  # Search and filter types
  type DoctorConnection {
    doctors: [Doctor!]!
    pagination: Pagination!
  }

  type Pagination {
    page: Int!
    limit: Int!
    total: Int!
    totalPages: Int!
    hasNext: Boolean!
    hasPrev: Boolean!
  }

  input DoctorSearchFilters {
    specialization: String
    city: String
    state: String
    condition: String
    symptom: String
    minRating: Float
    maxFee: Int
    language: String
    availability: String
    isAvailable: Boolean
  }

  # Input types
  input CreateDoctorInput {
    userId: String!
    firstName: String!
    lastName: String!
    email: String!
    phone: String
    specializations: [String!]!
    qualifications: [QualificationInput!]!
    licenses: [LicenseInput!]!
    experience: Int
    consultationFee: Int!
    languages: [String!]
    address: AddressInput!
    bio: String
    awards: [String!]
    affiliations: [String!]
    services: [MedicalServiceInput!]
  }

  input UpdateDoctorInput {
    firstName: String
    lastName: String
    phone: String
    specializations: [String!]
    qualifications: [QualificationInput!]
    experience: Int
    consultationFee: Int
    languages: [String!]
    address: AddressInput
    bio: String
    awards: [String!]
    affiliations: [String!]
    services: [MedicalServiceInput!]
    profileImage: String
  }

  input QualificationInput {
    degree: String!
    institution: String!
    year: Int!
    field: String
  }

  input LicenseInput {
    licenseNumber: String!
    issuingAuthority: String!
    state: String!
    expiryDate: String
  }

  input AddressInput {
    street: String!
    city: String!
    state: String!
    zipCode: String!
    country: String!
  }

  input MedicalServiceInput {
    name: String!
    description: String
    duration: Int!
    fee: Int!
    category: String
  }

  input AvailabilityInput {
    weeklySchedule: [WeeklyScheduleInput!]!
    specialHours: [SpecialHourInput!]
  }

  input WeeklyScheduleInput {
    dayOfWeek: Int!
    isAvailable: Boolean!
    startTime: String
    endTime: String
    breaks: [BreakInput!]
  }

  input BreakInput {
    startTime: String!
    endTime: String!
  }

  input SpecialHourInput {
    date: String!
    startTime: String
    endTime: String
    isAvailable: Boolean!
    reason: String
  }

  input SlotReservationInput {
    doctorId: ID!
    date: String!
    startTime: String!
    endTime: String!
    userId: String!
    appointmentId: String
  }

  # Queries
  type Query {
    # Get doctor by ID
    getDoctor(id: ID!): Doctor
    
    # Search doctors with filters
    searchDoctors(
      search: String
      filters: DoctorSearchFilters
      page: Int = 1
      limit: Int = 10
      sortBy: String = "rating"
      sortOrder: String = "desc"
    ): DoctorConnection!
    
    # Get doctors by specialization
    getDoctorsBySpecialization(
      specialization: String!
      page: Int = 1
      limit: Int = 10
    ): DoctorConnection!
    
    # Get available time slots for a doctor
    getDoctorAvailability(
      doctorId: ID!
      startDate: String!
      endDate: String!
    ): [TimeSlot!]!
    
    # Get popular specializations
    getPopularSpecializations(limit: Int = 10): [SpecializationStats!]!

    # Get doctor locations (for search filters)
    getDoctorLocations(limit: Int = 10): [LocationStats!]!
    
    # Get doctor statistics (admin only)
    getDoctorStats: DoctorStats!
    
    # Get nearby doctors (by location)
    getNearbyDoctors(
      latitude: Float!
      longitude: Float!
      radius: Float = 10
      limit: Int = 10
    ): [Doctor!]!
  }

  type SpecializationStats {
    specialization: String!
    count: Int!
    avgRating: Float!
    avgFee: Int!
  }

  type LocationStats {
    city: String!
    state: String!
    count: Int!
  }

  type DoctorStats {
    totalDoctors: Int!
    totalActive: Int!
    totalVerified: Int!
    bySpecialization: [SpecializationStats!]!
    avgRating: Float!
    totalAppointments: Int!
  }

  # Mutations
  type Mutation {
    # Create new doctor profile
    createDoctor(input: CreateDoctorInput!): Doctor!
    
    # Update doctor profile
    updateDoctor(id: ID!, input: UpdateDoctorInput!): Doctor!
    
    # Update doctor availability
    updateDoctorAvailability(doctorId: ID!, input: AvailabilityInput!): Doctor!
    
    # Reserve a time slot
    reserveSlot(input: SlotReservationInput!): TimeSlot!
    
    # Release a reserved slot
    releaseSlot(doctorId: ID!, date: String!, startTime: String!): TimeSlot!
    
    # Update slot status
    updateSlotStatus(
      doctorId: ID!
      date: String!
      startTime: String!
      status: SlotStatus!
      appointmentId: String
    ): TimeSlot!
    
    # Update doctor status (admin only)
    updateDoctorStatus(doctorId: ID!, status: DoctorStatus!): Doctor!
    
    # Verify doctor (admin only)
    verifyDoctor(doctorId: ID!, isVerified: Boolean!): Doctor!
    
    # Delete doctor (soft delete)
    deleteDoctor(doctorId: ID!): Boolean!
    
    # Generate time slots for doctor
    generateTimeSlots(
      doctorId: ID!
      startDate: String!
      endDate: String!
      slotDuration: Int = 30
    ): [TimeSlot!]!
  }

  # Subscriptions for real-time updates
  type Subscription {
    # Doctor availability updates
    doctorAvailabilityUpdated(doctorId: ID!): [TimeSlot!]!
    
    # Slot status changes
    slotStatusChanged(doctorId: ID!): TimeSlot!
    
    # New doctor registrations
    doctorRegistered: Doctor!
  }
`;

module.exports = typeDefs;