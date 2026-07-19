/**
 * Swagger/OpenAPI Configuration
 * API documentation setup
 */

const swaggerJsdoc = require('swagger-jsdoc');
const config = require('./index');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Appointment Service API',
      version: '1.0.0',
      description: 'Appointment management microservice with SAGA pattern, CQRS, and Event Sourcing',
      contact: {
        name: 'API Support',
        email: 'support@smartappointment.com',
      },
    },
    tags: [
      {
        name: 'Appointments',
        description: 'Appointment management endpoints with SAGA orchestration, CQRS, and Event Sourcing',
      },
    ],
    servers: [
      {
        url: `http://localhost:${config.port}`,
        description: 'Development server',
      },
      {
        url: 'http://api-gateway:3000/appointments',
        description: 'API Gateway',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token obtained from auth service',
        },
      },
      schemas: {
        CreateAppointmentRequest: {
          type: 'object',
          required: ['userId', 'doctorId', 'date', 'startTime', 'endTime', 'reason'],
          properties: {
            userId: {
              type: 'string',
              description: 'Patient/User ID',
              example: '507f1f77bcf86cd799439011',
            },
            doctorId: {
              type: 'string',
              description: 'Doctor ID',
              example: '507f1f77bcf86cd799439012',
            },
            date: {
              type: 'string',
              format: 'date',
              description: 'Appointment date in ISO 8601 format',
              example: '2024-03-15',
            },
            startTime: {
              type: 'string',
              pattern: '^([01]?[0-9]|2[0-3]):[0-5][0-9]$',
              description: 'Start time in HH:MM format',
              example: '10:00',
            },
            endTime: {
              type: 'string',
              pattern: '^([01]?[0-9]|2[0-3]):[0-5][0-9]$',
              description: 'End time in HH:MM format',
              example: '10:30',
            },
            duration: {
              type: 'integer',
              minimum: 15,
              maximum: 180,
              description: 'Duration in minutes (optional, calculated from start/end time)',
              example: 30,
            },
            reason: {
              type: 'string',
              minLength: 5,
              maxLength: 500,
              description: 'Reason for appointment',
              example: 'Regular checkup and consultation',
            },
            notes: {
              type: 'string',
              maxLength: 1000,
              description: 'Additional notes (optional)',
              example: 'Patient has history of allergies',
            },
            symptoms: {
              type: 'array',
              items: { type: 'string' },
              description: 'List of symptoms (optional)',
              example: ['fever', 'headache'],
            },
          },
        },
        UpdateAppointmentRequest: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              enum: ['pending', 'confirmed', 'cancelled', 'completed', 'no_show'],
              description: 'Appointment status',
            },
            notes: {
              type: 'string',
              maxLength: 1000,
              description: 'Update notes',
            },
            cancelReason: {
              type: 'string',
              maxLength: 500,
              description: 'Reason for cancellation (if status is cancelled)',
            },
          },
        },
        CancelAppointmentRequest: {
          type: 'object',
          required: ['cancelReason'],
          properties: {
            cancelReason: {
              type: 'string',
              minLength: 5,
              maxLength: 500,
              description: 'Reason for cancellation',
              example: 'Patient unavailable',
            },
          },
        },
        Appointment: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              description: 'Appointment ID',
              example: '507f1f77bcf86cd799439011',
            },
            appointmentNumber: {
              type: 'string',
              description: 'Unique appointment number',
              example: 'APT-1707456789-ABC123',
            },
            userId: {
              type: 'string',
              description: 'Patient/User ID',
              example: '507f1f77bcf86cd799439011',
            },
            patientName: {
              type: 'string',
              description: 'Patient full name',
              example: 'John Doe',
            },
            patientEmail: {
              type: 'string',
              description: 'Patient email',
              example: 'john.doe@example.com',
            },
            patientPhone: {
              type: 'string',
              description: 'Patient phone number',
              example: '+1234567890',
            },
            doctorId: {
              type: 'string',
              description: 'Doctor ID',
              example: '507f1f77bcf86cd799439012',
            },
            doctorName: {
              type: 'string',
              description: 'Doctor full name',
              example: 'Dr. Jane Smith',
            },
            doctorSpecialization: {
              type: 'string',
              description: 'Doctor specialization',
              example: 'Cardiology',
            },
            date: {
              type: 'string',
              format: 'date',
              description: 'Appointment date',
              example: '2024-03-15',
            },
            startTime: {
              type: 'string',
              description: 'Start time',
              example: '10:00',
            },
            endTime: {
              type: 'string',
              description: 'End time',
              example: '10:30',
            },
            duration: {
              type: 'integer',
              description: 'Duration in minutes',
              example: 30,
            },
            status: {
              type: 'string',
              enum: ['pending', 'confirmed', 'cancelled', 'completed', 'no_show'],
              description: 'Appointment status',
              example: 'pending',
            },
            reason: {
              type: 'string',
              description: 'Reason for appointment',
              example: 'Regular checkup',
            },
            notes: {
              type: 'string',
              description: 'Additional notes',
            },
            symptoms: {
              type: 'array',
              items: { type: 'string' },
              description: 'Patient symptoms',
            },
            cancelReason: {
              type: 'string',
              description: 'Cancellation reason',
            },
            tenantId: {
              type: 'string',
              description: 'Tenant ID for multi-tenancy',
            },
            isDeleted: {
              type: 'boolean',
              description: 'Soft delete flag',
              example: false,
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Creation timestamp',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Last update timestamp',
            },
          },
        },
        AppointmentEvent: {
          type: 'object',
          properties: {
            eventId: {
              type: 'string',
              description: 'Event ID',
            },
            aggregateId: {
              type: 'string',
              description: 'Appointment ID',
            },
            eventType: {
              type: 'string',
              enum: ['APPOINTMENT_CREATED', 'APPOINTMENT_CONFIRMED', 'APPOINTMENT_CANCELLED', 'APPOINTMENT_RESCHEDULED', 'APPOINTMENT_COMPLETED', 'APPOINTMENT_NO_SHOW'],
              description: 'Event type',
            },
            eventData: {
              type: 'object',
              description: 'Event payload',
            },
            metadata: {
              type: 'object',
              description: 'Event metadata',
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              description: 'Event timestamp',
            },
          },
        },
        SuccessResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true,
            },
            message: {
              type: 'string',
              example: 'Operation successful',
            },
            data: {
              type: 'object',
              description: 'Response data',
            },
          },
        },
        PaginatedResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true,
            },
            data: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/Appointment',
              },
            },
            pagination: {
              type: 'object',
              properties: {
                page: { type: 'integer', example: 1 },
                limit: { type: 'integer', example: 10 },
                total: { type: 'integer', example: 50 },
                totalPages: { type: 'integer', example: 5 },
              },
            },
          },
        },
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false,
            },
            error: {
              type: 'object',
              properties: {
                message: {
                  type: 'string',
                  example: 'Error message',
                },
                code: {
                  type: 'string',
                  example: 'ERROR_CODE',
                },
              },
            },
          },
        },
      },
      parameters: {
        AppointmentId: {
          name: 'id',
          in: 'path',
          required: true,
          schema: {
            type: 'string',
            pattern: '^[0-9a-fA-F]{24}$',
          },
          description: 'MongoDB ObjectId',
        },
        UserId: {
          name: 'userId',
          in: 'path',
          required: true,
          schema: {
            type: 'string',
          },
          description: 'User/Patient ID',
        },
        DoctorId: {
          name: 'doctorId',
          in: 'path',
          required: true,
          schema: {
            type: 'string',
          },
          description: 'Doctor ID',
        },
        Page: {
          name: 'page',
          in: 'query',
          schema: {
            type: 'integer',
            minimum: 1,
            default: 1,
          },
          description: 'Page number',
        },
        Limit: {
          name: 'limit',
          in: 'query',
          schema: {
            type: 'integer',
            minimum: 1,
            maximum: 100,
            default: 10,
          },
          description: 'Number of items per page',
        },
        Status: {
          name: 'status',
          in: 'query',
          schema: {
            type: 'string',
            enum: ['pending', 'confirmed', 'cancelled', 'completed', 'no_show'],
          },
          description: 'Filter by status',
        },
        StartDate: {
          name: 'startDate',
          in: 'query',
          schema: {
            type: 'string',
            format: 'date',
          },
          description: 'Filter appointments from this date',
        },
        EndDate: {
          name: 'endDate',
          in: 'query',
          schema: {
            type: 'string',
            format: 'date',
          },
          description: 'Filter appointments until this date',
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ['./src/routes/*.js', './src/controllers/*.js'],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
