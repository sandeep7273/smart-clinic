/**
 * Unit Tests for Doctor Controller
 */

// Mock dependencies FIRST
jest.mock('../../../src/services/doctor.service', () => ({
  createDoctor: jest.fn(),
  getDoctorById: jest.fn(),
  getDoctorByUserId: jest.fn(),
  updateDoctor: jest.fn(),
  deleteDoctor: jest.fn(),
  getAllDoctors: jest.fn(),
  searchDoctors: jest.fn(),
  getAvailableDoctors: jest.fn(),
  getDoctorsBySpecialization: jest.fn(),
  checkAvailability: jest.fn(),
  addAvailabilitySlot: jest.fn(),
}));

jest.mock('../../../src/utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
}));

const doctorController = require('../../../src/controllers/doctor.controller');
const doctorService = require('../../../src/services/doctor.service');

describe('Doctor Controller - Unit Tests', () => {
  let mockReq;
  let mockRes;
  let mockNext;

  beforeEach(() => {
    jest.clearAllMocks();

    // Standard mock request object
    mockReq = {
      body: {},
      params: {},
      query: {},
      user: { id: 'user-123', userId: 'user-123' },
    };

    // Standard mock response object
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    // Standard mock next function
    mockNext = jest.fn();
  });

  describe('createDoctor', () => {
    it('should create a doctor successfully', async () => {
      const mockDoctorData = {
        firstName: 'John',
        lastName: 'Doe',
        specialization: 'Cardiology',
      };

      const mockCreatedDoctor = {
        _id: 'doctor-123',
        ...mockDoctorData,
        userId: 'user-123',
      };

      mockReq.body = mockDoctorData;
      doctorService.createDoctor.mockResolvedValue(mockCreatedDoctor);

      await doctorController.createDoctor(mockReq, mockRes, mockNext);

      expect(doctorService.createDoctor).toHaveBeenCalledWith(
        'user-123',
        expect.objectContaining({
          ...mockDoctorData,
          createdByUserId: 'user-123',
        })
      );
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockCreatedDoctor,
        message: 'Doctor profile created successfully',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle errors in createDoctor', async () => {
      const error = new Error('Creation failed');
      mockReq.body = { firstName: 'John' };
      doctorService.createDoctor.mockRejectedValue(error);

      await doctorController.createDoctor(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
      expect(mockRes.status).not.toHaveBeenCalled();
    });
  });

  describe('getDoctorById', () => {
    it('should get doctor by ID successfully', async () => {
      const mockDoctor = {
        _id: 'doctor-123',
        firstName: 'John',
        lastName: 'Doe',
        specialization: 'Cardiology',
      };

      mockReq.params.id = 'doctor-123';
      doctorService.getDoctorById.mockResolvedValue(mockDoctor);

      await doctorController.getDoctorById(mockReq, mockRes, mockNext);

      expect(doctorService.getDoctorById).toHaveBeenCalledWith('doctor-123');
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockDoctor,
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle errors in getDoctorById', async () => {
      const error = new Error('Doctor not found');
      mockReq.params.id = 'nonexistent-id';
      doctorService.getDoctorById.mockRejectedValue(error);

      await doctorController.getDoctorById(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
      expect(mockRes.status).not.toHaveBeenCalled();
    });
  });

  describe('getMyProfile', () => {
    it('should get current doctor profile successfully', async () => {
      const mockDoctor = {
        _id: 'doctor-123',
        userId: 'user-123',
        firstName: 'John',
      };

      doctorService.getDoctorByUserId.mockResolvedValue(mockDoctor);

      await doctorController.getMyProfile(mockReq, mockRes, mockNext);

      expect(doctorService.getDoctorByUserId).toHaveBeenCalledWith('user-123');
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockDoctor,
      });
    });

    it('should handle errors in getMyProfile', async () => {
      const error = new Error('Profile not found');
      doctorService.getDoctorByUserId.mockRejectedValue(error);

      await doctorController.getMyProfile(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('updateDoctor', () => {
    it('should update doctor successfully', async () => {
      const updateData = { firstName: 'Jane', experience: 15 };
      const mockUpdatedDoctor = {
        _id: 'doctor-123',
        ...updateData,
      };

      mockReq.params.id = 'doctor-123';
      mockReq.body = updateData;
      doctorService.updateDoctor.mockResolvedValue(mockUpdatedDoctor);

      await doctorController.updateDoctor(mockReq, mockRes, mockNext);

      expect(doctorService.updateDoctor).toHaveBeenCalledWith('doctor-123', updateData);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockUpdatedDoctor,
        message: 'Doctor profile updated successfully',
      });
    });

    it('should handle errors in updateDoctor', async () => {
      const error = new Error('Update failed');
      mockReq.params.id = 'doctor-123';
      mockReq.body = { firstName: 'Jane' };
      doctorService.updateDoctor.mockRejectedValue(error);

      await doctorController.updateDoctor(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('deleteDoctor', () => {
    it('should delete doctor successfully', async () => {
      const mockResult = {
        success: true,
        message: 'Doctor deleted successfully',
      };

      mockReq.params.id = 'doctor-123';
      doctorService.deleteDoctor.mockResolvedValue(mockResult);

      await doctorController.deleteDoctor(mockReq, mockRes, mockNext);

      expect(doctorService.deleteDoctor).toHaveBeenCalledWith('doctor-123');
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockResult,
      });
    });

    it('should handle errors in deleteDoctor', async () => {
      const error = new Error('Delete failed');
      mockReq.params.id = 'doctor-123';
      doctorService.deleteDoctor.mockRejectedValue(error);

      await doctorController.deleteDoctor(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('getAllDoctors', () => {
    it('should get all doctors with pagination', async () => {
      const mockResults = {
        doctors: [
          { _id: '1', firstName: 'John' },
          { _id: '2', firstName: 'Jane' },
        ],
        pagination: {
          total: 2,
          page: 1,
          limit: 10,
          totalPages: 1,
        },
      };

      mockReq.query = { page: 1, limit: 10 };
      doctorService.getAllDoctors.mockResolvedValue(mockResults);

      await doctorController.getAllDoctors(mockReq, mockRes, mockNext);

      expect(doctorService.getAllDoctors).toHaveBeenCalledWith({ page: 1, limit: 10 });
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockResults.doctors,
        pagination: mockResults.pagination,
      });
    });

    it('should handle errors in getAllDoctors', async () => {
      const error = new Error('Fetch failed');
      doctorService.getAllDoctors.mockRejectedValue(error);

      await doctorController.getAllDoctors(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('searchDoctors', () => {
    it('should search doctors with filters', async () => {
      const mockResults = {
        doctors: [{ _id: '1', firstName: 'John', specialization: 'Cardiology' }],
        pagination: {
          total: 1,
          page: 1,
          limit: 10,
          totalPages: 1,
        },
      };

      mockReq.query = { specialization: 'Cardiology', location: 'New York' };
      doctorService.searchDoctors.mockResolvedValue(mockResults);

      await doctorController.searchDoctors(mockReq, mockRes, mockNext);

      expect(doctorService.searchDoctors).toHaveBeenCalledWith({
        specialization: 'Cardiology',
        location: 'New York',
      });
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockResults.doctors,
        pagination: mockResults.pagination,
      });
    });

    it('should handle errors in searchDoctors', async () => {
      const error = new Error('Search failed');
      doctorService.searchDoctors.mockRejectedValue(error);

      await doctorController.searchDoctors(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('getAvailableDoctors', () => {
    it('should get available doctors', async () => {
      const mockResults = {
        doctors: [{ _id: '1', firstName: 'John', isAvailable: true }],
        pagination: {
          total: 1,
          page: 1,
          limit: 10,
        },
      };

      mockReq.query = { date: '2026-02-20' };
      doctorService.getAvailableDoctors.mockResolvedValue(mockResults);

      await doctorController.getAvailableDoctors(mockReq, mockRes, mockNext);

      expect(doctorService.getAvailableDoctors).toHaveBeenCalledWith({ date: '2026-02-20' });
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockResults.doctors,
        pagination: mockResults.pagination,
      });
    });

    it('should handle errors in getAvailableDoctors', async () => {
      const error = new Error('Fetch failed');
      doctorService.getAvailableDoctors.mockRejectedValue(error);

      await doctorController.getAvailableDoctors(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('Error Handling', () => {
    it('should pass errors to next middleware in createDoctor', async () => {
      const error = new Error('Create error');
      doctorService.createDoctor.mockRejectedValue(error);

      await doctorController.createDoctor(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should pass errors to next middleware in getDoctorById', async () => {
      const error = new Error('Get error');
      doctorService.getDoctorById.mockRejectedValue(error);

      await doctorController.getDoctorById(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
      expect(mockRes.status).not.toHaveBeenCalled();
    });
  });

  describe('Response Format', () => {
    it('should always return success field in response', async () => {
      const mockDoctor = { _id: 'doctor-123', firstName: 'John' };
      doctorService.getDoctorById.mockResolvedValue(mockDoctor);

      await doctorController.getDoctorById(mockReq, mockRes, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
        })
      );
    });

    it('should return data field in all successful responses', async () => {
      const mockDoctor = { _id: 'doctor-123', firstName: 'John' };
      doctorService.getDoctorById.mockResolvedValue(mockDoctor);

      await doctorController.getDoctorById(mockReq, mockRes, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: mockDoctor,
        })
      );
    });
  });
});
