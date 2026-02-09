const { Doctor } = require('../models/Doctor');
const { DoctorScheduleReadView } = require('../models/DoctorScheduleReadView');
const { ValidationError, NotFoundError, ConflictError } = require('../utils/errors');
const logger = require('../utils/logger');

class DoctorService {
  /**
   * Create a new doctor
   */
  async createDoctor(userId, doctorData) {
    try {
      // Check if doctor already exists for this user
      const existingDoctor = await Doctor.findByUserId(userId);
      if (existingDoctor) {
        throw new ConflictError('Doctor profile already exists for this user');
      }

      // Check for email conflict
      if (doctorData.email) {
        const emailExists = await Doctor.findByEmail(doctorData.email);
        if (emailExists) {
          throw new ConflictError('Email already in use');
        }
      }
      console.log(`debugging  Creating doctor profile for user: ${userId} `);
      const doctor = new Doctor({
        ...doctorData,
        userId,
      });

      await doctor.save();
      console.log(`Doctor created: ${doctor._id} for user: ${userId}`);
      logger.info(`Doctor created: ${doctor._id} for user: ${userId}`);

      // Update read view (CQRS)
      await DoctorScheduleReadView.updateFromDoctor(doctor);

      return doctor;
    } catch (error) {
      logger.error('Error creating doctor:', error);
      throw error;
    }
  }

  /**
   * Get doctor by ID
   */
  async getDoctorById(doctorId) {
    try {
      const doctor = await DoctorScheduleReadView.findById(doctorId);
      if (!doctor) {
        throw new NotFoundError('Doctor not found');
      }
      return doctor;
    } catch (error) {
      if (error.name === 'CastError') {
        throw new NotFoundError('Doctor not found');
      }
      throw error;
    }
  }

