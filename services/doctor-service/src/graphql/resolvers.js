/**
 * Doctor Service GraphQL Resolvers
 * Implements GraphQL operations for doctor management
 */

const doctorService = require('../services/doctor.service');
const logger = require('../utils/logger');
const { AuthenticationError, ForbiddenError, UserInputError } = require('apollo-server-express');

const resolvers = {
  Query: {
    // Get doctor by ID
    getDoctor: async (parent, { id }, context) => {
      try {
        requireAuthentication(context);
        const doctor = await doctorService.getDoctorById(id);
        return doctor;
      } catch (error) {
        logger.error('Error fetching doctor:', error);
        throw error;
      }
    },

    // Search doctors with filters
    searchDoctors: async (parent, { search, filters, page, limit, sortBy, sortOrder }, context) => {
      try {
        requireAuthentication(context);
        logger.info(`GraphQL searchDoctors called with search="${search}", filters=${JSON.stringify(filters)}, page=${page}, limit=${limit}`);
        
        const searchFilters = {
          ...filters,
          search,
          page,
          limit,
          sortBy,
          sortOrder
        };

        const result = await doctorService.searchDoctors(searchFilters);
        
        return {
          doctors: result.doctors,
          pagination: {
            page: result.pagination.page,
            limit: result.pagination.limit,
            total: result.pagination.total,
            totalPages: result.pagination.totalPages,
            hasNext: result.pagination.hasNext,
            hasPrev: result.pagination.hasPrev
          }
        };
      } catch (error) {
        logger.error('Error searching doctors:', error);
        throw error;
      }
    },

    // Get doctors by specialization
    getDoctorsBySpecialization: async (parent, { specialization, page, limit }, context) => {
      try {
        requireAuthentication(context);
        const result = await doctorService.getDoctorsBySpecialization(specialization, page, limit);
        
        return {
          doctors: result.doctors,
          pagination: {
            page: result.pagination.page,
            limit: result.pagination.limit,
            total: result.pagination.total,
            totalPages: result.pagination.totalPages,
            hasNext: result.pagination.hasNext,
            hasPrev: result.pagination.hasPrev
          }
        };
      } catch (error) {
        logger.error('Error fetching doctors by specialization:', error);
        throw error;
      }
    },

    // Get doctor availability
    getDoctorAvailability: async (parent, { doctorId, startDate, endDate }, context) => {
      try {
        requireAuthentication(context);
        const availability = await doctorService.getDoctorAvailability(doctorId, startDate, endDate);
        return availability;
      } catch (error) {
        logger.error('Error fetching doctor availability:', error);
        throw error;
      }
    },

    // Get popular specializations
    getPopularSpecializations: async (parent, { limit }, context) => {
      try {
        requireAuthentication(context);
        const specializations = await doctorService.getPopularSpecializations(limit);
        return specializations;
      } catch (error) {
        logger.error('Error fetching popular specializations:', error);
        throw error;
      }
    },

    // Get doctor locations (for filter options)
    getDoctorLocations: async (parent, { limit }, context) => {
      try {
        requireAuthentication(context);
        const locations = await doctorService.getDoctorLocations(limit);
        return locations;
      } catch (error) {
        logger.error('Error fetching doctor locations:', error);
        throw error;
      }
    },

  },

  Mutation: {
    // Create new doctor profile
    createDoctor: async (parent, { input }, context) => {
      if (!context.user || !['ADMIN', 'DOCTOR'].includes(context.user.role)) {
        throw new ForbiddenError('Insufficient permissions');
      }

      try {
        requireAuthentication(context);
        const doctor = await doctorService.createDoctor(input);
        return doctor;
      } catch (error) {
        logger.error('Error creating doctor:', error);
        throw error;
      }
    },

    // Update doctor profile
    updateDoctor: async (parent, { id, input }, context) => {
      if (!context.user) {
        throw new AuthenticationError('You must be logged in');
      }

      // Check if user can update this doctor profile
      if (context.user.role !== 'ADMIN' && context.user.userId !== input.userId) {
        throw new ForbiddenError('You can only update your own profile');
      }

      try {
        requireAuthentication(context);
        const doctor = await doctorService.updateDoctor(id, input);
        return doctor;
      } catch (error) {
        logger.error('Error updating doctor:', error);
        throw error;
      }
    },

    // Update doctor availability
    updateDoctorAvailability: async (parent, { doctorId, input }, context) => {
      if (!context.user) {
        throw new AuthenticationError('You must be logged in');
      }

      try {
        requireAuthentication(context);
        const doctor = await doctorService.updateDoctorAvailability(doctorId, input, context.user);
        return doctor;
      } catch (error) {
        logger.error('Error updating doctor availability:', error);
        throw error;
      }
    },

    // Reserve a time slot
    reserveSlot: async (parent, { input }, context) => {
      if (!context.user) {
        throw new AuthenticationError('You must be logged in');
      }

      try {
        requireAuthentication(context);
        const slot = await doctorService.reserveTimeSlot(input);
        return slot;
      } catch (error) {
        logger.error('Error reserving slot:', error);
        throw error;
      }
    },

    // Release a reserved slot
    releaseSlot: async (parent, { doctorId, date, startTime }, context) => {
      if (!context.user) {
        throw new AuthenticationError('You must be logged in');
      }

      try {
        requireAuthentication(context);
        const slot = await doctorService.releaseTimeSlot(doctorId, date, startTime);
        return slot;
      } catch (error) {
        logger.error('Error releasing slot:', error);
        throw error;
      }
    },

    // Update slot status
    updateSlotStatus: async (parent, { doctorId, date, startTime, status, appointmentId }, context) => {
      if (!context.user) {
        throw new AuthenticationError('You must be logged in');
      }

      try {
        requireAuthentication(context);
        const slot = await doctorService.updateSlotStatus(
          doctorId, 
          date, 
          startTime, 
          status, 
        );
        return slot;
      } catch (error) {
        logger.error('Error updating slot status:', error);
        throw error;
      }
    },


    // Delete doctor (soft delete)
    deleteDoctor: async (parent, { doctorId }, context) => {
      if (!context.user || context.user.role !== 'ADMIN') {
        throw new ForbiddenError('Admin access required');
      }

      try {
        requireAuthentication(context);
        await doctorService.deleteDoctor(doctorId);
        return true;
      } catch (error) {
        logger.error('Error deleting doctor:', error);
        return false;
      }
    },

  },

  // Field resolvers
  Doctor: {
    // Resolve doctor ID
    id: (doctor) => doctor._id || doctor.id,
    
    // Format dates
    createdAt: (doctor) => doctor.createdAt?.toISOString(),
    updatedAt: (doctor) => doctor.updatedAt?.toISOString(),
    
    // Provide default values for required fields
    isVerified: (doctor) => doctor.isVerified ?? false,
    isAvailable: (doctor) => doctor.isAvailable ?? true,
    
    // Transform status from lowercase to uppercase enum
    status: (doctor) => {
      if (!doctor.status) return 'ACTIVE';
      return doctor.status.toUpperCase().replace(/-/g, '_');
    },
    
    // Ensure arrays are never null
    specializations: (doctor) => doctor.specializations || [],
    qualifications: (doctor) => doctor.qualifications || [],
    licenses: (doctor) => {
      const licenses = doctor.licenses || [];
      return licenses.map(license => ({
        ...license,
        expiryDate: license.expiryDate?.toISOString()
      }));
    },
    languages: (doctor) => doctor.languages || [],
    awards: (doctor) => doctor.awards || [],
    affiliations: (doctor) => doctor.affiliations || [],
    services: (doctor) => doctor.services || [],
    
    // Resolve availability
    availability: async (doctor) => {
      if (doctor.availability) {
        return doctor.availability;
      }
      
      // Load availability separately if needed
      try {
        const availability = await doctorService.getDoctorAvailability(doctor.id);
        return availability;
      } catch (error) {
        logger.error('Error loading doctor availability:', error);
        return null;
      }
    },
    
    // Calculate rating
    rating: (doctor) => {
      return doctor.rating || 0;
    }
  },

  TimeSlot: {
    // Format dates
    date: (slot) => slot.date?.toISOString?.() || slot.date,
    
    // Transform status from lowercase to uppercase enum
    status: (slot) => {
      if (!slot.status) return 'AVAILABLE';
      return slot.status.toUpperCase();
    }
  }
};

function requireAuthentication(context) {
  if (!context.token) {
    throw new AuthenticationError('Authentication required');
  }
}

function requireRole(user, allowedRoles) {
  if (!user || !allowedRoles.includes(user.role)) {
    throw new ForbiddenError(`Access denied. Required roles: ${allowedRoles.join(', ')}`);
  }
}


module.exports = resolvers;