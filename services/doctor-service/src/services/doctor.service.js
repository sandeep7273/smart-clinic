const { Doctor } = require('../models/Doctor');
const { DoctorScheduleReadView } = require('../models/DoctorScheduleReadView');
const { ValidationError, NotFoundError, ConflictError } = require('../utils/errors');
const logger = require('../utils/logger');
const { publishDoctorEvent, EVENT_TYPES } = require('../kafka');

class DoctorService {
  constructor() {
    // Specialization normalization map - converts synonyms to standardized department names
    this.specializationNormalizer = {
      // Cardiology variations
      'cardiologist': 'Cardiology',
      'cardiac': 'Cardiology',
      'heart': 'Cardiology',
      'cardiovascular': 'Cardiology',
      
      // Dermatology variations
      'dermatologist': 'Dermatology',
      'skin': 'Dermatology',
      
      // Orthopedics variations
      'orthopedist': 'Orthopedics',
      'orthopedic': 'Orthopedics',
      'bone': 'Orthopedics',
      'joint': 'Orthopedics',
      
      // Neurology variations
      'neurologist': 'Neurology',
      'neuro': 'Neurology',
      'brain': 'Neurology',
      
      // Pediatrics variations
      'pediatrician': 'Pediatrics',
      'pediatric': 'Pediatrics',
      'children': 'Pediatrics',
      'child': 'Pediatrics',
      
      // Ophthalmology variations
      'ophthalmologist': 'Ophthalmology',
      'eye': 'Ophthalmology',
      'vision': 'Ophthalmology',
      
      // ENT variations
      'ent specialist': 'ENT',
      'ear nose throat': 'ENT',
      
      // Psychiatry variations
      'psychiatrist': 'Psychiatry',
      'mental': 'Psychiatry',
      
      // Endocrinology variations
      'endocrinologist': 'Endocrinology',
      'diabetes': 'Endocrinology',
      'thyroid': 'Endocrinology',
      
      // Gynecology variations
      'gynecologist': 'Gynecology',
      'obstetrician': 'Gynecology',
      'women': 'Gynecology',
      
      // General Medicine variations
      'general physician': 'General Medicine',
      'gp': 'General Medicine',
      'family physician': 'General Medicine'
    };
  }

