const { gql } = require('apollo-server-express');

const typeDefs = gql`
  scalar Date

  type Address{
    street: String
    city: String!
    state: String!
    zipcode: String!
    country: String!
  }

  type EmergencyContact {
    name: String!
    relationship: String!
    phone: String!
    email: String
  }

  type MedicalHistoryItem {
    condition: String!
    diagnosisDate: Date
    status: String!
    notes: String
}

    type Allergy{
    allergen: String!
    reaction: String!
    severity: String!
}

    type Medication{
    name: String!
    dosage: String!
    frequency: String!
    startDate: Date!
    endDate: Date
    prescribedBy: String
    notes: String
}

type Patient {
    id: ID!
    userId: String!
    firstName: String!
    lastName: String!
    email: String!
    phone: String
    dateOfBirth: Date!
    gender: String
    bloodType: String
    address: Address
    emergencyContact: EmergencyContact
    medicalHistory: [MedicalHistoryItem!]!
    allergies: [Allergy!]!
    currentMedications: [Medication!]!
    insuranceProvider: String
    insurancePolicyNumber: String
    insuranceGroupNumber: String
    status: String!
    registeredDate: Date
    lastVisited: Date
    notes: String
    age: Int
    fullName: String
}

type PaginationInfo{
    page: Int!
    limit: Int!
    total: Int!
    pages: Int!
}

type PatientsResponse {
  patients: [Patient!]!
  pagination: PaginationInfo!
}

input AddressInput{
    street: String
    city: String!
    state: String!
    zipcode: String!
    country: String!
}

input EmergencyContactInput {
    name: String!
    relationship: String!
    phone: String!
    email: String
}

input CreatePatientInput {
    userId: String!
    firstName: String!
    lastName: String!
    email: String!
    phone: String
    dateOfBirth: Date!
    gender: String
    bloodType: String
    address: AddressInput
    emergencyContact: EmergencyContactInput
    insuranceProvider: String
    insurancePolicyNumber: String
    insuranceGroupNumber: String
}

input UpdatePatientInput {
    firstName: String
    lastName: String
    email: String
    phone: String
    dateOfBirth: Date
    gender: String
    bloodType: String
    address: AddressInput
    emergencyContact: EmergencyContactInput
    insuranceProvider: String
    insurancePolicyNumber: String
    insuranceGroupNumber: String
    notes: String
}

input MedicalHistoryInput {
    condition: String!
    diagnosisDate: Date
    status: String!
    notes: String
}

input AllergyInput{
    allergen: String!
    reaction: String!
    severity: String!
}

input MedicationInput{
    name: String!
    dosage: String!
    frequency: String!
    startDate: Date!
    endDate: Date
    prescribedBy: String
    notes: String
}

type Query {
    # Get Patient by Id
    patient(id: ID!): Patient

    # Get Patient by UserId
    patientByUserId(userId: String!): Patient

    # Get current users patient profile
    me: Patient

    # Get all Patients with Pagination and filters
    patients(
        page: Int = 1
        limit: Int =10
    ): PatientsResponse!
}

`


module.exports = typeDefs;