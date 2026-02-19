/**
 * Unit Tests for Doctor gRPC Client
 */

const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
const config = require('../../../src/config');

// Mock dependencies
jest.mock('@grpc/grpc-js');
jest.mock('@grpc/proto-loader');
jest.mock('../../../src/utils/logger');

describe('DoctorGrpcClient', () => {
  let doctorClient;
  let mockGrpcClient;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();

    // Mock gRPC client methods
    mockGrpcClient = {
      GetDoctorDetails: jest.fn(),
      CheckAvailability: jest.fn(),
      GetDoctorsBySpecialization: jest.fn(),
      SearchDoctors: jest.fn(),
    };

    // Mock proto loader
    const mockProto = {
      doctor: {
        DoctorService: jest.fn(() => mockGrpcClient),
      },
    };

    protoLoader.loadSync.mockReturnValue({});
    grpc.loadPackageDefinition.mockReturnValue(mockProto);
    grpc.credentials.createInsecure.mockReturnValue({});

    // Require the client after mocks are set up
    doctorClient = require('../../../src/grpc/doctorClient');
  });

  describe('initialize', () => {
    it('should initialize gRPC client successfully', () => {
      doctorClient.initialize();

      expect(protoLoader.loadSync).toHaveBeenCalledWith(
        expect.stringContaining('doctor.proto'),
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
      expect(doctorClient.client).toBeDefined();
    });

    it('should use correct gRPC address from config', () => {
      doctorClient.initialize();

      const expectedAddress = `${config.services.doctor.grpcHost}:${config.services.doctor.grpcPort}`;
      const DoctorServiceConstructor = grpc.loadPackageDefinition().doctor.DoctorService;

      expect(DoctorServiceConstructor).toHaveBeenCalledWith(
        expectedAddress,
        expect.any(Object)
      );
    });

    it('should throw error if initialization fails', () => {
      protoLoader.loadSync.mockImplementation(() => {
        throw new Error('Proto load failed');
      });

      expect(() => doctorClient.initialize()).toThrow('Proto load failed');
    });
  });

  describe('getDoctorDetails', () => {
    beforeEach(() => {
      doctorClient.initialize();
    });

    it('should get doctor details successfully', async () => {
      const mockResponse = {
        success: true,
        doctor: {
          id: 'doc-123',
          name: 'Dr. Smith',
          specialization: 'Cardiology',
          email: 'smith@example.com',
        },
      };

      mockGrpcClient.GetDoctorDetails.mockImplementation((request, callback) => {
        callback(null, mockResponse);
      });

      const result = await doctorClient.getDoctorDetails('doc-123', 'auth-token');

      expect(result).toEqual(mockResponse);
      expect(mockGrpcClient.GetDoctorDetails).toHaveBeenCalledWith(
        { doctor_id: 'doc-123', auth_token: 'auth-token' },
        expect.any(Function)
      );
    });

    it('should handle gRPC errors', async () => {
      const mockError = new Error('Doctor not found');

      mockGrpcClient.GetDoctorDetails.mockImplementation((request, callback) => {
        callback(mockError, null);
      });

      await expect(doctorClient.getDoctorDetails('doc-999', 'auth-token')).rejects.toThrow(
        'Doctor not found'
      );
    });
  });

  describe('checkAvailability', () => {
    beforeEach(() => {
      doctorClient.initialize();
    });

    it('should check doctor availability successfully', async () => {
      const mockResponse = {
        success: true,
        available: true,
        message: 'Doctor is available',
      };

      mockGrpcClient.CheckAvailability.mockImplementation((request, callback) => {
        callback(null, mockResponse);
      });

      const result = await doctorClient.checkAvailability(
        'doc-123',
        '2026-03-15',
        '09:00',
        '10:00',
        'auth-token'
      );

      expect(result).toEqual(mockResponse);
      expect(mockGrpcClient.CheckAvailability).toHaveBeenCalledWith(
        {
          doctor_id: 'doc-123',
          date: '2026-03-15',
          start_time: '09:00',
          end_time: '10:00',
          auth_token: 'auth-token',
        },
        expect.any(Function)
      );
    });

    it('should handle availability check errors', async () => {
      const mockError = new Error('Availability check failed');

      mockGrpcClient.CheckAvailability.mockImplementation((request, callback) => {
        callback(mockError, null);
      });

      await expect(
        doctorClient.checkAvailability('doc-123', '2026-03-15', '09:00', '10:00', 'auth-token')
      ).rejects.toThrow('Availability check failed');
    });
  });

  describe('getDoctorsBySpecialization', () => {
    beforeEach(() => {
      doctorClient.initialize();
    });

    it('should get doctors by specialization successfully', async () => {
      const mockResponse = {
        success: true,
        doctors: [
          { id: 'doc-1', name: 'Dr. Smith', specialization: 'Cardiology' },
          { id: 'doc-2', name: 'Dr. Jones', specialization: 'Cardiology' },
        ],
        total_count: 2,
      };

      mockGrpcClient.GetDoctorsBySpecialization.mockImplementation((request, callback) => {
        callback(null, mockResponse);
      });

      const result = await doctorClient.getDoctorsBySpecialization(
        'Cardiology',
        'auth-token',
        10,
        1
      );

      expect(result).toEqual(mockResponse);
      expect(mockGrpcClient.GetDoctorsBySpecialization).toHaveBeenCalledWith(
        {
          specialization: 'Cardiology',
          auth_token: 'auth-token',
          limit: 10,
          page: 1,
        },
        expect.any(Function)
      );
    });

    it('should use default limit and page', async () => {
      const mockResponse = { success: true, doctors: [], total_count: 0 };

      mockGrpcClient.GetDoctorsBySpecialization.mockImplementation((request, callback) => {
        callback(null, mockResponse);
      });

      await doctorClient.getDoctorsBySpecialization('Dermatology', 'auth-token');

      expect(mockGrpcClient.GetDoctorsBySpecialization).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 10,
          page: 1,
        }),
        expect.any(Function)
      );
    });

    it('should handle errors', async () => {
      const mockError = new Error('Service unavailable');

      mockGrpcClient.GetDoctorsBySpecialization.mockImplementation((request, callback) => {
        callback(mockError, null);
      });

      await expect(
        doctorClient.getDoctorsBySpecialization('Cardiology', 'auth-token')
      ).rejects.toThrow('Service unavailable');
    });
  });

  describe('searchDoctors', () => {
    beforeEach(() => {
      doctorClient.initialize();
    });

    it('should search doctors with all filters', async () => {
      const mockResponse = {
        success: true,
        doctors: [
          { id: 'doc-1', name: 'Dr. Smith', specialization: 'Cardiology', city: 'New York' },
        ],
        total_count: 1,
      };

      mockGrpcClient.SearchDoctors.mockImplementation((request, callback) => {
        callback(null, mockResponse);
      });

      const filters = {
        search: 'Smith',
        specialization: 'Cardiology',
        city: 'New York',
        state: 'NY',
        minRating: 4.0,
        maxFee: 200,
        language: 'English',
        limit: 20,
        page: 1,
        sortBy: 'rating',
        sortOrder: 'desc',
      };

      const result = await doctorClient.searchDoctors(filters, 'auth-token');

      expect(result).toEqual(mockResponse);
      expect(mockGrpcClient.SearchDoctors).toHaveBeenCalledWith(
        {
          search: 'Smith',
          specialization: 'Cardiology',
          city: 'New York',
          state: 'NY',
          min_rating: 4.0,
          max_fee: 200,
          language: 'English',
          auth_token: 'auth-token',
          limit: 20,
          page: 1,
          sort_by: 'rating',
          sort_order: 'desc',
        },
        expect.any(Function)
      );
    });

    it('should use default values for missing filters', async () => {
      const mockResponse = { success: true, doctors: [], total_count: 0 };

      mockGrpcClient.SearchDoctors.mockImplementation((request, callback) => {
        callback(null, mockResponse);
      });

      await doctorClient.searchDoctors({}, 'auth-token');

      expect(mockGrpcClient.SearchDoctors).toHaveBeenCalledWith(
        expect.objectContaining({
          search: '',
          specialization: '',
          city: '',
          state: '',
          min_rating: 0,
          max_fee: 0,
          language: '',
          auth_token: 'auth-token',
          limit: 10,
          page: 1,
          sort_by: 'rating',
          sort_order: 'desc',
        }),
        expect.any(Function)
      );
    });

    it('should handle search errors', async () => {
      const mockError = new Error('Search failed');

      mockGrpcClient.SearchDoctors.mockImplementation((request, callback) => {
        callback(mockError, null);
      });

      await expect(doctorClient.searchDoctors({}, 'auth-token')).rejects.toThrow('Search failed');
    });

    it('should handle empty auth token', async () => {
      const mockResponse = { success: true, doctors: [], total_count: 0 };

      mockGrpcClient.SearchDoctors.mockImplementation((request, callback) => {
        callback(null, mockResponse);
      });

      await doctorClient.searchDoctors({});

      expect(mockGrpcClient.SearchDoctors).toHaveBeenCalledWith(
        expect.objectContaining({
          auth_token: '',
        }),
        expect.any(Function)
      );
    });
  });
});