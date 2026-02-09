/**
 * Auth Service GraphQL Schema
 * Defines types and operations for authentication
 */

const { gql } = require('apollo-server-express');

const typeDefs = gql`
  # User types
  type User {
    id: ID!
    email: String!
    firstName: String!
    lastName: String!
    phone: String
    role: Role!
    isActive: Boolean!
    isEmailVerified: Boolean!
    profile: UserProfile
    tenantId: String
    createdAt: String!
    updatedAt: String!
  }

  type UserProfile {
    avatar: String
    dateOfBirth: String
    address: Address
    emergencyContact: EmergencyContact
    preferences: UserPreferences
  }

  type Address {
    street: String!
    city: String!
    state: String!
    zipCode: String!
    country: String!
  }

  type EmergencyContact {
    name: String!
    relationship: String!
    phone: String!
  }

  type UserPreferences {
    language: String
    timezone: String
    notifications: NotificationSettings
  }

  type NotificationSettings {
    email: Boolean
    sms: Boolean
    push: Boolean
  }

  enum Role {
    ADMIN
    DOCTOR
    PATIENT
    NURSE
    SUPPORT
  }

  # Auth types
  type AuthPayload {
    success: Boolean!
    message: String
    token: String
    refreshToken: String
    user: User
    expiresIn: Int
  }

  type TokenValidation {
    valid: Boolean!
    user: User
    error: String
  }

  # Input types
  input RegisterInput {
    email: String!
    password: String!
    firstName: String!
    lastName: String!
    phone: String
    role: Role = PATIENT
    dateOfBirth: String
    tenantId: String
  }

  input LoginInput {
    email: String!
    password: String!
  }

  input UpdateProfileInput {
    firstName: String
    lastName: String
    phone: String
    avatar: String
    dateOfBirth: String
    address: AddressInput
    emergencyContact: EmergencyContactInput
    preferences: UserPreferencesInput
  }

  input AddressInput {
    street: String!
    city: String!
    state: String!
    zipCode: String!
    country: String!
  }

  input EmergencyContactInput {
    name: String!
    relationship: String!
    phone: String!
  }

  input UserPreferencesInput {
    language: String
    timezone: String
    notifications: NotificationSettingsInput
  }

  input NotificationSettingsInput {
    email: Boolean
    sms: Boolean
    push: Boolean
  }

  input ChangePasswordInput {
    currentPassword: String!
    newPassword: String!
  }

  input ResetPasswordInput {
    email: String!
  }

  input VerifyPasswordResetInput {
    token: String!
    newPassword: String!
  }

  # Queries
  type Query {
    # Get current user profile
    me: User
    
    # Validate token
    validateToken(token: String!): TokenValidation!
    
    # Get user by ID (admin/doctor only)
    getUser(id: ID!): User
    
    # Get all users with filters (admin only)
    getUsers(
      role: Role
      isActive: Boolean
      page: Int = 1
      limit: Int = 10
      search: String
    ): UsersConnection!
  }

  type UsersConnection {
    users: [User!]!
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

  # Mutations
  type Mutation {
    # User registration
    register(input: RegisterInput!): AuthPayload!
    
    # User login
    login(input: LoginInput!): AuthPayload!
    
    # Refresh access token
    refreshToken(refreshToken: String!): AuthPayload!
    
    # Logout (invalidate tokens)
    logout: Boolean!
    
    # Update user profile
    updateProfile(input: UpdateProfileInput!): User!
    
    # Change password
    changePassword(input: ChangePasswordInput!): Boolean!
    
    # Request password reset
    requestPasswordReset(input: ResetPasswordInput!): Boolean!
    
    # Reset password with token
    resetPassword(input: VerifyPasswordResetInput!): Boolean!
    
    # Verify email
    verifyEmail(token: String!): Boolean!
    
    # Resend email verification
    resendEmailVerification: Boolean!
    
    # Admin: Update user status
    updateUserStatus(userId: ID!, isActive: Boolean!): User!
    
    # Admin: Update user role
    updateUserRole(userId: ID!, role: Role!): User!
    
    # Admin: Delete user (soft delete)
    deleteUser(userId: ID!): Boolean!
  }

  # Subscriptions for real-time updates
  type Subscription {
    userUpdated(userId: ID!): User!
    userStatusChanged: User!
  }
`;

module.exports = typeDefs;