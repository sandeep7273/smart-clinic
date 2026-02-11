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
    getDoctor: async (parent, { id }) => {
      try {
        const doctor = await doctorService.getDoctorById(id);
        return doctor;
      } catch (error) {
        logger.error('Error fetching doctor:', error);
        throw error;
      }
    },

    // Search doctors with filters
    searchDoctors: async (parent, { search, filters, page, limit, sortBy, sortOrder }) => {
      try {
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
    getDoctorsBySpecialization: async (parent, { specialization, page, limit }) => {
      try {
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
    getDoctorAvailability: async (parent, { doctorId, startDate, endDate }) => {
      try {
        const availability = await doctorService.getDoctorAvailability(doctorId, startDate, endDate);
        return availability;
      } catch (error) {
        logger.error('Error fetching doctor availability:', error);
        throw error;
      }
    },

    // Get popular specializations
    getPopularSpecializations: async (parent, { limit }) => {
      try {
        const specializations = await doctorService.getPopularSpecializations(limit);
        return specializations;
      } catch (error) {
        logger.error('Error fetching popular specializations:', error);
        throw error;
      }
    },

    // Get doctor statistics (admin only)
    getDoctorStats: async (parent, args, context) => {
      if (!context.user || context.user.role !== 'ADMIN') {
        throw new ForbiddenError('Admin access required');
      }

      try {
        const stats = await doctorService.getDoctorStatistics();
        return stats;
      } catch (error) {
        logger.error('Error fetching doctor statistics:', error);
        throw error;
      }
    },

    // Get nearby doctors
    getNearbyDoctors: async (parent, { latitude, longitude, radius, limit }) => {
      try {
        const doctors = await doctorService.getNearbyDoctors(latitude, longitude, radius, limit);
        return doctors;
      } catch (error) {
        logger.error('Error fetching nearby doctors:', error);
        throw error;
      }
    }
  },

  Mutation: {
    // Create new doctor profile
    createDoctor: async (parent, { input }, context) => {
      if (!context.user || !['ADMIN', 'DOCTOR'].includes(context.user.role)) {
        throw new ForbiddenError('Insufficient permissions');
      }

      try {
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
        const doctor = await doctorService.updateDoctorAvailability(doctorId, input, context.user);
        return doctor;
      } catch (error) {
        logger.error('Error updating doctor availability:', error);
        throw error;
      }
    },

    // Reserve a time slot
    reserveSlot: async (parent, { input }, context) => {
      try {
        const slot = await doctorService.reserveTimeSlot(input);
        return slot;
      } catch (error) {
        logger.error('Error reserving slot:', error);
        throw error;
      }
    },

    // Release a reserved slot
    releaseSlot: async (parent, { doctorId, date, startTime }, context) => {
      try {
        const slot = await doctorService.releaseTimeSlot(doctorId, date, startTime);
        return slot;
      } catch (error) {
        logger.error('Error releasing slot:', error);
        throw error;
      }
    },

    // Update slot status
    updateSlotStatus: async (parent, { doctorId, date, startTime, status, appointmentId }, context) => {
      try {
        const slot = await doctorService.updateSlotStatus(
          doctorId, 
          date, 
          startTime, 
          status, 
          appointmentId
        );
        return slot;
      } catch (error) {
        logger.error('Error updating slot status:', error);
        throw error;
      }
    },

    // Update doctor status (admin only)
    updateDoctorStatus: async (parent, { doctorId, status }, context) => {
      if (!context.user || context.user.role !== 'ADMIN') {
        throw new ForbiddenError('Admin access required');
      }

      try {
        const doctor = await doctorService.updateDoctorStatus(doctorId, status);
        return doctor;
      } catch (error) {
        logger.error('Error updating doctor status:', error);
        throw error;
      }
    },

    // Verify doctor (admin only)
    verifyDoctor: async (parent, { doctorId, isVerified }, context) => {
      if (!context.user || context.user.role !== 'ADMIN') {
        throw new ForbiddenError('Admin access required');
      }

      try {
        const doctor = await doctorService.verifyDoctor(doctorId, isVerified);
        return doctor;
      } catch (error) {
        logger.error('Error verifying doctor:', error);
        throw error;
      }
    },

    // Delete doctor (soft delete)
    deleteDoctor: async (parent, { doctorId }, context) => {
      if (!context.user || context.user.role !== 'ADMIN') {
        throw new ForbiddenError('Admin access required');
      }

      try {
        await doctorService.deleteDoctor(doctorId);
        return true;
      } catch (error) {
        logger.error('Error deleting doctor:', error);
        return false;
      }
    },

    // Generate time slots for doctor
    generateTimeSlots: async (parent, { doctorId, startDate, endDate, slotDuration }, context) => {
      if (!context.user) {
        throw new AuthenticationError('You must be logged in');
      }

      try {
        const slots = await doctorService.generateTimeSlots(
          doctorId, 
          startDate, 
          endDate, 
          slotDuration
        );
        return slots;
      } catch (error) {
        logger.error('Error generating time slots:', error);
        throw error;
      }
    }
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

module.exports = resolvers;