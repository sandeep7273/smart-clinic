
const {
    AppError,
    ValidationError,
    NotFoundError,
    UnauthorizedError,
    ForbiddenError,
    ConflictError,
    ServiceUnavailableError,
    SagaError,
  } = require('../../src/utils/errors');
  
  describe('Custom Errors', () => {
    it('should create an AppError with default status 500', () => {
      const err = new AppError('Test error');
      expect(err.message).toBe('Test error');
      expect(err.statusCode).toBe(500);
      expect(err.isOperational).toBe(true);
    });
  
    it('should create a ValidationError with status 400', () => {
      const err = new ValidationError('Invalid field');
      expect(err.message).toBe('Invalid field');
      expect(err.statusCode).toBe(400);
      expect(err.name).toBe('ValidationError');
    });
  
    it('should create a NotFoundError with status 404', () => {
      const err = new NotFoundError('Resource');
      expect(err.message).toBe('Resource not found');
      expect(err.statusCode).toBe(404);
      expect(err.name).toBe('NotFoundError');
    });
  
    it('should create an UnauthorizedError with status 401', () => {
        const err = new UnauthorizedError();
        expect(err.message).toBe('Unauthorized access');
        expect(err.statusCode).toBe(401);
        expect(err.name).toBe('UnauthorizedError');
    });
  
    it('should create a ForbiddenError with status 403', () => {
        const err = new ForbiddenError();
        expect(err.message).toBe('Forbidden access');
        expect(err.statusCode).toBe(403);
        expect(err.name).toBe('ForbiddenError');
    });
  
    it('should create a ConflictError with status 409', () => {
        const err = new ConflictError();
        expect(err.message).toBe('Resource conflict');
        expect(err.statusCode).toBe(409);
        expect(err.name).toBe('ConflictError');
    });
  
    it('should create a ServiceUnavailableError with status 503', () => {
        const err = new ServiceUnavailableError('Database');
        expect(err.message).toBe('Database is currently unavailable');
        expect(err.statusCode).toBe(503);
        expect(err.name).toBe('ServiceUnavailableError');
    });
  
    it('should create a SagaError with status 500 and compensation details', () => {
        const err = new SagaError('Saga failed', ['compensation1']);
        expect(err.message).toBe('Saga failed');
        expect(err.statusCode).toBe(500);
        expect(err.name).toBe('SagaError');
        expect(err.compensationsFailed).toEqual(['compensation1']);
    });
  });