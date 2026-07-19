/**
 * Unit Tests for Appointment gRPC Client
 */

// Mock dependencies before imports
jest.mock('@grpc/grpc-js');
jest.mock('@grpc/proto-loader');
jest.mock('../../../src/utils/logger');

const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const config = require('../../../src/config');

describe('AppointmentGrpcClient', () => {
  let appointmentClient;
  let mockGrpcClient;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock gRPC client methods
    mockGrpcClient = {
      GetUserAppointments: jest.fn(),
      GetAppointmentById: jest.fn(),
    };

    // Mock proto loader
    const mockProto = {
      appointment: {
        AppointmentService: jest.fn(() => mockGrpcClient),
      },
    };

    protoLoader.loadSync.mockReturnValue({});
    grpc.loadPackageDefinition.mockReturnValue(mockProto);
    grpc.credentials.createInsecure.mockReturnValue({});

    // Require the client after mocks are set up
    appointmentClient = require('../../../src/grpc/appointmentClient');
  });

  describe('initialize', () => {
    it('should initialize gRPC client successfully', () => {
      appointmentClient.initialize();

      expect(protoLoader.loadSync).toHaveBeenCalledWith(
        expect.stringContaining('appointment.proto'),
        expect.objectContaining({
          keepCase: true,
          longs: String,
          enums: String,
          defaults: true,
          oneofs: true,
        })
      );

      expect(grpc.loadPackageDefinition).toHaveBeenCalled();
      expect(grpc.credentials.createInsecure).toHaveBeenCalled();
      expect(appointmentClient.client).toBeDefined();
    });

    it('should use correct gRPC address from config', () => {
      appointmentClient.initialize();

      const expectedAddress = `${config.services.appointment.grpcHost}:${config.services.appointment.grpcPort}`;
      const AppointmentServiceConstructor = grpc.loadPackageDefinition().appointment.AppointmentService;

      expect(AppointmentServiceConstructor).toHaveBeenCalledWith(
        expectedAddress,
        expect.any(Object)
      );
    });

    it('should handle initialization failure gracefully', () => {
      protoLoader.loadSync.mockImplementation(() => {
        throw new Error('Proto load failed');
      });

      // Should not throw, just set client to null
      appointmentClient.initialize();

      expect(appointmentClient.client).toBeNull();
    });
  });

  describe('getUserAppointments', () => {
    it('should get user appointments successfully', async () => {
      appointmentClient.initialize();

      const mockResponse = {
        success: true,
        appointments: [
          {
            id: 'apt-1',
            user_id: 'user-123',
            doctor_id: 'doc-1',
            date: '2026-03-15',
            status: 'scheduled',
          },
          {
            id: 'apt-2',
            user_id: 'user-123',
            doctor_id: 'doc-2',
            date: '2026-03-20',
            status: 'scheduled',
          },
        ],
      };

      mockGrpcClient.GetUserAppointments.mockImplementation((request, callback) => {
        callback(null, mockResponse);
      });

      const result = await appointmentClient.getUserAppointments('user-123', 'auth-token');

      expect(result).toEqual(mockResponse);
      expect(mockGrpcClient.GetUserAppointments).toHaveBeenCalledWith(
        {
          user_id: 'user-123',
          auth_token: 'auth-token',
          status: '',
          limit: 10,
          page: 1,
        },
        expect.any(Function)
      );
    });

    it('should filter appointments by status', async () => {
      appointmentClient.initialize();

      const mockResponse = {
        success: true,
        appointments: [
          {
            id: 'apt-1',
            user_id: 'user-123',
            doctor_id: 'doc-1',
            status: 'completed',
          },
        ],
      };

      mockGrpcClient.GetUserAppointments.mockImplementation((request, callback) => {
        callback(null, mockResponse);
      });

      await appointmentClient.getUserAppointments('user-123', 'auth-token', 'completed');

      expect(mockGrpcClient.GetUserAppointments).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'completed',
        }),
        expect.any(Function)
      );
    });

    it('should use custom limit and page', async () => {
      appointmentClient.initialize();

      const mockResponse = { success: true, appointments: [] };

      mockGrpcClient.GetUserAppointments.mockImplementation((request, callback) => {
        callback(null, mockResponse);
      });

      await appointmentClient.getUserAppointments('user-123', 'auth-token', null, 20, 2);

      expect(mockGrpcClient.GetUserAppointments).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 20,
          page: 2,
        }),
        expect.any(Function)
      );
    });

    it('should return error response when client not available', async () => {
      appointmentClient.client = null;

      const result = await appointmentClient.getUserAppointments('user-123', 'auth-token');

      expect(result).toEqual({
        success: false,
        message: 'Appointment service unavailable',
        appointments: [],
      });
    });

    it('should handle gRPC errors', async () => {
      appointmentClient.initialize();

      const mockError = new Error('Service unavailable');

      mockGrpcClient.GetUserAppointments.mockImplementation((request, callback) => {
        callback(mockError, null);
      });

      await expect(
        appointmentClient.getUserAppointments('user-123', 'auth-token')
      ).rejects.toThrow('Service unavailable');
    });
  });

  describe('getAppointmentById', () => {
    it('should get appointment by ID successfully', async () => {
      appointmentClient.initialize();

      const mockResponse = {
        success: true,
        appointment: {
          id: 'apt-123',
          user_id: 'user-123',
          doctor_id: 'doc-1',
          date: '2026-03-15',
          time: '10:00',
          status: 'scheduled',
        },
      };

      mockGrpcClient.GetAppointmentById.mockImplementation((request, callback) => {
        callback(null, mockResponse);
      });

      const result = await appointmentClient.getAppointmentById('apt-123', 'auth-token');

      expect(result).toEqual(mockResponse);
      expect(mockGrpcClient.GetAppointmentById).toHaveBeenCalledWith(
        {
          appointment_id: 'apt-123',
          auth_token: 'auth-token',
        },
        expect.any(Function)
      );
    });

    it('should return error response when client not available', async () => {
      appointmentClient.client = null;

      const result = await appointmentClient.getAppointmentById('apt-123', 'auth-token');

      expect(result).toEqual({
        success: false,
        message: 'Appointment service unavailable',
      });
    });

    it('should handle appointment not found error', async () => {
      appointmentClient.initialize();

      const mockError = new Error('Appointment not found');

      mockGrpcClient.GetAppointmentById.mockImplementation((request, callback) => {
        callback(mockError, null);
      });

      await expect(
        appointmentClient.getAppointmentById('apt-999', 'auth-token')
      ).rejects.toThrow('Appointment not found');
    });

    it('should handle unauthorized error', async () => {
      appointmentClient.initialize();

      const mockError = new Error('Unauthorized');

      mockGrpcClient.GetAppointmentById.mockImplementation((request, callback) => {
        callback(mockError, null);
      });

      await expect(
        appointmentClient.getAppointmentById('apt-123', 'invalid-token')
      ).rejects.toThrow('Unauthorized');
    });
  });

  describe('Edge cases', () => {
    it('should handle null status parameter', async () => {
      appointmentClient.initialize();

      const mockResponse = { success: true, appointments: [] };

      mockGrpcClient.GetUserAppointments.mockImplementation((request, callback) => {
        callback(null, mockResponse);
      });

      await appointmentClient.getUserAppointments('user-123', 'auth-token', null);

      expect(mockGrpcClient.GetUserAppointments).toHaveBeenCalledWith(
        expect.objectContaining({
          status: '',
        }),
        expect.any(Function)
      );
    });

    it('should handle empty appointments array', async () => {
      appointmentClient.initialize();

      const mockResponse = {
        success: true,
        appointments: [],
      };

      mockGrpcClient.GetUserAppointments.mockImplementation((request, callback) => {
        callback(null, mockResponse);
      });

      const result = await appointmentClient.getUserAppointments('user-123', 'auth-token');

      expect(result.appointments).toEqual([]);
    });
  });
});