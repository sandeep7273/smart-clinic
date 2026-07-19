/**
 * Appointment Routes
 * REST API endpoints for appointment management
 */

const express = require('express');
const router = express.Router();
const appointmentController = require('../controllers/appointment.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { requireRole } = require('../middlewares/rbac.middleware');
const {
  createAppointmentValidation,
  updateAppointmentValidation,
  cancelAppointmentValidation,
  searchAppointmentsValidation,
  idValidation,
} = require('../middlewares/validator.middleware');

/**
 * @swagger
 * /appointments:
 *   post:
 *     summary: Create a new appointment using SAGA pattern
 *     description: |
 *       Creates a new appointment with distributed transaction management.
 *       This endpoint orchestrates a SAGA that:
 *       1. Validates booking data
 *       2. Fetches doctor details
 *       3. Fetches patient details
 *       4. Checks doctor availability
 *       5. Reserves time slot
 *       6. Creates appointment
 *       7. Records event (Event Sourcing)
 *       8. Updates read view (CQRS)
 *       9. Publishes events (Outbox Pattern)
 *       10. Sends notifications
 *     tags: [Appointments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateAppointmentRequest'
 *           examples:
 *             regularCheckup:
 *               summary: Regular checkup appointment
 *               value:
 *                 userId: "507f1f77bcf86cd799439011"
 *                 doctorId: "507f1f77bcf86cd799439012"
 *                 date: "2024-03-15"
 *                 startTime: "10:00"
 *                 endTime: "10:30"
 *                 duration: 30
 *                 reason: "Regular health checkup"
 *                 notes: "First visit"
 *             urgentConsultation:
 *               summary: Urgent consultation
 *               value:
 *                 userId: "507f1f77bcf86cd799439013"
 *                 doctorId: "507f1f77bcf86cd799439014"
 *                 date: "2024-03-10"
 *                 startTime: "14:00"
 *                 endTime: "14:45"
 *                 duration: 45
 *                 reason: "Urgent consultation for persistent symptoms"
 *                 symptoms: ["fever", "cough", "fatigue"]
 *     responses:
 *       201:
 *         description: Appointment created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Appointment created successfully"
 *                 data:
 *                   $ref: '#/components/schemas/Appointment'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               success: false
 *               error:
 *                 message: "User ID is required"
 *                 code: "ValidationError"
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               success: false
 *               error:
 *                 message: "No token provided"
 *                 code: "UnauthorizedError"
 *       403:
 *         description: Forbidden - Insufficient permissions
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       409:
 *         description: Conflict - Slot not available
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               success: false
 *               error:
 *                 message: "Doctor slot not available"
 *                 code: "SagaError"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/',
  authenticate,
//   requireRole('patient', 'admin', 'doctor'),
  createAppointmentValidation,
  appointmentController.createAppointment
);

/**
 * @swagger
 * /appointments:
 *   get:
 *     summary: Get all appointments with filters and pagination
 *     description: |
 *       Retrieves appointments using CQRS read model for optimized queries.
 *       Supports filtering by status, date range, patient, doctor, and pagination.
 *     tags: [Appointments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/Page'
 *       - $ref: '#/components/parameters/Limit'
 *       - $ref: '#/components/parameters/Status'
 *       - $ref: '#/components/parameters/StartDate'
 *       - $ref: '#/components/parameters/EndDate'
 *       - name: userId
 *         in: query
 *         schema:
 *           type: string
 *         description: Filter by user/patient ID
 *       - name: doctorId
 *         in: query
 *         schema:
 *           type: string
 *         description: Filter by doctor ID
 *       - name: search
 *         in: query
 *         schema:
 *           type: string
 *         description: Text search on appointment number, patient/doctor names, reason
 *     responses:
 *       200:
 *         description: List of appointments retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get(
  '/',
  authenticate,
//   requireRole('patient', 'admin', 'doctor'),
  searchAppointmentsValidation,
  appointmentController.getAllAppointments
);

/**
 * @swagger
 * /appointments/{id}:
 *   get:
 *     summary: Get appointment by ID
 *     description: Retrieves detailed information about a specific appointment
 *     tags: [Appointments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/AppointmentId'
 *     responses:
 *       200:
 *         description: Appointment details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Appointment'
 *       400:
 *         description: Invalid appointment ID
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Appointment not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               success: false
 *               error:
 *                 message: "Appointment not found"
 *                 code: "NotFoundError"
 */
router.get(
  '/:id',
  authenticate,
  idValidation,
  appointmentController.getAppointmentById
);

/**
 * @swagger
 * /appointments/{id}:
 *   put:
 *     summary: Update appointment details
 *     description: |
 *       Updates appointment information and creates an event record.
 *       Updates both write model and read view (CQRS).
 *     tags: [Appointments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/AppointmentId'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateAppointmentRequest'
 *           examples:
 *             updateNotes:
 *               summary: Update appointment notes
 *               value:
 *                 notes: "Patient requested additional consultation time"
 *             updateStatus:
 *               summary: Update appointment status
 *               value:
 *                 status: "confirmed"
 *     responses:
 *       200:
 *         description: Appointment updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Appointment updated successfully"
 *                 data:
 *                   $ref: '#/components/schemas/Appointment'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Appointment not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.put(
  '/:id',
  authenticate,
  updateAppointmentValidation,
  appointmentController.updateAppointment
);

/**
 * @swagger
 * /appointments/{id}/cancel:
 *   post:
 *     summary: Cancel an appointment
 *     description: |
 *       Cancels an appointment and publishes cancellation event.
 *       Creates APPOINTMENT_CANCELLED event and updates read view.
 *     tags: [Appointments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/AppointmentId'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CancelAppointmentRequest'
 *           example:
 *             cancelReason: "Patient has conflicting schedule"
 *     responses:
 *       200:
 *         description: Appointment cancelled successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Appointment cancelled successfully"
 *                 data:
 *                   $ref: '#/components/schemas/Appointment'
 *       400:
 *         description: Validation error or appointment cannot be cancelled
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               success: false
 *               error:
 *                 message: "Cancel reason is required"
 *                 code: "ValidationError"
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Appointment not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/:id/cancel',
  authenticate,
  cancelAppointmentValidation,
  appointmentController.cancelAppointment
);

/**
 * @swagger
 * /appointments/{id}/confirm:
 *   post:
 *     summary: Confirm an appointment (Doctor/Admin only)
 *     description: |
 *       Confirms a pending appointment.
 *       Creates APPOINTMENT_CONFIRMED event and updates read view.
 *       Only accessible by doctors and admins.
 *     tags: [Appointments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/AppointmentId'
 *     responses:
 *       200:
 *         description: Appointment confirmed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Appointment confirmed successfully"
 *                 data:
 *                   $ref: '#/components/schemas/Appointment'
 *       400:
 *         description: Invalid appointment ID
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Forbidden - Requires doctor or admin role
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               success: false
 *               error:
 *                 message: "Insufficient permissions"
 *                 code: "ForbiddenError"
 *       404:
 *         description: Appointment not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/:id/confirm',
  authenticate,
  requireRole('doctor', 'admin'),
  idValidation,
  appointmentController.confirmAppointment
);

/**
 * @swagger
 * /appointments/{id}/complete:
 *   post:
 *     summary: Mark appointment as completed (Doctor/Admin only)
 *     description: |
 *       Marks an appointment as completed after the visit.
 *       Creates APPOINTMENT_COMPLETED event and updates read view.
 *       Only accessible by doctors and admins.
 *     tags: [Appointments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/AppointmentId'
 *     responses:
 *       200:
 *         description: Appointment marked as completed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Appointment completed successfully"
 *                 data:
 *                   $ref: '#/components/schemas/Appointment'
 *       400:
 *         description: Invalid appointment ID
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Forbidden - Requires doctor or admin role
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Appointment not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/:id/complete',
  authenticate,
  requireRole('doctor', 'admin'),
  idValidation,
  appointmentController.completeAppointment
);

/**
 * @swagger
 * /appointments/patient/{userId}:
 *   get:
 *     summary: Get all appointments for a specific patient
 *     description: |
 *       Retrieves all appointments for a patient with optional filters.
 *       Uses CQRS read model for optimized queries.
 *     tags: [Appointments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/UserId'
 *       - $ref: '#/components/parameters/Status'
 *       - $ref: '#/components/parameters/StartDate'
 *       - $ref: '#/components/parameters/EndDate'
 *       - $ref: '#/components/parameters/Page'
 *       - $ref: '#/components/parameters/Limit'
 *     responses:
 *       200:
 *         description: Patient appointments retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get(
  '/patient/:userId',
  authenticate,
  appointmentController.getPatientAppointments
);

/**
 * @swagger
 * /appointments/doctor/{doctorId}:
 *   get:
 *     summary: Get all appointments for a specific doctor
 *     description: |
 *       Retrieves all appointments for a doctor with optional filters.
 *       Uses CQRS read model for optimized queries.
 *     tags: [Appointments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/DoctorId'
 *       - $ref: '#/components/parameters/Status'
 *       - $ref: '#/components/parameters/StartDate'
 *       - $ref: '#/components/parameters/EndDate'
 *       - $ref: '#/components/parameters/Page'
 *       - $ref: '#/components/parameters/Limit'
 *     responses:
 *       200:
 *         description: Doctor appointments retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get(
  '/doctor/:doctorId',
  authenticate,
  appointmentController.getDoctorAppointments
);

/**
 * @swagger
 * /appointments/{id}/history:
 *   get:
 *     summary: Get appointment event history (Event Sourcing)
 *     description: |
 *       Retrieves complete event history for an appointment using Event Sourcing.
 *       Returns all state changes as immutable events for audit trail.
 *     tags: [Appointments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/AppointmentId'
 *     responses:
 *       200:
 *         description: Event history retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/AppointmentEvent'
 *             example:
 *               success: true
 *               data:
 *                 - eventId: "evt-123"
 *                   aggregateId: "507f1f77bcf86cd799439011"
 *                   eventType: "APPOINTMENT_CREATED"
 *                   eventData:
 *                     appointmentNumber: "APT-1707456789-ABC123"
 *                     userId: "507f1f77bcf86cd799439011"
 *                     doctorId: "507f1f77bcf86cd799439012"
 *                     status: "pending"
 *                   timestamp: "2024-03-01T10:00:00Z"
 *                 - eventId: "evt-124"
 *                   aggregateId: "507f1f77bcf86cd799439011"
 *                   eventType: "APPOINTMENT_CONFIRMED"
 *                   eventData:
 *                     status: "confirmed"
 *                   timestamp: "2024-03-01T11:00:00Z"
 *       400:
 *         description: Invalid appointment ID
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Appointment not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get(
  '/:id/history',
  authenticate,
  idValidation,
  appointmentController.getAppointmentHistory
);

/**
 * @swagger
 * /appointments/stats/overview:
 *   get:
 *     summary: Get appointment statistics (Admin/Doctor only)
 *     description: |
 *       Retrieves aggregated statistics for appointments.
 *       Includes counts by status, trends, and other metrics.
 *       Only accessible by admins and doctors.
 *     tags: [Appointments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: startDate
 *         in: query
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for statistics
 *       - name: endDate
 *         in: query
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for statistics
 *       - name: doctorId
 *         in: query
 *         schema:
 *           type: string
 *         description: Filter by doctor ID
 *     responses:
 *       200:
 *         description: Statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                       example: 150
 *                     byStatus:
 *                       type: object
 *                       properties:
 *                         pending:
 *                           type: integer
 *                           example: 25
 *                         confirmed:
 *                           type: integer
 *                           example: 50
 *                         completed:
 *                           type: integer
 *                           example: 60
 *                         cancelled:
 *                           type: integer
 *                           example: 10
 *                         no_show:
 *                           type: integer
 *                           example: 5
 *                     trends:
 *                       type: array
 *                       items:
 *                         type: object
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Forbidden - Requires admin or doctor role
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get(
  '/stats/overview',
  authenticate,
  requireRole('admin', 'doctor'),
  appointmentController.getAppointmentStats
);

module.exports = router;
