const { Doctor } = require('../models/Doctor');
const { DoctorScheduleReadView } = require('../models/DoctorScheduleReadView');
const { ValidationError, NotFoundError, ConflictError } = require('../utils/errors');
const logger = require('../utils/logger');
const { publishDoctorEvent, EVENT_TYPES } = require('../kafka');

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

      // Publish doctor created event
      try {
        await publishDoctorEvent(EVENT_TYPES.DOCTOR_CREATED, {
          doctorId: doctor._id.toString(),
          userId,
          firstName: doctor.firstName,
          lastName: doctor.lastName,
          email: doctor.email,
          specializations: doctor.specializations,
          consultationFee: doctor.consultationFee,
          status: doctor.status
        });
      } catch (kafkaError) {
        logger.error('Failed to publish DOCTOR_CREATED event:', kafkaError);
        // Don't fail the request if Kafka is down
      }

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
      if (error.name === 'NotFoundError') {
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

      // Publish doctor updated event
      try {
        await publishDoctorEvent(EVENT_TYPES.DOCTOR_UPDATED, {
          doctorId: doctor._id.toString(),
          userId: doctor.userId,
          updatedFields: Object.keys(updateData),
          email: doctor.email,
          specializations: doctor.specializations
        });
      } catch (kafkaError) {
        logger.error('Failed to publish DOCTOR_UPDATED event:', kafkaError);
      }

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

      // Publish doctor deleted event
      try {
        await publishDoctorEvent(EVENT_TYPES.DOCTOR_DELETED, {
          doctorId: doctor._id.toString(),
          userId: doctor.userId,
          email: doctor.email
        });
      } catch (kafkaError) {
        logger.error('Failed to publish DOCTOR_DELETED event:', kafkaError);
      }

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

      const totalPages = Math.ceil(total / limit);

      return {
        doctors,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
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
   * Check doctor availability for a specific slot
   */
  async checkAvailability(doctorId, date, startTime, endTime) {
    try {
      const doctor = await DoctorScheduleReadView.findById(doctorId);
      if (!doctor) {
        throw new NotFoundError('Doctor not found');
      }

      const isAvailable = doctor.isSlotAvailable(date, startTime, endTime);
      logger.info(`Checked availability for doctor: ${doctorId} on ${date} from ${startTime} to ${endTime} - Available: ${isAvailable}`);
      
      return {
        available: isAvailable,
        doctorId,
        date,
        startTime,
        endTime,
      };
    } catch (error) {
      logger.error('Error checking doctor availability:', error);
      throw error;
    }
  }

  /**
   * Reserve a time slot for appointment
   */
  async reserveTimeSlot(slotData) {
    try {
      const { doctorId, date, startTime, endTime, userId } = slotData;
      
      console.log(`Attempting to reserve slot for doctor: ${doctorId}`);
      
      // Get doctor from write model (use findOne with doctorId field for read view IDs)
      let doctor = await Doctor.findById(doctorId);
      
      // If not found by _id, try finding by the doctorId field from read view
      if (!doctor) {
        const readView = await DoctorScheduleReadView.findById(doctorId);
        if (readView && readView.doctorId) {
          doctor = await Doctor.findById(readView.doctorId);
        }
      }
      
      if (!doctor) {
        console.error(`Doctor not found with ID: ${doctorId}`);
        throw new NotFoundError('Doctor not found');
      }

      console.log(`Doctor found: ${doctor.firstName} ${doctor.lastName} (${doctor._id})`);

      // Initialize availability array if not exists
      if (!doctor.availability) {
        doctor.availability = [];
      }

      // Check if slot is available from read view
      const readView = await DoctorScheduleReadView.findOne({ 
        $or: [
          { _id: doctorId },
          { doctorId: doctor._id }
        ]
      });
      
      if (readView) {
        const isAvailable = readView.isSlotAvailable(date, startTime, endTime);
        if (!isAvailable) {
          throw new ConflictError('Slot is not available');
        }
      }

      // Find existing slot
      let slot = doctor.availability.find(s => 
        new Date(s.date).toDateString() === new Date(date).toDateString() &&
        s.startTime === startTime &&
        s.endTime === endTime
      );

      if (slot) {
        // Check if already booked
        if (slot.status === 'booked') {
          throw new ConflictError('Slot is already booked');
        }
        // Update existing slot
        slot.status = 'booked';
      } else {
        // Create new slot
        slot = {
          date: new Date(date),
          startTime,
          endTime,
          status: 'booked',
        };
        doctor.availability.push(slot);
      }

      // Ensure required fields are present for save validation
      if (!doctor.createdByUserId) {
        doctor.createdByUserId = userId || doctor.userId;
      }

      await doctor.save();
      
      // Get the slot ID after save (for newly created slots)
      if (!slot._id) {
        slot = doctor.availability[doctor.availability.length - 1];
      }
      
      // Update read view
      await DoctorScheduleReadView.updateFromDoctor(doctor);
      
      logger.info(`Slot reserved successfully for doctor: ${doctor._id} on ${date} from ${startTime} to ${endTime}`);
      
      // Publish slot reserved event
      try {
        await publishDoctorEvent(EVENT_TYPES.DOCTOR_SLOT_RESERVED, {
          doctorId: doctor._id.toString(),
          slotId: slot._id.toString(),
          date: slot.date,
          startTime: slot.startTime,
          endTime: slot.endTime,
          userId: userId,
          status: slot.status
        });
      } catch (kafkaError) {
        logger.error('Failed to publish DOCTOR_SLOT_RESERVED event:', kafkaError);
      }
      
      return {
        success: true,
        slotId: slot._id,
        doctorId: doctor._id,
        date: slot.date,
        startTime: slot.startTime,
        endTime: slot.endTime,
        status: slot.status,
      };
    } catch (error) {
      logger.error('Error reserving time slot:', error);
      throw error;
    }
  }

  /**
   * Release a reserved time slot (compensation)
   */
  async releaseTimeSlot(doctorId, slotId) {
    try {
      const doctor = await Doctor.findById(doctorId);
      if (!doctor) {
        throw new NotFoundError('Doctor not found');
      }

      const slot = doctor.availability.id(slotId);
      if (!slot) {
        logger.warn(`Slot ${slotId} not found for doctor ${doctorId}`);
        return { success: true, message: 'Slot not found or already released' };
      }

      // Change status back to available
      slot.status = 'available';
      slot.appointmentId = null;

      await doctor.save();
      
      // Update read view
      await DoctorScheduleReadView.updateFromDoctor(doctor);
      
      logger.info(`Slot released for doctor: ${doctorId}, slot: ${slotId}`);
      
      // Publish slot released event
      try {
        await publishDoctorEvent(EVENT_TYPES.DOCTOR_SLOT_RELEASED, {
          doctorId: doctor._id.toString(),
          slotId: slot._id.toString(),
          date: slot.date,
          startTime: slot.startTime,
          endTime: slot.endTime,
          status: slot.status
        });
      } catch (kafkaError) {
        logger.error('Failed to publish DOCTOR_SLOT_RELEASED event:', kafkaError);
      }
      
      return {
        success: true,
        slotId: slot._id,
        status: slot.status,
      };
    } catch (error) {
      logger.error('Error releasing time slot:', error);
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

      const totalPages = Math.ceil(total / limitNum);

      return {
        doctors,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages,
          hasNext: pageNum < totalPages,
          hasPrev: pageNum > 1,
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
