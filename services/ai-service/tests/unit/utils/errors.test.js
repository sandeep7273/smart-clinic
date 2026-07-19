/**
 * Unit Tests for Custom Error Classes
 */

const {
  AppError,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
  ServiceUnavailableError,
  SagaError,
} = require('../../../src/utils/errors');

describe('Custom Error Classes', () => {
  describe('AppError', () => {
    it('should create an AppError with default status code', () => {
      const error = new AppError('Test error');

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(AppError);
      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(500);
      expect(error.isOperational).toBe(true);
      expect(error.stack).toBeDefined();
    });

    it('should create an AppError with custom status code', () => {
      const error = new AppError('Custom error', 418);

      expect(error.message).toBe('Custom error');
      expect(error.statusCode).toBe(418);
      expect(error.isOperational).toBe(true);
    });

    it('should capture stack trace', () => {
      const error = new AppError('Stack test');

      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('AppError');
    });
  });

  describe('ValidationError', () => {
    it('should create a ValidationError with 400 status code', () => {
      const error = new ValidationError('Invalid input');

      expect(error).toBeInstanceOf(AppError);
      expect(error).toBeInstanceOf(ValidationError);
      expect(error.message).toBe('Invalid input');
      expect(error.statusCode).toBe(400);
      expect(error.name).toBe('ValidationError');
      expect(error.isOperational).toBe(true);
    });

    it('should handle empty message', () => {
      const error = new ValidationError('');

      expect(error.message).toBe('');
      expect(error.statusCode).toBe(400);
    });
  });

  describe('NotFoundError', () => {
    it('should create a NotFoundError with default resource', () => {
      const error = new NotFoundError();

      expect(error).toBeInstanceOf(AppError);
      expect(error).toBeInstanceOf(NotFoundError);
      expect(error.message).toBe('Resource not found');
      expect(error.statusCode).toBe(404);
      expect(error.name).toBe('NotFoundError');
      expect(error.isOperational).toBe(true);
    });

    it('should create a NotFoundError with custom resource', () => {
      const error = new NotFoundError('User');

      expect(error.message).toBe('User not found');
      expect(error.statusCode).toBe(404);
    });

    it('should handle specific resources', () => {
      const doctorError = new NotFoundError('Doctor');
      const appointmentError = new NotFoundError('Appointment');

      expect(doctorError.message).toBe('Doctor not found');
      expect(appointmentError.message).toBe('Appointment not found');
    });
  });

  describe('UnauthorizedError', () => {
    it('should create an UnauthorizedError with default message', () => {
      const error = new UnauthorizedError();

      expect(error).toBeInstanceOf(AppError);
      expect(error).toBeInstanceOf(UnauthorizedError);
      expect(error.message).toBe('Unauthorized access');
      expect(error.statusCode).toBe(401);
      expect(error.name).toBe('UnauthorizedError');
      expect(error.isOperational).toBe(true);
    });

    it('should create an UnauthorizedError with custom message', () => {
      const error = new UnauthorizedError('Invalid token');

      expect(error.message).toBe('Invalid token');
      expect(error.statusCode).toBe(401);
    });
  });

  describe('ForbiddenError', () => {
    it('should create a ForbiddenError with default message', () => {
      const error = new ForbiddenError();

      expect(error).toBeInstanceOf(AppError);
      expect(error).toBeInstanceOf(ForbiddenError);
      expect(error.message).toBe('Forbidden access');
      expect(error.statusCode).toBe(403);
      expect(error.name).toBe('ForbiddenError');
      expect(error.isOperational).toBe(true);
    });

    it('should create a ForbiddenError with custom message', () => {
      const error = new ForbiddenError('Insufficient permissions');

      expect(error.message).toBe('Insufficient permissions');
      expect(error.statusCode).toBe(403);
    });
  });

  describe('ConflictError', () => {
    it('should create a ConflictError with default message', () => {
      const error = new ConflictError();

      expect(error).toBeInstanceOf(AppError);
      expect(error).toBeInstanceOf(ConflictError);
      expect(error.message).toBe('Resource conflict');
      expect(error.statusCode).toBe(409);
      expect(error.name).toBe('ConflictError');
      expect(error.isOperational).toBe(true);
    });

    it('should create a ConflictError with custom message', () => {
      const error = new ConflictError('Appointment already exists');

      expect(error.message).toBe('Appointment already exists');
      expect(error.statusCode).toBe(409);
    });
  });

  describe('ServiceUnavailableError', () => {
    it('should create a ServiceUnavailableError with default service', () => {
      const error = new ServiceUnavailableError();

      expect(error).toBeInstanceOf(AppError);
      expect(error).toBeInstanceOf(ServiceUnavailableError);
      expect(error.message).toBe('External service is currently unavailable');
      expect(error.statusCode).toBe(503);
      expect(error.name).toBe('ServiceUnavailableError');
      expect(error.isOperational).toBe(true);
    });

    it('should create a ServiceUnavailableError with custom service', () => {
      const error = new ServiceUnavailableError('Doctor Service');

      expect(error.message).toBe('Doctor Service is currently unavailable');
      expect(error.statusCode).toBe(503);
    });
  });

  describe('SagaError', () => {
    it('should create a SagaError with default compensations', () => {
      const error = new SagaError('Saga failed');

      expect(error).toBeInstanceOf(AppError);
      expect(error).toBeInstanceOf(SagaError);
      expect(error.message).toBe('Saga failed');
      expect(error.statusCode).toBe(500);
      expect(error.name).toBe('SagaError');
      expect(error.compensationsFailed).toEqual([]);
      expect(error.isOperational).toBe(true);
    });

    it('should create a SagaError with failed compensations', () => {
      const compensations = ['step1', 'step2'];
      const error = new SagaError('Saga rollback failed', compensations);

      expect(error.message).toBe('Saga rollback failed');
      expect(error.statusCode).toBe(500);
      expect(error.compensationsFailed).toEqual(compensations);
    });
  });

  describe('Error inheritance', () => {
    it('should maintain proper prototype chain', () => {
      const errors = [
        new ValidationError('test'),
        new NotFoundError('test'),
        new UnauthorizedError('test'),
        new ForbiddenError('test'),
        new ConflictError('test'),
        new ServiceUnavailableError('test'),
        new SagaError('test'),
      ];

      errors.forEach(error => {
        expect(error).toBeInstanceOf(Error);
        expect(error).toBeInstanceOf(AppError);
        expect(error.isOperational).toBe(true);
      });
    });

    it('should be catchable as Error', () => {
      try {
        throw new ValidationError('Test error');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect(error.message).toBe('Test error');
      }
    });

    it('should be catchable as AppError', () => {
      try {
        throw new NotFoundError('User');
      } catch (error) {
        expect(error).toBeInstanceOf(AppError);
        expect(error.statusCode).toBe(404);
      }
    });
  });

  describe('Error properties', () => {
    it('should have all required properties', () => {
      const error = new ValidationError('Test');

      expect(error).toHaveProperty('message');
      expect(error).toHaveProperty('statusCode');
      expect(error).toHaveProperty('isOperational');
      expect(error).toHaveProperty('name');
      expect(error).toHaveProperty('stack');
    });

    it('should have correct status codes', () => {
      expect(new ValidationError('test').statusCode).toBe(400);
      expect(new UnauthorizedError('test').statusCode).toBe(401);
      expect(new ForbiddenError('test').statusCode).toBe(403);
      expect(new NotFoundError('test').statusCode).toBe(404);
      expect(new ConflictError('test').statusCode).toBe(409);
      expect(new AppError('test').statusCode).toBe(500);
      expect(new SagaError('test').statusCode).toBe(500);
      expect(new ServiceUnavailableError('test').statusCode).toBe(503);
    });
  });
});