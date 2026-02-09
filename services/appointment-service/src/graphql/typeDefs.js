/**
 * GraphQL Type Definitions for Appointment Service
 * Supports SAGA pattern, CQRS, and Event Sourcing architecture
 */

const { gql } = require('apollo-server-express');

const typeDefs = gql`
  scalar DateTime
  scalar JSON

  # Enums
  enum AppointmentStatus {
    SCHEDULED
    CONFIRMED
    IN_PROGRESS
    COMPLETED
    CANCELLED
    NO_SHOW
    RESCHEDULED
  }

  enum AppointmentType {
    CONSULTATION
    FOLLOW_UP
    PROCEDURE
    EMERGENCY
    ROUTINE_CHECKUP
    SPECIALIST_REFERRAL
  }

  enum PaymentStatus {
    PENDING
    PAID
    FAILED
    REFUNDED
    PARTIALLY_REFUNDED
  }

  enum SagaStatus {
    STARTED
    IN_PROGRESS
    COMPLETED
    FAILED
    COMPENSATING
    COMPENSATED
  }

  enum EventType {
    APPOINTMENT_REQUESTED
    APPOINTMENT_CONFIRMED
    APPOINTMENT_CANCELLED
    APPOINTMENT_RESCHEDULED
    PAYMENT_PROCESSED
    NOTIFICATION_SENT
    DOCTOR_ASSIGNED
    SLOT_RESERVED
    SLOT_RELEASED
  }

  # Core Types
  type Appointment {
    id: ID!
    patientId: String!
    doctorId: String!
    slotId: String!
    
    # Appointment Details
    title: String!
    description: String
    type: AppointmentType!
    status: AppointmentStatus!
    
    # Scheduling
    scheduledDate: DateTime!
    scheduledTime: String!
    duration: Int! # in minutes
    timeZone: String!
    
    # Location
    location: AppointmentLocation
    isVirtual: Boolean!
    virtualMeetingLink: String
    
    # Payment
    fee: Float!
    paymentStatus: PaymentStatus!
    paymentId: String
    
    # Metadata
    notes: String
    tags: [String!]!
    priority: String
    
    # Timestamps
    createdAt: DateTime!
    updatedAt: DateTime!
    bookedAt: DateTime
    confirmedAt: DateTime
    completedAt: DateTime
    cancelledAt: DateTime
    
    # Relations (resolved by API Gateway)
    patient: Patient
    doctor: Doctor
    slot: TimeSlot
    
    # Event Sourcing
    events: [AppointmentEvent!]!
    version: Int!
    
    # SAGA
    sagaId: String
    sagaStatus: SagaStatus
  }

  type AppointmentLocation {
    type: String! # CLINIC, HOSPITAL, HOME, ONLINE
    address: String
    room: String
    floor: String
    instructions: String
    coordinates: Coordinates
  }

  type Coordinates {
    latitude: Float!
    longitude: Float!
  }

  # Event Sourcing Event
  type AppointmentEvent {
    id: ID!
    appointmentId: String!
    eventType: EventType!
    data: JSON!
    metadata: EventMetadata!
    timestamp: DateTime!
    version: Int!
  }

  type EventMetadata {
    userId: String!
    userRole: String!
    correlationId: String!
    causationId: String
    source: String!
    ip: String
    userAgent: String
  }

  # SAGA Transaction
  type AppointmentSaga {
    id: ID!
    appointmentId: String!
    status: SagaStatus!
    steps: [SagaStep!]!
    compensations: [SagaCompensation!]!
    startedAt: DateTime!
    completedAt: DateTime
    failedAt: DateTime
    error: String
    metadata: JSON
  }

  type SagaStep {
    name: String!
    status: String!
    executedAt: DateTime
    data: JSON
    error: String
  }

  type SagaCompensation {
    stepName: String!
    executed: Boolean!
    executedAt: DateTime
    error: String
  }

  # Read Model Projections
  type AppointmentSummary {
    id: ID!
    patientId: String!
    doctorId: String!
    status: AppointmentStatus!
    scheduledDate: DateTime!
    type: AppointmentType!
    fee: Float!
    paymentStatus: PaymentStatus!
  }

  type AppointmentStats {
    totalAppointments: Int!
    scheduledAppointments: Int!
    completedAppointments: Int!
    cancelledAppointments: Int!
    todayAppointments: Int!
    upcomingAppointments: Int!
    revenueTotal: Float!
    revenueThisMonth: Float!
  }

  # External Types (federated from other services)
  type Patient {
    id: ID!
    email: String!
    profile: PatientProfile
  }

  type Doctor {
    id: ID!
    email: String!
    profile: DoctorProfile
  }

  type TimeSlot {
    id: ID!
    doctorId: String!
    startTime: DateTime!
    endTime: DateTime!
    isAvailable: Boolean!
  }

  type PatientProfile {
    firstName: String!
    lastName: String!
    phone: String
    dateOfBirth: DateTime
  }

  type DoctorProfile {
    firstName: String!
    lastName: String!
    specialization: String!
    phone: String
  }

  # Input Types
  input BookAppointmentInput {
    patientId: String!
    doctorId: String!
    slotId: String!
    type: AppointmentType!
    title: String!
    description: String
    notes: String
    location: AppointmentLocationInput
    isVirtual: Boolean = false
    priority: String
    tags: [String!] = []
  }

  input AppointmentLocationInput {
    type: String!
    address: String
    room: String
    floor: String
    instructions: String
    coordinates: CoordinatesInput
  }

  input CoordinatesInput {
    latitude: Float!
    longitude: Float!
  }

  input RescheduleAppointmentInput {
    appointmentId: ID!
    newSlotId: String!
    reason: String
    notifyPatient: Boolean = true
  }

  input UpdateAppointmentInput {
    appointmentId: ID!
    title: String
    description: String
    notes: String
    priority: String
    tags: [String!]
    location: AppointmentLocationInput
  }

  input AppointmentFilterInput {
    status: [AppointmentStatus!]
    type: [AppointmentType!]
    patientId: String
    doctorId: String
    dateFrom: DateTime
    dateTo: DateTime
    paymentStatus: [PaymentStatus!]
    tags: [String!]
    isVirtual: Boolean
    search: String
  }

  input AppointmentSortInput {
    field: AppointmentSortField!
    direction: SortDirection!
  }

  enum AppointmentSortField {
    SCHEDULED_DATE
    CREATED_AT
    UPDATED_AT
    FEE
    STATUS
  }

  enum SortDirection {
    ASC
    DESC
  }

  # Pagination
  type AppointmentConnection {
    edges: [AppointmentEdge!]!
    pageInfo: PageInfo!
    totalCount: Int!
  }

  type AppointmentEdge {
    node: Appointment!
    cursor: String!
  }

  type PageInfo {
    hasNextPage: Boolean!
    hasPreviousPage: Boolean!
    startCursor: String
    endCursor: String
  }

  # Response Types
  type BookAppointmentResponse {
    success: Boolean!
    appointment: Appointment
    sagaId: String
    message: String
    errors: [ValidationError!]
  }

  type ValidationError {
    field: String!
    message: String!
    code: String!
  }

  type AppointmentResponse {
    success: Boolean!
    appointment: Appointment
    message: String
    errors: [ValidationError!]
  }

  type BulkAppointmentResponse {
    success: Boolean!
    processedCount: Int!
    successCount: Int!
    failureCount: Int!
    results: [AppointmentResponse!]!
    message: String
  }

  # Queries
  type Query {
    # Single appointment queries
    appointment(id: ID!): Appointment
    appointmentBySlot(slotId: String!): Appointment
    
    # List queries with filtering, sorting, and pagination
    appointments(
      filter: AppointmentFilterInput
      sort: AppointmentSortInput
      first: Int
      after: String
      last: Int
      before: String
    ): AppointmentConnection!
    
    # Patient appointments
    patientAppointments(
      patientId: String!
      status: [AppointmentStatus!]
      dateFrom: DateTime
      dateTo: DateTime
      first: Int = 20
      after: String
    ): AppointmentConnection!
    
    # Doctor appointments
    doctorAppointments(
      doctorId: String!
      status: [AppointmentStatus!]
      dateFrom: DateTime
      dateTo: DateTime
      first: Int = 20
      after: String
    ): AppointmentConnection!
    
    # Today's appointments
    todayAppointments(
      doctorId: String
      status: [AppointmentStatus!]
    ): [Appointment!]!
    
    # Upcoming appointments
    upcomingAppointments(
      patientId: String
      doctorId: String
      days: Int = 7
    ): [Appointment!]!
    
    # Event Sourcing queries
    appointmentEvents(
      appointmentId: String!
      eventType: EventType
      fromVersion: Int
    ): [AppointmentEvent!]!
    
    # SAGA queries
    appointmentSaga(sagaId: String!): AppointmentSaga
    appointmentSagas(
      appointmentId: String
      status: SagaStatus
      first: Int = 20
      after: String
    ): [AppointmentSaga!]!
    
    # Statistics and analytics
    appointmentStats(
      patientId: String
      doctorId: String
      dateFrom: DateTime
      dateTo: DateTime
    ): AppointmentStats!
    
    # Search
    searchAppointments(
      query: String!
      filters: AppointmentFilterInput
      first: Int = 20
      after: String
    ): AppointmentConnection!
  }

  # Mutations
  type Mutation {
    # Book new appointment (triggers SAGA)
    bookAppointment(input: BookAppointmentInput!): BookAppointmentResponse!
    
    # Modify existing appointments
    confirmAppointment(appointmentId: ID!): AppointmentResponse!
    cancelAppointment(appointmentId: ID!, reason: String): AppointmentResponse!
    rescheduleAppointment(input: RescheduleAppointmentInput!): AppointmentResponse!
    updateAppointment(input: UpdateAppointmentInput!): AppointmentResponse!
    
    # Status changes
    startAppointment(appointmentId: ID!): AppointmentResponse!
    completeAppointment(
      appointmentId: ID!
      notes: String
      followUpRequired: Boolean = false
    ): AppointmentResponse!
    markNoShow(appointmentId: ID!): AppointmentResponse!
    
    # Payment operations
    processPayment(appointmentId: ID!, paymentDetails: JSON!): AppointmentResponse!
    refundPayment(appointmentId: ID!, amount: Float, reason: String): AppointmentResponse!
    
    # Bulk operations
    bulkUpdateStatus(
      appointmentIds: [ID!]!
      status: AppointmentStatus!
      reason: String
    ): BulkAppointmentResponse!
    
    # Admin operations
    adminCancelAppointment(
      appointmentId: ID!
      reason: String!
      notifyParties: Boolean = true
    ): AppointmentResponse!
    
    adminRescheduleAppointment(
      appointmentId: ID!
      newSlotId: String!
      reason: String!
      notifyParties: Boolean = true
    ): AppointmentResponse!
  }

  # Subscriptions for real-time updates
  type Subscription {
    # Real-time appointment updates
    appointmentUpdated(appointmentId: ID): Appointment!
    appointmentStatusChanged(patientId: String, doctorId: String): Appointment!
    
    # Patient subscriptions
    patientAppointmentUpdates(patientId: String!): Appointment!
    
    # Doctor subscriptions  
    doctorAppointmentUpdates(doctorId: String!): Appointment!
    
    # SAGA progress updates
    sagaProgress(sagaId: String!): AppointmentSaga!
    
    # System notifications
    appointmentReminders(userId: String!): Appointment!
    appointmentConflicts(doctorId: String!): Appointment!
  }
`;

module.exports = typeDefs;