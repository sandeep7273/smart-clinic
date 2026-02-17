/**
 * gRPC Server for Appointment Service
 * Handles inter-service communication for appointments
 */

const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
const logger = require('../utils/logger');
const { AppointmentReadView } = require('../models/AppointmentReadView');
const { Appointment } = require('../models/Appointment');

// Load proto file
const PROTO_PATH = path.join(__dirname, '../../proto/appointment.proto');
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const appointmentProto = grpc.loadPackageDefinition(packageDefinition).appointment;

/**
 * Convert Appointment model to gRPC AppointmentDetails message
 */
function convertAppointmentToProto(appointment) {
  return {
    id: appointment._id ? appointment._id.toString() : appointment.id || '',
    patient_id: appointment.userId || appointment.patientId || '',
    doctor_id: appointment.doctorId || '',
    slot_id: appointment.slotId || '',
    title: appointment.title || `Appointment with Dr. ${appointment.doctor?.name || 'Doctor'}`,
    description: appointment.notes || appointment.reason || '',
    type: appointment.type || 'consultation',
    status: appointment.status || 'pending',
    appointment_number: appointment.appointmentNumber || '',
    date: appointment.date || '',
    start_time: appointment.startTime || '',
    end_time: appointment.endTime || '',
    reason: appointment.reason || '',
    duration: appointment.duration || 30,
    fee: appointment.fee || appointment.consultationFee || 0,
    payment_status: appointment.paymentStatus || 'pending',
    created_at: appointment.createdAt ? appointment.createdAt.toISOString() : '',
    updated_at: appointment.updatedAt ? appointment.updatedAt.toISOString() : '',
  };
}

/**
 * gRPC Service Implementation
 */
const grpcServiceImpl = {
  /**
   * Get user appointments
   */
  async GetUserAppointments(call, callback) {
    try {
      const { user_id, auth_token, status, limit, page } = call.request;

      logger.info('gRPC: GetUserAppointments called', {
        userId: user_id,
        status,
        limit,
        page,
        hasAuth: !!auth_token,
      });

      // Build query
      const query = {
        userId: user_id,
        isDeleted: false,
      };

      // Add status filter if provided
      if (status && status.trim() !== '') {
        query.status = status;
      }

      // Calculate skip for pagination
      const limitValue = limit || 10;
      const pageValue = page || 1;
      const skip = (pageValue - 1) * limitValue;

      // Get appointments from database using ReadView for better performance
      let appointments;
      try {
        appointments = await AppointmentReadView.find(query)
          .sort({ date: -1, startTime: -1 })
          .limit(limitValue)
          .skip(skip)
          .lean();
      } catch (error) {
        logger.error('Error querying AppointmentReadView, falling back to Appointment model', {
          error: error.message,
        });
        // Fallback to main Appointment model if ReadView fails
        appointments = await Appointment.find(query)
          .sort({ date: -1, startTime: -1 })
          .limit(limitValue)
          .skip(skip)
          .lean();
      }

      // Get total count
      let totalCount;
      try {
        totalCount = await AppointmentReadView.countDocuments(query);
      } catch (error) {
        totalCount = await Appointment.countDocuments(query);
      }

      // Convert to proto format
      const appointmentsList = appointments.map(convertAppointmentToProto);

      logger.info('gRPC: Found appointments', {
        count: appointments.length,
        totalCount,
        userId: user_id,
      });

      callback(null, {
        success: true,
        message: `Found ${appointments.length} appointment(s)`,
        appointments: appointmentsList,
        total_count: totalCount,
      });
    } catch (error) {
      logger.error('gRPC: GetUserAppointments error', { error: error.message });
      callback(null, {
        success: false,
        message: error.message || 'Failed to get appointments',
        appointments: [],
        total_count: 0,
      });
    }
  },

  /**
   * Get appointment by ID
   */
  async GetAppointmentById(call, callback) {
    try {
      const { appointment_id, auth_token } = call.request;

      logger.info('gRPC: GetAppointmentById called', {
        appointmentId: appointment_id,
        hasAuth: !!auth_token,
      });

      // Fetch appointment from database
      let appointment;
      try {
        appointment = await AppointmentReadView.findById(appointment_id);
      } catch (error) {
        appointment = await Appointment.findById(appointment_id);
      }

      if (!appointment || appointment.isDeleted) {
        return callback(null, {
          success: false,
          message: 'Appointment not found',
          appointment: null,
        });
      }

      // Convert to proto format
      const appointmentDetails = convertAppointmentToProto(appointment);

      callback(null, {
        success: true,
        message: 'Appointment retrieved successfully',
        appointment: appointmentDetails,
      });
    } catch (error) {
      logger.error('gRPC: GetAppointmentById error', { error: error.message });
      callback(null, {
        success: false,
        message: error.message || 'Failed to get appointment',
        appointment: null,
      });
    }
  },
};

/**
 * Start gRPC server
 */
function startGrpcServer(port = 50052) {
  const server = new grpc.Server();

  // Add service implementation
  server.addService(appointmentProto.AppointmentService.service, grpcServiceImpl);

  // Bind server to port
  server.bindAsync(
    `0.0.0.0:${port}`,
    grpc.ServerCredentials.createInsecure(),
    (error, port) => {
      if (error) {
        logger.error('Failed to start gRPC server', { error: error.message });
        return;
      }

      console.log(`✅ Appointment gRPC server running on port ${port}`);
      logger.info(`Appointment gRPC server started on port ${port}`);
    }
  );

  return server;
}

module.exports = {
  startGrpcServer,
  grpcServiceImpl,
};
