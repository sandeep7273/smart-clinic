/**
 * gRPC Server for Doctor Service
 * Handles inter-service communication between doctor-service and appointment-service
 */

const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
const logger = require('../utils/logger');
const { DoctorScheduleReadView } = require('../models/DoctorScheduleReadView');
const { Doctor } = require('../models/Doctor');
const doctorService = require('../services/doctor.service');

// Load proto file
const PROTO_PATH = path.join(__dirname, '../../proto/doctor.proto');
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const doctorProto = grpc.loadPackageDefinition(packageDefinition).doctor;

/**
 * Convert Doctor model to gRPC DoctorDetails message
 */
function convertDoctorToProto(doctor) {
  return {
    id: doctor._id.toString(),
    user_id: doctor.userId || '',
    first_name: doctor.firstName || '',
    last_name: doctor.lastName || '',
    email: doctor.email || '',
    phone: doctor.phone || '',
    specializations: doctor.specializations || [],
    qualifications: doctor.qualifications || [],
    experience_years: doctor.experienceYears || 0,
    license_number: doctor.licenseNumber || '',
    consultation_fee: doctor.consultationFee || 0,
    bio: doctor.bio || '',
    languages: doctor.languages || [],
    status: doctor.status || 'active',
    address: doctor.address
      ? {
          street: doctor.address.street || '',
          city: doctor.address.city || '',
          state: doctor.address.state || '',
          zip_code: doctor.address.zipCode || '',
          country: doctor.address.country || '',
        }
      : null,
    schedules: (doctor.schedules || []).map((schedule) => ({
      day_of_week: schedule.dayOfWeek || '',
      start_time: schedule.startTime || '',
      end_time: schedule.endTime || '',
      slot_duration: schedule.slotDuration || 30,
      is_available: schedule.isAvailable !== false,
    })),
    created_at: doctor.createdAt ? doctor.createdAt.toISOString() : '',
    updated_at: doctor.updatedAt ? doctor.updatedAt.toISOString() : '',
  };
}

/**
 * gRPC Service Implementation
 */
const grpcServiceImpl = {
  /**
   * Get doctor details by ID
   */
  async GetDoctorDetails(call, callback) {
    try {
      const { doctor_id, auth_token } = call.request;
      
      logger.info('gRPC: GetDoctorDetails called', {
        doctorId: doctor_id,
        hasAuth: !!auth_token,
      });

      // Fetch doctor from database
      const doctor = await DoctorScheduleReadView.findById(doctor_id);

      if (!doctor) {
        return callback(null, {
          success: false,
          message: 'Doctor not found',
          data: null,
        });
      }

      // Convert to proto format
      const doctorDetails = convertDoctorToProto(doctor);

      callback(null, {
        success: true,
        message: 'Doctor details retrieved successfully',
        data: doctorDetails,
      });
    } catch (error) {
      logger.error('gRPC: GetDoctorDetails error', { error: error.message });
      callback(null, {
        success: false,
        message: error.message || 'Failed to get doctor details',
        data: null,
      });
    }
  },

  /**
   * Check doctor availability
   */
  async CheckAvailability(call, callback) {
    try {
      const { doctor_id, date, start_time, end_time, auth_token } = call.request;

      logger.info('gRPC: CheckAvailability called', {
        doctorId: doctor_id,
        date,
        startTime: start_time,
        endTime: end_time,
      });

      // Fetch doctor
      const doctor = await DoctorScheduleReadView.findById(doctor_id);

      if (!doctor) {
        return callback(null, {
          success: false,
          message: 'Doctor not found',
          data: { available: false, reason: 'Doctor not found' },
        });
      }

      // Check if date/time is in doctor's schedule
      const dayOfWeek = new Date(date).toLocaleDateString('en-US', { weekday: 'long' });
      const schedule = doctor.schedules?.find((s) => s.dayOfWeek === dayOfWeek);

      if (!schedule || !schedule.isAvailable) {
        return callback(null, {
          success: true,
          message: 'Availability checked',
          data: { available: false, reason: 'Doctor not available on this day' },
        });
      }

      // Simple time range check (you can enhance this with slot checking)
      const scheduleStart = schedule.startTime;
      const scheduleEnd = schedule.endTime;

      const available =
        start_time >= scheduleStart &&
        end_time <= scheduleEnd &&
        start_time < end_time;

      callback(null, {
        success: true,
        message: 'Availability checked',
        data: {
          available,
          reason: available ? 'Time slot available' : 'Time slot outside schedule',
        },
      });
    } catch (error) {
      logger.error('gRPC: CheckAvailability error', { error: error.message });
      callback(null, {
        success: false,
        message: error.message,
        data: { available: false, reason: error.message },
      });
    }
  },

  /**
   * Reserve a slot
   */
  async ReserveSlot(call, callback) {
    try {
      const { doctor_id, slot_id, patient_id, auth_token, date, start_time, end_time, duration } = call.request;

      logger.info('gRPC: ReserveSlot called', {
        doctorId: doctor_id,
        slotId: slot_id,
        patientId: patient_id,
        date,
        startTime: start_time,
        endTime: end_time,
      });

      // Use actual DoctorService to reserve slot
      const slotData = {
        doctorId: doctor_id,
        patientId: patient_id,
        date: date,
        startTime: start_time,
        endTime: end_time,
        duration: duration || 30,
      };

      // If slotId is provided, add it to the data
      if (slot_id) {
        slotData.slotId = slot_id;
      }

      const result = await doctorService.reserveTimeSlot(slotData);

      callback(null, {
        success: true,
        message: 'Slot reserved successfully',
        data: {
          slot_id: result.slotId || slot_id,
          status: result.status || 'reserved',
        },
      });
    } catch (error) {
      logger.error('gRPC: ReserveSlot error', { error: error.message });
      callback(null, {
        success: false,
        message: error.message,
        data: null,
      });
    }
  },

  /**
   * Release a slot
   */
  async ReleaseSlot(call, callback) {
    try {
      const { doctor_id, slot_id, auth_token } = call.request;

      logger.info('gRPC: ReleaseSlot called', {
        doctorId: doctor_id,
        slotId: slot_id,
      });

      // Use actual DoctorService to release slot
      const result = await doctorService.releaseTimeSlot(doctor_id, slot_id);

      callback(null, {
        success: result.success,
        message: result.message || 'Slot released successfully',
      });
    } catch (error) {
      logger.error('gRPC: ReleaseSlot error', { error: error.message });
      callback(null, {
        success: false,
        message: error.message,
      });
    }
  },
};

/**
 * Start gRPC server
 */
function startGrpcServer(port = 50051) {
  const server = new grpc.Server();

  // Add service implementation
  server.addService(doctorProto.DoctorService.service, grpcServiceImpl);

  // Bind server to port
  server.bindAsync(
    `0.0.0.0:${port}`,
    grpc.ServerCredentials.createInsecure(),
    (error, port) => {
      if (error) {
        logger.error('Failed to start gRPC server', { error: error.message });
        return;
      }

      console.log(`✅ gRPC server running on port ${port}`);
      logger.info(`gRPC server started on port ${port}`);
    }
  );

  return server;
}

module.exports = {
  startGrpcServer,
  grpcServiceImpl,
};
