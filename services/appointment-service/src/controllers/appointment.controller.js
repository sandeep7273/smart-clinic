/**
 * Appointment Controller
 * Handles appointment-related requests
 */

const { Appointment } = require('../models/Appointment');
const { AppointmentReadView } = require('../models/AppointmentReadView');
const { AppointmentEvent } = require('../models/AppointmentEvent');
const SagaOrchestrator = require('../services/sagaOrchestrator');
const { publishEvent } = require('../utils/eventProducer');
const logger = require('../utils/logger');
const { NotFoundError, ConflictError } = require('../utils/errors');

/**
 * Create appointment (Book using SAGA)
 */
exports.createAppointment = async (req, res, next) => {
  try {
    const bookingData = {
      userId: req.body.userId,
      doctorId: req.body.doctorId,
      date: req.body.date,
      startTime: req.body.startTime,
      endTime: req.body.endTime,
      duration: req.body.duration || 30,
      reason: req.body.reason,
      notes: req.body.notes,
      symptoms: req.body.symptoms,
    };

    // Execute SAGA for booking
    const saga = new SagaOrchestrator();
    const result = await saga.bookAppointment(bookingData, req.user, req.authToken);

    res.status(201).json({
      success: true,
      message: 'Appointment booked successfully',
      data: result.appointment,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all appointments (with filters)
 */
exports.getAllAppointments = async (req, res, next) => {
  try {
    const filters = {
      userId: req.query.userId,
      doctorId: req.query.doctorId,
      status: req.query.status,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      page: req.query.page,
      limit: req.query.limit,
      sortBy: req.query.sortBy,
      sortOrder: req.query.sortOrder,
      search: req.query.search,
      tenantId: req.user.tenantId,
    };

    const result = await AppointmentReadView.search(filters);

    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get appointment by ID
 */
exports.getAppointmentById = async (req, res, next) => {
  try {
    const appointment = await Appointment.findById(req.params.id);

    if (!appointment || appointment.isDeleted) {
      throw new NotFoundError('Appointment');
    }

    res.json({
      success: true,
      data: appointment,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update appointment
 */
exports.updateAppointment = async (req, res, next) => {
  try {
    const appointment = await Appointment.findById(req.params.id);

    if (!appointment || appointment.isDeleted) {
      throw new NotFoundError('Appointment');
    }

    // Update allowed fields
    if (req.body.notes) appointment.notes = req.body.notes;
    if (req.body.status) appointment.status = req.body.status;
    
    appointment.updatedBy = req.user.userId;
    await appointment.save();

    // Create event
    await AppointmentEvent.createEvent({
      aggregateId: appointment._id.toString(),
      aggregateType: 'Appointment',
      eventType: 'APPOINTMENT_UPDATED',
      eventData: { ...req.body },
      metadata: {
        userId: req.user.userId,
        userRole: req.user.role,
      },
      tenantId: req.user.tenantId,
    });

    // Update read view
    await AppointmentReadView.updateFromAppointment(appointment);

    // Publish event
    await publishEvent('APPOINTMENT_UPDATED', {
      appointmentId: appointment._id.toString(),
      appointmentNumber: appointment.appointmentNumber,
      ...req.body,
      tenantId: appointment.tenantId,
    });

    res.json({
      success: true,
      message: 'Appointment updated successfully',
      data: appointment,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Cancel appointment
 */
exports.cancelAppointment = async (req, res, next) => {
  try {
    const appointment = await Appointment.findById(req.params.id);

    if (!appointment || appointment.isDeleted) {
      throw new NotFoundError('Appointment');
    }

    if (!appointment.isCancellable()) {
      throw new ConflictError('Appointment cannot be cancelled at this time');
    }

    appointment.status = 'cancelled';
    appointment.cancelReason = req.body.cancelReason;
    appointment.cancelledAt = new Date();
    appointment.cancelledBy = req.user.userId;
    appointment.updatedBy = req.user.userId;

    await appointment.save();

    // Create event
    await AppointmentEvent.createEvent({
      aggregateId: appointment._id.toString(),
      aggregateType: 'Appointment',
      eventType: 'APPOINTMENT_CANCELLED',
      eventData: {
        cancelReason: req.body.cancelReason,
      },
      metadata: {
        userId: req.user.userId,
        userRole: req.user.role,
      },
      tenantId: req.user.tenantId,
    });

    // Update read view
    await AppointmentReadView.updateFromAppointment(appointment);

    // Publish event
    await publishEvent('APPOINTMENT_CANCELLED', {
      appointmentId: appointment._id.toString(),
      appointmentNumber: appointment.appointmentNumber,
      userId: appointment.userId,
      doctorId: appointment.doctorId,
      cancelReason: req.body.cancelReason,
      tenantId: appointment.tenantId,
    });

    res.json({
      success: true,
      message: 'Appointment cancelled successfully',
      data: appointment,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Confirm appointment
 */
exports.confirmAppointment = async (req, res, next) => {
  try {
    const appointment = await Appointment.findById(req.params.id);

    if (!appointment || appointment.isDeleted) {
      throw new NotFoundError('Appointment');
    }

    if (appointment.status !== 'pending') {
      throw new ConflictError('Only pending appointments can be confirmed');
    }

    appointment.status = 'confirmed';
    appointment.confirmedAt = new Date();
    appointment.confirmedBy = req.user.userId;
    appointment.updatedBy = req.user.userId;

    await appointment.save();

    // Create event
    await AppointmentEvent.createEvent({
      aggregateId: appointment._id.toString(),
      aggregateType: 'Appointment',
      eventType: 'APPOINTMENT_CONFIRMED',
      eventData: {},
      metadata: {
        userId: req.user.userId,
        userRole: req.user.role,
      },
      tenantId: req.user.tenantId,
    });

    // Update read view
    await AppointmentReadView.updateFromAppointment(appointment);

    // Publish event
    await publishEvent('APPOINTMENT_CONFIRMED', {
      appointmentId: appointment._id.toString(),
      appointmentNumber: appointment.appointmentNumber,
      userId: appointment.userId,
      doctorId: appointment.doctorId,
      tenantId: appointment.tenantId,
    });

    res.json({
      success: true,
      message: 'Appointment confirmed successfully',
      data: appointment,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Complete appointment
 */
exports.completeAppointment = async (req, res, next) => {
  try {
    const appointment = await Appointment.findById(req.params.id);

    if (!appointment || appointment.isDeleted) {
      throw new NotFoundError('Appointment');
    }

    if (appointment.status !== 'confirmed') {
      throw new ConflictError('Only confirmed appointments can be completed');
    }

    appointment.status = 'completed';
    appointment.completedAt = new Date();
    appointment.prescription = req.body.prescription;
    appointment.diagnosis = req.body.diagnosis;
    appointment.updatedBy = req.user.userId;

    await appointment.save();

    // Create event
    await AppointmentEvent.createEvent({
      aggregateId: appointment._id.toString(),
      aggregateType: 'Appointment',
      eventType: 'APPOINTMENT_COMPLETED',
      eventData: {
        prescription: req.body.prescription,
        diagnosis: req.body.diagnosis,
      },
      metadata: {
        userId: req.user.userId,
        userRole: req.user.role,
      },
      tenantId: req.user.tenantId,
    });

    // Update read view
    await AppointmentReadView.updateFromAppointment(appointment);

    // Publish event
    await publishEvent('APPOINTMENT_COMPLETED', {
      appointmentId: appointment._id.toString(),
      appointmentNumber: appointment.appointmentNumber,
      userId: appointment.userId,
      doctorId: appointment.doctorId,
      tenantId: appointment.tenantId,
    });

    res.json({
      success: true,
      message: 'Appointment completed successfully',
      data: appointment,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get patient's appointments
 */
exports.getPatientAppointments = async (req, res, next) => {
  try {
    const userId = req.params.userId || req.user.userId;
    
    const filters = {
      userId,
      status: req.query.status,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      page: req.query.page,
      limit: req.query.limit,
      tenantId: req.user.tenantId,
    };

    const result = await AppointmentReadView.search(filters);

    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get doctor's appointments
 */
exports.getDoctorAppointments = async (req, res, next) => {
  try {
    const doctorId = req.params.doctorId || req.user.userId;
    
    const filters = {
      doctorId,
      status: req.query.status,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      page: req.query.page,
      limit: req.query.limit,
      tenantId: req.user.tenantId,
    };

    const result = await AppointmentReadView.search(filters);

    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get appointment event history (Event Sourcing)
 */
exports.getAppointmentHistory = async (req, res, next) => {
  try {
    const appointment = await Appointment.findById(req.params.id);

    if (!appointment || appointment.isDeleted) {
      throw new NotFoundError('Appointment');
    }

    const events = await AppointmentEvent.getEventHistory(appointment._id.toString());

    res.json({
      success: true,
      data: events,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get appointment statistics
 */
exports.getAppointmentStats = async (req, res, next) => {
  try {
    const stats = await Appointment.aggregate([
      {
        $match: {
          tenantId: req.user.tenantId,
          isDeleted: false,
        },
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    next(error);
  }
};