  /**
   * Get doctor by user ID
   */
  async getDoctorByUserId(userId) {
    try {
      const doctor = await DoctorScheduleReadView.findByUserId(userId);
      if (!doctor) {
        throw new NotFoundError('Doctor not found');
      }
      return doctor;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update doctor profile
   */
  async updateDoctor(doctorId, updateData) {
    try {
      const doctor = await Doctor.findById(doctorId);
      if (!doctor) {
        throw new NotFoundError('Doctor not found');
      }

      // Check email conflict if email is being updated
      if (updateData.email && updateData.email !== doctor.email) {
        const emailExists = await Doctor.findByEmail(updateData.email);
        if (emailExists) {
          throw new ConflictError('Email already in use');
        }
      }

      // Update fields
      Object.keys(updateData).forEach((key) => {
        if (updateData[key] !== undefined) {
          doctor[key] = updateData[key];
        }
      });

      await doctor.save();
      // Update read view (CQRS)
      await DoctorScheduleReadView.updateFromDoctor(doctor);
      logger.info(`Doctor updated: ${doctorId}`);
      return doctor;
    } catch (error) {
      logger.error('Error updating doctor:', error);
      throw error;
    }
  }

  /**
   * Delete doctor
   */
  async deleteDoctor(doctorId) {
    try {
      const doctor = await Doctor.findByIdAndDelete(doctorId);
      if (!doctor) {
        throw new NotFoundError('Doctor not found');
      }
      logger.info(`Doctor deleted: ${doctorId}`);
      // Update read view (CQRS)
      await DoctorScheduleReadView.updateFromDoctor(doctor);
      return { message: 'Doctor deleted successfully' };
    } catch (error) {
      logger.error('Error deleting doctor:', error);
      throw error;
    }
  }

  /**
   * Comprehensive search with filters
   */
  async searchDoctors(searchParams) {
    try {
      const {
        query,
        name,
        specialty,
        specialization,
        location,
        condition,
        symptom,
        date,
        minRating,
        maxFee,
        acceptsInsurance,
        isAvailable,
        page = 1,
        limit = 10,
        sortBy = 'rating',
        sortOrder = 'desc',
      } = searchParams;

      const options = {
        page: parseInt(page),
        limit: parseInt(limit),
        sortBy,
        sortOrder,
      };

      // Build filters object with all available criteria
      const filters = {};
      
      // Add filters only if they are provided
      if (query) filters.query = query;
      if (name) filters.name = name;
      if (specialty) filters.specialization = specialty;
      if (specialization) filters.specialization = specialization;
      if (location) filters.location = location;
      if (condition) filters.condition = condition;
      if (symptom) filters.symptom = symptom;
      if (date) filters.date = date;
      if (minRating) filters.minRating = parseFloat(minRating);
      if (maxFee) filters.maxFee = parseFloat(maxFee);
      if (acceptsInsurance !== undefined) filters.acceptsInsurance = acceptsInsurance === 'true' || acceptsInsurance === true;
      if (isAvailable !== undefined) filters.isAvailable = isAvailable === 'true' || isAvailable === true;

      const results = await DoctorScheduleReadView.search({ ...filters, ...options });
      logger.info(`Search performed with filters: ${JSON.stringify(filters)}`);
      return results;
    } catch (error) {
      logger.error('Error searching doctors:', error);
      throw error;
    }
  }

  /**
   * Get available doctors
   */
  async getAvailableDoctors(options = {}) {
    try {
      const {
        specialization,
        location,
        date,
        page = 1,
        limit = 10,
      } = options;

      const filters = {};
      if (specialization) filters.specialization = specialization;
      if (location) filters.location = location;
      if (date) filters.date = date;

      const results = await DoctorScheduleReadView.findAvailableDoctors(filters, {
        page: parseInt(page),
        limit: parseInt(limit),
      });

      return results;
    } catch (error) {
      logger.error('Error getting available doctors:', error);
      throw error;
    }
  }

  /**
   * Get doctors by specialization
   */
  async getDoctorsBySpecialization(specialization, options = {}) {
    try {
      const {
        page = 1,
        limit = 10,
        sortBy = 'rating',
        sortOrder = 'desc',
      } = options;

      const doctors = await DoctorScheduleReadView.findBySpecialization(specialization)
        .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
        .skip((page - 1) * limit)
        .limit(limit);

      const total = await DoctorScheduleReadView.countDocuments({
        specializations: specialization,
        status: 'active',
      });

      return {
        doctors,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error('Error getting doctors by specialization:', error);
      throw error;
    }
  }

  /**
   * Add availability slot
   */
  async addAvailabilitySlot(doctorId, slotData) {
    try {
      const doctor = await Doctor.findById(doctorId);
      if (!doctor) {
        throw new NotFoundError('Doctor not found');
      }

      await doctor.addAvailabilitySlot(slotData);
      await DoctorScheduleReadView.updateFromDoctor(doctor); // Update read view (CQRS)
      logger.info(`Availability slot added for doctor: ${doctorId}`);
      return doctor;
    } catch (error) {
      logger.error('Error adding availability slot:', error);
      throw error;
    }
  }

  /**
   * Update slot status
   */
  async updateSlotStatus(doctorId, slotId, status) {
    try {
      const doctor = await Doctor.findById(doctorId);
      if (!doctor) {
        throw new NotFoundError('Doctor not found');
      }

      await doctor.updateSlotStatus(slotId, status);
      await DoctorScheduleReadView.updateFromDoctor(doctor); // Update read view (CQRS)
      logger.info(`Slot status updated for doctor: ${doctorId}, slot: ${slotId}`);
      return doctor;
    } catch (error) {
      logger.error('Error updating slot status:', error);
      throw error;
    }
  }

  /**
   * Get all doctors with pagination and sorting
   */
  async getAllDoctors(paginationParams) {
    try {
      const {
        page = 1,
        limit = 10,
        sortBy = 'rating',
        sortOrder = 'desc',
        status = 'active',
      } = paginationParams;

      const pageNum = Math.max(1, parseInt(page));
      const limitNum = Math.min(Math.max(1, parseInt(limit)), 100); // Max 100
      const skip = (pageNum - 1) * limitNum;

      // Build sort object
      const sortObj = {};
      const validSortFields = ['rating', 'firstName', 'lastName', 'consultationFee', 'createdAt'];
      const sortField = validSortFields.includes(sortBy) ? sortBy : 'rating';
      sortObj[sortField] = sortOrder === 'asc' ? 1 : -1;

      // Build filter
      const filter = { status };

      // Get total count
      const total = await DoctorScheduleReadView.countDocuments(filter);

      // Fetch doctors with pagination and sorting
      const doctors = await DoctorScheduleReadView.find(filter)
        .sort(sortObj)
        .skip(skip)
        .limit(limitNum)
        .lean();

      logger.info(`Retrieved ${doctors.length} doctors (page ${pageNum})`);

      return {
        doctors,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum),
        },
      };
    } catch (error) {
      logger.error('Error getting all doctors:', error);
      throw error;
    }
  }

  /**
   * Sync all doctors data to read view (CQRS)
   */
  async syncRecordsDoctorToReadView() {
    try {
      console.log('Syncing doctors to read view...');
       const doctors = await Doctor.find({});
       for (const doctor of doctors) {
         await DoctorScheduleReadView.updateFromDoctor(doctor);
       }
    } catch (error) {
       logger.error('Error syncing doctors to read view:', error);
      throw error;
    }
  }


  /**
   * Get filter options for dropdowns
   */
  async getFilterOptions() {
    try {
      const [specializations, locations, conditions, symptoms] = await Promise.all([
        DoctorScheduleReadView.getSpecializations(),
        DoctorScheduleReadView.getLocations(),
        DoctorScheduleReadView.getTreatedConditions(),
        DoctorScheduleReadView.getTreatedSymptoms(),
      ]);

      return {
        specializations,
        locations,
        conditions,
        symptoms,
      };
    } catch (error) {
      logger.error('Error getting filter options:', error);
      throw error;
    }
  }

  /**
   * Get doctor statistics
   */
  async getDoctorStats(doctorId) {
    try {
      const doctor = await DoctorScheduleReadView.findById(doctorId);
      if (!doctor) {
        throw new NotFoundError('Doctor not found');
      }

      return {
        totalPatients: doctor.totalPatients,
        rating: doctor.rating,
        reviewCount: doctor.reviewCount,
        availableSlotsCount: doctor.availableSlotsCount,
        experience: doctor.experience,
        consultationFee: doctor.consultationFee,
      };
    } catch (error) {
      logger.error('Error getting doctor stats:', error);
      throw error;
    }
  }
}

module.exports = new DoctorService();
