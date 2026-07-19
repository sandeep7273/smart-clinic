/**
 * Unit Tests for Doctor Service
 */

// Mock dependencies FIRST before imports
jest.mock('../../../src/models/Doctor', () => {
  const mockDoctor = function(data) {
    Object.assign(this, data);
    this.save = jest.fn().mockResolvedValue(this);
  };
  
  return {
    Doctor: Object.assign(mockDoctor, {
      findOne: jest.fn(),
      findById: jest.fn(),
      findByUserId: jest.fn(),
      findByEmail: jest.fn(),
      findByIdAndDelete: jest.fn(),
      find: jest.fn(),
      create: jest.fn(),
      countDocuments: jest.fn(),
    }),
  };
});

jest.mock('../../../src/models/DoctorScheduleReadView', () => ({
  DoctorScheduleReadView: {
    findOne: jest.fn(),
    findById: jest.fn(),
    findByUserId: jest.fn(),
    updateFromDoctor: jest.fn(),
    search: jest.fn(),
  },
}));

jest.mock('../../../src/kafka', () => ({
  publishDoctorEvent: jest.fn(),
  EVENT_TYPES: {
    DOCTOR_CREATED: 'DOCTOR_CREATED',
    DOCTOR_UPDATED: 'DOCTOR_UPDATED',
    DOCTOR_DELETED: 'DOCTOR_DELETED',
    AVAILABILITY_UPDATED: 'AVAILABILITY_UPDATED',
  },
}));

jest.mock('../../../src/utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
}));

const doctorService = require('../../../src/services/doctor.service');
const { Doctor } = require('../../../src/models/Doctor');
const { publishDoctorEvent, EVENT_TYPES } = require('../../../src/kafka');
const { ValidationError, NotFoundError, ConflictError } = require('../../../src/utils/errors');

