
const { createCircuitBreaker, BusinessError } = require('../../src/utils/circuitBreaker');

// Mock the logger to prevent logs from appearing in test output
jest.mock('../../src/utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));


describe('Circuit Breaker', () => {
    let fn;
  
    beforeEach(() => {
      fn = jest.fn();
    });
  
    it('should create a circuit breaker that executes the function', async () => {
      fn.mockResolvedValue('Success');
      const breaker = createCircuitBreaker(fn, { name: 'test' });
      const result = await breaker.fire();
  
      expect(fn).toHaveBeenCalled();
      expect(result).toBe('Success');
    });
});
