/**
 * Unit Tests for Custom Error Classes
 */

const {
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
} = require('../../../src/utils/errors');

describe('Custom Error Classes - Unit Tests', () => {
  describe('ValidationError', () => {
    it('should create a ValidationError with message', () => {
      const error = new ValidationError('Invalid input');
      
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(ValidationError);
      expect(error.message).toBe('Invalid input');
      expect(error.name).toBe('ValidationError');
      expect(error.statusCode).toBe(400);
      expect(error.details).toBeNull();
    });

    it('should create a ValidationError with details', () => {
      const details = { field: 'email', reason: 'invalid format' };
      const error = new ValidationError('Validation failed', details);
      
      expect(error.message).toBe('Validation failed');
      expect(error.details).toEqual(details);
      expect(error.statusCode).toBe(400);
    });

    it('should have correct statusCode property', () => {
      const error = new ValidationError('Test');
      expect(error.statusCode).toBe(400);
    });

    it('should inherit from Error', () => {
      const error = new ValidationError('Test');
      expect(error instanceof Error).toBe(true);
    });
  });

  describe('NotFoundError', () => {
    it('should create a NotFoundError with default message', () => {
      const error = new NotFoundError();
      
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(NotFoundError);
      expect(error.message).toBe('Resource not found');
      expect(error.name).toBe('NotFoundError');
      expect(error.statusCode).toBe(404);
    });

    it('should create a NotFoundError with custom message', () => {
      const error = new NotFoundError('Doctor not found');
      
      expect(error.message).toBe('Doctor not found');
      expect(error.statusCode).toBe(404);
    });

    it('should have correct statusCode property', () => {
      const error = new NotFoundError();
      expect(error.statusCode).toBe(404);
    });

    it('should inherit from Error', () => {
      const error = new NotFoundError();
      expect(error instanceof Error).toBe(true);
    });
  });

  describe('UnauthorizedError', () => {
    it('should create an UnauthorizedError with default message', () => {
      const error = new UnauthorizedError();
      
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(UnauthorizedError);
      expect(error.message).toBe('Unauthorized');
      expect(error.name).toBe('UnauthorizedError');
      expect(error.statusCode).toBe(401);
    });

    it('should create an UnauthorizedError with custom message', () => {
      const error = new UnauthorizedError('Invalid token');
      
      expect(error.message).toBe('Invalid token');
      expect(error.statusCode).toBe(401);
    });

    it('should have correct statusCode property', () => {
      const error = new UnauthorizedError();
      expect(error.statusCode).toBe(401);
    });

    it('should inherit from Error', () => {
      const error = new UnauthorizedError();
      expect(error instanceof Error).toBe(true);
    });
  });

  describe('ForbiddenError', () => {
    it('should create a ForbiddenError with default message', () => {
      const error = new ForbiddenError();
      
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(ForbiddenError);
      expect(error.message).toBe('Forbidden');
      expect(error.name).toBe('ForbiddenError');
      expect(error.statusCode).toBe(403);
    });

    it('should create a ForbiddenError with custom message', () => {
      const error = new ForbiddenError('Access denied');
      
      expect(error.message).toBe('Access denied');
      expect(error.statusCode).toBe(403);
    });

    it('should have correct statusCode property', () => {
      const error = new ForbiddenError();
      expect(error.statusCode).toBe(403);
    });

    it('should inherit from Error', () => {
      const error = new ForbiddenError();
      expect(error instanceof Error).toBe(true);
    });
  });

  describe('ConflictError', () => {
    it('should create a ConflictError with default message', () => {
      const error = new ConflictError();
      
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(ConflictError);
      expect(error.message).toBe('Resource conflict');
      expect(error.name).toBe('ConflictError');
      expect(error.statusCode).toBe(409);
    });

    it('should create a ConflictError with custom message', () => {
      const error = new ConflictError('Doctor already exists');
      
      expect(error.message).toBe('Doctor already exists');
      expect(error.statusCode).toBe(409);
    });

    it('should have correct statusCode property', () => {
      const error = new ConflictError();
      expect(error.statusCode).toBe(409);
    });

    it('should inherit from Error', () => {
      const error = new ConflictError();
      expect(error instanceof Error).toBe(true);
    });
  });

  describe('Error Properties', () => {
    it('should have unique status codes for each error type', () => {
      const errors = [
        new ValidationError('test'),
        new NotFoundError('test'),
        new UnauthorizedError('test'),
        new ForbiddenError('test'),
        new ConflictError('test'),
      ];

      const statusCodes = errors.map(e => e.statusCode);
      const uniqueCodes = new Set(statusCodes);
      
      expect(uniqueCodes.size).toBe(5);
      expect(statusCodes).toEqual([400, 404, 401, 403, 409]);
    });

    it('should have unique names for each error type', () => {
      const errors = [
        new ValidationError('test'),
        new NotFoundError('test'),
        new UnauthorizedError('test'),
        new ForbiddenError('test'),
        new ConflictError('test'),
      ];

      const names = errors.map(e => e.name);
      const uniqueNames = new Set(names);
      
      expect(uniqueNames.size).toBe(5);
    });

    it('should all be throwable', () => {
      expect(() => { throw new ValidationError('test'); }).toThrow(ValidationError);
      expect(() => { throw new NotFoundError('test'); }).toThrow(NotFoundError);
      expect(() => { throw new UnauthorizedError('test'); }).toThrow(UnauthorizedError);
      expect(() => { throw new ForbiddenError('test'); }).toThrow(ForbiddenError);
      expect(() => { throw new ConflictError('test'); }).toThrow(ConflictError);
    });
  });
});