describe('Doctor Service - Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('normalizeSpecialization', () => {
    it('should return null for null input', () => {
      expect(doctorService.normalizeSpecialization(null)).toBeNull();
    });

    it('should return null for undefined input', () => {
      expect(doctorService.normalizeSpecialization(undefined)).toBeNull();
    });

    it('should normalize "cardiologist" to "Cardiology"', () => {
      expect(doctorService.normalizeSpecialization('cardiologist')).toBe('Cardiology');
    });

    it('should normalize "heart" to "Cardiology"', () => {
      expect(doctorService.normalizeSpecialization('heart')).toBe('Cardiology');
    });

    it('should normalize "dermatologist" to "Dermatology"', () => {
      expect(doctorService.normalizeSpecialization('dermatologist')).toBe('Dermatology');
    });

    it('should normalize "skin" to "Dermatology"', () => {
      expect(doctorService.normalizeSpecialization('skin')).toBe('Dermatology');
    });

    it('should normalize "pediatrician" to "Pediatrics"', () => {
      expect(doctorService.normalizeSpecialization('pediatrician')).toBe('Pediatrics');
    });

    it('should normalize "children" to "Pediatrics"', () => {
      expect(doctorService.normalizeSpecialization('children')).toBe('Pediatrics');
    });

    it('should handle exact department names case-insensitively', () => {
      expect(doctorService.normalizeSpecialization('cardiology')).toBe('Cardiology');
      expect(doctorService.normalizeSpecialization('CARDIOLOGY')).toBe('Cardiology');
      expect(doctorService.normalizeSpecialization('Cardiology')).toBe('Cardiology');
    });

    it('should return original value if no match found', () => {
      expect(doctorService.normalizeSpecialization('Unknown Specialty')).toBe('Unknown Specialty');
    });

    it('should trim whitespace', () => {
      expect(doctorService.normalizeSpecialization('  cardiologist  ')).toBe('Cardiology');
    });

    it('should normalize all common variations', () => {
      const tests = [
        ['orthopedist', 'Orthopedics'],
        ['bone', 'Orthopedics'],
        ['neurologist', 'Neurology'],
        ['brain', 'Neurology'],
        ['eye', 'Ophthalmology'],
        ['ent specialist', 'ENT'],
        ['psychiatrist', 'Psychiatry'],
        ['diabetes', 'Endocrinology'],
        ['gynecologist', 'Gynecology'],
        ['gp', 'General Medicine'],
      ];

      tests.forEach(([input, expected]) => {
        expect(doctorService.normalizeSpecialization(input)).toBe(expected);
      });
    });
  });

  describe('createDoctor', () => {
    const mockDoctorData = {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      phone: '1234567890',
      specialization: 'Cardiology',
      qualifications: ['MBBS', 'MD'],
      experience: 10,
      consultationFee: 500,
      location: 'New York',
    };

    it('should create a new doctor successfully', async () => {
      Doctor.findByUserId = jest.fn().mockResolvedValue(null);
      Doctor.findByEmail = jest.fn().mockResolvedValue(null);

      await doctorService.createDoctor('user-123', mockDoctorData);

      expect(Doctor.findByUserId).toHaveBeenCalledWith('user-123');
      expect(Doctor.findByEmail).toHaveBeenCalledWith(mockDoctorData.email);
    });

    it('should throw ConflictError if doctor already exists for userId', async () => {
      Doctor.findByUserId = jest.fn().mockResolvedValue({ userId: 'user-123' });

      await expect(
        doctorService.createDoctor('user-123', mockDoctorData)
      ).rejects.toThrow(ConflictError);
    });

    it('should throw ConflictError if email already exists', async () => {
      Doctor.findByUserId = jest.fn().mockResolvedValue(null);
      Doctor.findByEmail = jest.fn().mockResolvedValue({ email: mockDoctorData.email });

      await expect(
        doctorService.createDoctor('user-123', mockDoctorData)
      ).rejects.toThrow(ConflictError);
    });

    it('should handle errors during creation', async () => {
      Doctor.findByUserId = jest.fn().mockRejectedValue(new Error('Database error'));

      await expect(
        doctorService.createDoctor('user-123', mockDoctorData)
      ).rejects.toThrow('Database error');
    });
  });

  describe('getDoctorById', () => {
    it('should return doctor when found', async () => {
      const mockDoctor = {
        _id: 'doctor-123',
        firstName: 'John',
        lastName: 'Doe',
        specialization: 'Cardiology',
      };

      const { DoctorScheduleReadView } = require('../../../src/models/DoctorScheduleReadView');
      DoctorScheduleReadView.findById = jest.fn().mockResolvedValue(mockDoctor);

      const result = await doctorService.getDoctorById('doctor-123');

      expect(DoctorScheduleReadView.findById).toHaveBeenCalledWith('doctor-123');
      expect(result).toEqual(mockDoctor);
    });

    it('should throw NotFoundError when doctor not found', async () => {
      const { DoctorScheduleReadView } = require('../../../src/models/DoctorScheduleReadView');
      DoctorScheduleReadView.findById = jest.fn().mockResolvedValue(null);

      await expect(
        doctorService.getDoctorById('nonexistent-id')
      ).rejects.toThrow(NotFoundError);
    });

    it('should handle database errors', async () => {
      const { DoctorScheduleReadView } = require('../../../src/models/DoctorScheduleReadView');
      DoctorScheduleReadView.findById = jest.fn().mockRejectedValue(new Error('Database error'));

      await expect(
        doctorService.getDoctorById('doctor-123')
      ).rejects.toThrow('Database error');
    });
  });

  describe('getDoctorByUserId', () => {
    it('should return doctor when found', async () => {
      const mockDoctor = {
        userId: 'user-123',
        firstName: 'John',
        lastName: 'Doe',
      };

      const { DoctorScheduleReadView } = require('../../../src/models/DoctorScheduleReadView');
      DoctorScheduleReadView.findByUserId = jest.fn().mockResolvedValue(mockDoctor);

      const result = await doctorService.getDoctorByUserId('user-123');

      expect(DoctorScheduleReadView.findByUserId).toHaveBeenCalledWith('user-123');
      expect(result).toEqual(mockDoctor);
    });

    it('should throw NotFoundError when doctor not found', async () => {
      const { DoctorScheduleReadView } = require('../../../src/models/DoctorScheduleReadView');
      DoctorScheduleReadView.findByUserId = jest.fn().mockResolvedValue(null);

      await expect(
        doctorService.getDoctorByUserId('nonexistent-user')
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('updateDoctor', () => {
    const mockDoctor = {
      _id: 'doctor-123',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      specialization: 'Cardiology',
      save: jest.fn(),
    };

    it('should update doctor successfully', async () => {
      const { DoctorScheduleReadView } = require('../../../src/models/DoctorScheduleReadView');
      
      Doctor.findById = jest.fn().mockResolvedValue(mockDoctor);
      Doctor.findByEmail = jest.fn().mockResolvedValue(null);
      DoctorScheduleReadView.updateFromDoctor = jest.fn().mockResolvedValue(true);
      mockDoctor.save.mockResolvedValue(mockDoctor);

      const updateData = { firstName: 'Jane', experience: 15 };
      const result = await doctorService.updateDoctor('doctor-123', updateData);

      expect(Doctor.findById).toHaveBeenCalledWith('doctor-123');
      expect(mockDoctor.save).toHaveBeenCalled();
      expect(DoctorScheduleReadView.updateFromDoctor).toHaveBeenCalledWith(mockDoctor);
      expect(publishDoctorEvent).toHaveBeenCalled();
    });

    it('should throw NotFoundError when doctor not found', async () => {
      Doctor.findById = jest.fn().mockResolvedValue(null);

      await expect(
        doctorService.updateDoctor('nonexistent-id', { firstName: 'Jane' })
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw ConflictError if new email already exists', async () => {
      Doctor.findById = jest.fn().mockResolvedValue(mockDoctor);
      Doctor.findByEmail = jest.fn().mockResolvedValue({ email: 'newemail@example.com' });

      await expect(
        doctorService.updateDoctor('doctor-123', { email: 'newemail@example.com' })
      ).rejects.toThrow(ConflictError);
    });
  });

  describe('deleteDoctor', () => {
    it('should delete doctor successfully', async () => {
      const mockResult = { _id: 'doctor-123', deleted: true };

      Doctor.findByIdAndDelete = jest.fn().mockResolvedValue(mockResult);

      const result = await doctorService.deleteDoctor('doctor-123');

      expect(Doctor.findByIdAndDelete).toHaveBeenCalledWith('doctor-123');
      expect(publishDoctorEvent).toHaveBeenCalled();
    });

    it('should throw NotFoundError when doctor not found', async () => {
      Doctor.findByIdAndDelete = jest.fn().mockResolvedValue(null);

      await expect(
        doctorService.deleteDoctor('nonexistent-id')
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('searchDoctors', () => {
    it('should search doctors with basic filters', async () => {
      const mockResults = {
        doctors: [
          { _id: '1', firstName: 'John', specialization: 'Cardiology' },
          { _id: '2', firstName: 'Jane', specialization: 'Cardiology' },
        ],
        pagination: {
          total: 2,
          page: 1,
          limit: 10,
          totalPages: 1,
        },
      };

      const { DoctorScheduleReadView } = require('../../../src/models/DoctorScheduleReadView');
      DoctorScheduleReadView.search = jest.fn().mockResolvedValue(mockResults);

      const result = await doctorService.searchDoctors({
        specialization: 'Cardiology',
        page: 1,
        limit: 10,
      });

      expect(DoctorScheduleReadView.search).toHaveBeenCalled();
      expect(result).toEqual(mockResults);
    });

    it('should normalize specialization in search', async () => {
      const { DoctorScheduleReadView } = require('../../../src/models/DoctorScheduleReadView');
      DoctorScheduleReadView.search = jest.fn().mockResolvedValue({ doctors: [], pagination: {} });

      await doctorService.searchDoctors({ specialization: 'cardiologist' });

      expect(DoctorScheduleReadView.search).toHaveBeenCalledWith(
        expect.objectContaining({
          specialization: 'Cardiology',
        })
      );
    });

    it('should handle empty search results', async () => {
      const mockResults = {
        doctors: [],
        pagination: { total: 0, page: 1, limit: 10 },
      };

      const { DoctorScheduleReadView } = require('../../../src/models/DoctorScheduleReadView');
      DoctorScheduleReadView.search = jest.fn().mockResolvedValue(mockResults);

      const result = await doctorService.searchDoctors({});

      expect(result.doctors).toEqual([]);
    });

    it('should apply pagination correctly', async () => {
      const { DoctorScheduleReadView } = require('../../../src/models/DoctorScheduleReadView');
      DoctorScheduleReadView.search = jest.fn().mockResolvedValue({ doctors: [], pagination: {} });

      await doctorService.searchDoctors({ page: 2, limit: 20 });

      expect(DoctorScheduleReadView.search).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 2,
          limit: 20,
        })
      );
    });
  });

  describe('checkAvailability', () => {
    it('should throw NotFoundError when doctor not found', async () => {
      Doctor.findById = jest.fn().mockResolvedValue(null);

      await expect(
        doctorService.checkAvailability('nonexistent-id', '2026-02-20', '09:00', '10:00')
      ).rejects.toThrow(NotFoundError);
    });

    it('should handle doctor lookup', async () => {
      const mockDoctor = {
        _id: 'doctor-123',
        status: 'inactive',
        isAvailable: false,
      };

      Doctor.findById = jest.fn().mockResolvedValue(mockDoctor);

      const result = await doctorService.checkAvailability(
        'doctor-123',
        '2026-02-20',
        '09:00',
        '10:00'
      );

      expect(Doctor.findById).toHaveBeenCalledWith('doctor-123');
      expect(result).toBeDefined();
    });
  });

  describe('addAvailabilitySlot', () => {
    it('should throw NotFoundError when doctor not found', async () => {
      Doctor.findById = jest.fn().mockResolvedValue(null);

      await expect(
        doctorService.addAvailabilitySlot('nonexistent-id', {})
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('findSlot', () => {
    it('should return null when doctor has no availability', () => {
      const doctor = { availability: [] };
      const result = doctorService.findSlot(doctor, '2026-02-20', '09:00', '10:00');
      expect(result).toBeNull();
    });

    it('should return null when doctor availability is undefined', () => {
      const doctor = {};
      const result = doctorService.findSlot(doctor, '2026-02-20', '09:00', '10:00');
      expect(result).toBeNull();
    });
  });
});