  /**
   * Normalize specialization to match database format
   * Converts variations like "Cardiologist" to "Cardiology"
   */
  normalizeSpecialization(spec) {
    if (!spec) return null;
    
    const lowerSpec = spec.toLowerCase().trim();
    
    // Check if it's in the normalization map
    if (this.specializationNormalizer[lowerSpec]) {
      return this.specializationNormalizer[lowerSpec];
    }
    
    // Check if it's already a valid department name (exact match)
    const validDepartments = [
      'Cardiology', 'Dermatology', 'Orthopedics', 'Neurology',
      'Pediatrics', 'Ophthalmology', 'ENT', 'Psychiatry',
      'Endocrinology', 'Gynecology', 'General Medicine'
    ];
    
    for (const dept of validDepartments) {
      if (dept.toLowerCase() === lowerSpec) {
        return dept;
      }
    }
    
    // Return original if no match found
    return spec;
  }

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
   * Supports lenient search across name, specialization, location, conditions, symptoms
   */
  async searchDoctors(searchParams) {
    try {
      const {
        search, // GraphQL 'search' parameter - comprehensive search across all fields
        query,
        name,
        specialty,
        specialization,
        location,
        city, // GraphQL 'city' parameter - map to 'location'
        state, // GraphQL 'state' parameter
        condition,
        symptom,
        date,
        minRating,
        maxFee,
        language,
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
      
      // Primary search parameter - searches across name, specialization, location, etc.
      // This provides lenient search functionality
      if (search) {
        filters.query = search; // The 'query' filter searches across multiple fields
      }
      
      // Specific filters (override/supplement the general search)
      if (name) filters.name = name;
      
      // Normalize specialization before searching
      if (specialty) filters.specialization = this.normalizeSpecialization(specialty);
      if (specialization) filters.specialization = this.normalizeSpecialization(specialization);
      
      // Location filters
      if (city) filters.city = city;
      if (location) filters.location = location;
      if (state) filters.state = state;
      
      // Additional filters
      if (condition) filters.condition = condition;
      if (symptom) filters.symptom = symptom;
      if (language) filters.language = language;
      if (minRating) filters.minRating = parseFloat(minRating);
      if (maxFee) filters.maxFee = parseFloat(maxFee);
      if (isAvailable !== undefined) filters.isAvailable = isAvailable === 'true' || isAvailable === true;

      logger.info(`Search performed with filters: ${JSON.stringify(filters)}, options: ${JSON.stringify(options)}`);
      const results = await DoctorScheduleReadView.search({ ...filters, ...options });
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
      // Normalize specialization to handle variations
      const normalizedSpecialization = this.normalizeSpecialization(specialization);
      
      logger.info('Searching doctors by specialization:', {
        original: specialization,
        normalized: normalizedSpecialization
      });

      const {
        page = 1,
        limit = 10,
        sortBy = 'rating',
        sortOrder = 'desc',
      } = options;

      const doctors = await DoctorScheduleReadView.findBySpecialization(normalizedSpecialization)
        .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
        .skip((page - 1) * limit)
        .limit(limit);

      const total = await DoctorScheduleReadView.countDocuments({
        specializations: normalizedSpecialization,
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
   * Helper: Get doctor with fallback to read view
   * Reusable method to fetch doctor from write model with read view fallback
   */
  async getDoctorWithFallback(doctorId) {
    let doctor = await Doctor.findById(doctorId);
    
    // If not found by _id, try finding via read view
    if (!doctor) {
      const readView = await DoctorScheduleReadView.findById(doctorId);
      if (readView && readView.doctorId) {
        doctor = await Doctor.findById(readView.doctorId);
      }
    }
    
    if (!doctor) {
      throw new NotFoundError('Doctor not found');
    }
    
    return doctor;
  }

  /**
   * Helper: Find a specific slot in doctor's availability
   * Reusable method to find a slot by date and time
   */
  findSlot(doctor, date, startTime, endTime) {
    if (!doctor.availability || doctor.availability.length === 0) {
      return null;
    }
    
    return doctor.availability.find(slot => 
      new Date(slot.date).toDateString() === new Date(date).toDateString() &&
      slot.startTime === startTime &&
      slot.endTime === endTime
    );
  }

  /**
   * Check doctor availability for a specific slot
   * Simple logic: available if NOT booked
   */
  async checkAvailability(doctorId, date, startTime, endTime) {
    try {
      const doctor = await this.getDoctorWithFallback(doctorId);

      // Check if doctor is active
      if (doctor.status !== 'active' || !doctor.isAvailable) {
        return { available: false, doctorId, date, startTime, endTime, reason: 'Doctor not available' };
      }

      // Check if slot is booked - if not booked, it's available
      const slot = this.findSlot(doctor, date, startTime, endTime);
      const isBooked = slot && slot.status === 'booked';
      
      const isAvailable = !isBooked;
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
      
      logger.info(`Attempting to reserve slot for doctor: ${doctorId}`);
      
      // Get doctor using reusable helper method
      const doctor = await this.getDoctorWithFallback(doctorId);
      logger.info(`Doctor found: ${doctor.firstName} ${doctor.lastName} (${doctor._id})`);

      // Initialize availability array if not exists
      if (!doctor.availability) {
        doctor.availability = [];
      }

      // Check if slot exists using reusable helper method
      let slot = this.findSlot(doctor, date, startTime, endTime);

      if (slot) {
        // Check if already booked
        if (slot.status === 'booked') {
          throw new ConflictError('Slot is already booked');
        }
        // Update existing slot to booked
        slot.status = 'booked';
      } else {
        // Create new booked slot (only track booked slots)
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
   * Get reserved slots for a doctor
   * Can filter by date range or get all reserved slots
   */
  async getReservedSlots(doctorId, options = {}) {
    try {
      const { date, startDate, endDate, status = 'booked' } = options;
      
      // Get doctor using reusable helper method
      const doctor = await this.getDoctorWithFallback(doctorId);
      
      if (!doctor.availability || doctor.availability.length === 0) {
        return [];
      }
      
      let reservedSlots = doctor.availability.filter(slot => slot.status === status);
      
      // Filter by specific date if provided
      if (date) {
        reservedSlots = reservedSlots.filter(slot => 
          new Date(slot.date).toDateString() === new Date(date).toDateString()
        );
      }
      
      // Filter by date range if provided
      if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        reservedSlots = reservedSlots.filter(slot => {
          const slotDate = new Date(slot.date);
          return slotDate >= start && slotDate <= end;
        });
      }
      
      logger.info(`Found ${reservedSlots.length} reserved slots for doctor: ${doctorId}`);
      
      return reservedSlots.map(slot => ({
        slotId: slot._id,
        date: slot.date,
        startTime: slot.startTime,
        endTime: slot.endTime,
        status: slot.status,
        appointmentId: slot.appointmentId,
        notes: slot.notes
      }));
    } catch (error) {
      logger.error('Error getting reserved slots:', error);
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

      // Remove the booked slot (we only track booked slots)
      doctor.availability.pull(slotId);

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
      const [specializations, locations] = await Promise.all([
        DoctorScheduleReadView.getSpecializations(),
        DoctorScheduleReadView.getLocations(),
      ]);

      return {
        specializations,
        locations,
      };
    } catch (error) {
      logger.error('Error getting filter options:', error);
      throw error;
    }
  }

  /**
   * Get popular specializations with statistics
   */
  async getPopularSpecializations(limit = 10) {
    try {
      const specializations = await DoctorScheduleReadView.aggregate([
        // Unwind the specializations array
        { $unwind: '$specializations' },
        // Group by specialization and calculate stats
        {
          $group: {
            _id: '$specializations',
            count: { $sum: 1 },
            avgRating: { $avg: '$rating' },
            avgFee: { $avg: '$consultationFee' }
          }
        },
        // Sort by count descending
        { $sort: { count: -1 } },
        // Limit results
        { $limit: limit },
        // Project to match GraphQL schema
        {
          $project: {
            _id: 0,
            specialization: '$_id',
            count: 1,
            avgRating: { $ifNull: ['$avgRating', 0] },
            avgFee: { $round: [{ $ifNull: ['$avgFee', 0] }, 0] }
          }
        }
      ]);

      return specializations;
    } catch (error) {
      logger.error('Error getting popular specializations:', error);
      throw error;
    }
  }

  /**
   * Get doctor locations (for filter options)
   */
  async getDoctorLocations(limit = 10) {
    try {
      // Aggregate doctors by city and state to get location statistics
      const locations = await DoctorScheduleReadView.aggregate([
        {
          $match: {
            status: 'active',
            'address.city': { $exists: true, $ne: null },
            'address.state': { $exists: true, $ne: null }
          }
        },
        {
          $group: {
            _id: {
              city: '$address.city',
              state: '$address.state'
            },
            count: { $sum: 1 }
          }
        },
        {
          $sort: { count: -1 }
        },
        {
          $limit: limit
        },
        {
          $project: {
            _id: 0,
            city: '$_id.city',
            state: '$_id.state',
            count: 1
          }
        }
      ]);

      return locations;
    } catch (error) {
      logger.error('Error getting doctor locations:', error);
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

  /**
   * Get doctor availability with generated time slots
   * Generates slots from 9 AM to 5 PM (30-minute intervals) and checks against booked slots
   */
  async getDoctorAvailability(doctorId, startDate, endDate) {
    try {
      // Verify doctor exists (use write model with read view fallback)
      const doctor = await this.getDoctorWithFallback(doctorId);

      logger.info('Generating availability slots:', {
        doctorId,
        startDate,
        endDate
      });

      const slots = [];
      const start = new Date(startDate);
      const end = new Date(endDate);

      // Generate slots for each date in the range
      for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
        const dateStr = date.toISOString().split('T')[0];
        const daySlots = this.generateDaySlots(dateStr);
        slots.push(...daySlots);
      }

      // Mark slots as booked or available
      const availabilitySlots = slots.map(slot => {
        const bookedSlot = this.findSlot(doctor, slot.date, slot.startTime, slot.endTime);

        if (bookedSlot) {
          return {
            date: slot.date,
            startTime: slot.startTime,
            endTime: slot.endTime,
            status: bookedSlot.status || 'BOOKED',
            appointmentId: bookedSlot.appointmentId?.toString() || null,
            notes: bookedSlot.notes || null
          };
        }

        return {
          date: slot.date,
          startTime: slot.startTime,
          endTime: slot.endTime,
          status: 'AVAILABLE',
          appointmentId: null,
          notes: null
        };
      });

      logger.info('Generated availability slots:', {
        doctorId,
        totalSlots: availabilitySlots.length,
        availableSlots: availabilitySlots.filter(s => s.status === 'AVAILABLE').length,
        bookedSlots: availabilitySlots.filter(s => s.status === 'BOOKED').length
      });
      console.log("debugging generated availability slots", availabilitySlots);
      return availabilitySlots;
    } catch (error) {
      logger.error('Error getting doctor availability:', error);
      throw error;
    }
  }

  /**
   * Generate time slots for a single day (9 AM to 5 PM, 30-minute intervals)
   */
  generateDaySlots(dateStr) {
    const slots = [];
    const startHour = 9;
    const endHour = 17;
    
    for (let hour = startHour; hour < endHour; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const startTime = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        const endMinute = minute + 30;
        const endHour = hour + (endMinute >= 60 ? 1 : 0);
        const endTime = `${endHour.toString().padStart(2, '0')}:${(endMinute % 60).toString().padStart(2, '0')}`;
        
        slots.push({
          date: dateStr,
          startTime,
          endTime,
          status: 'AVAILABLE',
          appointmentId: null,
          notes: null
        });
      }
    }
    
    return slots;
  }
}

module.exports = new DoctorService();
