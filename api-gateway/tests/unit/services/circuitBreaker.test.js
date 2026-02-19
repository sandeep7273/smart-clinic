/**
 * Unit Tests for Circuit Breaker Service
 */

const CircuitBreaker = require('opossum');
const {
  createCircuitBreaker,
  executeWithCircuitBreaker,
  getCircuitBreakerStats,
} = require('../../../src/services/circuitBreaker');
const { CircuitBreakerOpenError } = require('../../../src/utils/errors');
const config = require('../../../src/config');

// Mock dependencies
jest.mock('opossum');
jest.mock('../../../src/utils/logger');

describe('Circuit Breaker Service', () => {
  let mockBreakerInstance;
  let mockEventHandlers;

  beforeEach(() => {
    mockEventHandlers = {};
    
    mockBreakerInstance = {
      on: jest.fn((event, handler) => {
        mockEventHandlers[event] = handler;
      }),
      fire: jest.fn(),
      status: {
        name: 'CLOSED',
      },
      stats: {
        failures: 0,
        successes: 10,
        rejects: 0,
        timeouts: 0,
        percentiles: {},
      },
      name: 'test-service',
    };

    CircuitBreaker.mockImplementation(() => mockBreakerInstance);
    jest.clearAllMocks();
  });

  describe('createCircuitBreaker()', () => {
    it('should create circuit breaker with default options', () => {
      const mockFn = jest.fn();
      const breaker = createCircuitBreaker(mockFn, 'test-service');

      expect(CircuitBreaker).toHaveBeenCalledWith(mockFn, {
        timeout: config.circuitBreaker.timeout,
        errorThresholdPercentage: config.circuitBreaker.errorThresholdPercentage,
        resetTimeout: config.circuitBreaker.resetTimeout,
        name: 'test-service',
      });
      expect(breaker).toBe(mockBreakerInstance);
    });

    it('should create circuit breaker with custom options', () => {
      const mockFn = jest.fn();
      const customOptions = {
        timeout: 5000,
        errorThresholdPercentage: 60,
        resetTimeout: 20000,
        volumeThreshold: 15,
      };

      createCircuitBreaker(mockFn, 'custom-service', customOptions);

      expect(CircuitBreaker).toHaveBeenCalledWith(mockFn, {
        timeout: 5000,
        errorThresholdPercentage: 60,
        resetTimeout: 20000,
        name: 'custom-service',
        volumeThreshold: 15,
      });
    });

    it('should register event handler for "open" event', () => {
      const mockFn = jest.fn();
      createCircuitBreaker(mockFn, 'test-service');

      expect(mockBreakerInstance.on).toHaveBeenCalledWith('open', expect.any(Function));
    });

    it('should register event handler for "close" event', () => {
      const mockFn = jest.fn();
      createCircuitBreaker(mockFn, 'test-service');

      expect(mockBreakerInstance.on).toHaveBeenCalledWith('close', expect.any(Function));
    });

    it('should register event handler for "halfOpen" event', () => {
      const mockFn = jest.fn();
      createCircuitBreaker(mockFn, 'test-service');

      expect(mockBreakerInstance.on).toHaveBeenCalledWith('halfOpen', expect.any(Function));
    });

    it('should register event handler for "failure" event', () => {
      const mockFn = jest.fn();
      createCircuitBreaker(mockFn, 'test-service');

      expect(mockBreakerInstance.on).toHaveBeenCalledWith('failure', expect.any(Function));
    });

    it('should register event handler for "reject" event', () => {
      const mockFn = jest.fn();
      createCircuitBreaker(mockFn, 'test-service');

      expect(mockBreakerInstance.on).toHaveBeenCalledWith('reject', expect.any(Function));
    });

    it('should register event handler for "timeout" event', () => {
      const mockFn = jest.fn();
      createCircuitBreaker(mockFn, 'test-service');

      expect(mockBreakerInstance.on).toHaveBeenCalledWith('timeout', expect.any(Function));
    });

    it('should call event handlers when events are triggered', () => {
      const mockFn = jest.fn();
      createCircuitBreaker(mockFn, 'test-service');

      // Trigger open event
      expect(() => mockEventHandlers.open()).not.toThrow();

      // Trigger close event
      expect(() => mockEventHandlers.close()).not.toThrow();

      // Trigger halfOpen event
      expect(() => mockEventHandlers.halfOpen()).not.toThrow();

      // Trigger failure event
      expect(() => mockEventHandlers.failure(new Error('Test error'))).not.toThrow();

      // Trigger reject event
      expect(() => mockEventHandlers.reject()).not.toThrow();

      // Trigger timeout event
      expect(() => mockEventHandlers.timeout()).not.toThrow();
    });
  });

  describe('executeWithCircuitBreaker()', () => {
    it('should execute function successfully through circuit breaker', async () => {
      const mockFn = jest.fn().mockResolvedValue('success');
      mockBreakerInstance.fire.mockResolvedValue('success');

      const result = await executeWithCircuitBreaker(mockFn, 'test-service', 'arg1', 'arg2');

      expect(CircuitBreaker).toHaveBeenCalled();
      expect(mockBreakerInstance.fire).toHaveBeenCalledWith('arg1', 'arg2');
      expect(result).toBe('success');
    });

    it('should propagate function errors', async () => {
      const error = new Error('Function failed');
      mockBreakerInstance.fire.mockRejectedValue(error);

      await expect(
        executeWithCircuitBreaker(jest.fn(), 'test-service')
      ).rejects.toThrow('Function failed');
    });

    it('should throw CircuitBreakerOpenError when breaker is open', async () => {
      const error = new Error('Breaker is open');
      mockBreakerInstance.fire.mockRejectedValue(error);

      await expect(
        executeWithCircuitBreaker(jest.fn(), 'test-service')
      ).rejects.toThrow(CircuitBreakerOpenError);
    });

    it('should handle breaker open message variations', async () => {
      const error = new Error('Circuit Breaker is open and requests are failing fast');
      mockBreakerInstance.fire.mockRejectedValue(error);

      await expect(
        executeWithCircuitBreaker(jest.fn(), 'critical-service')
      ).rejects.toThrow(CircuitBreakerOpenError);
    });

    it('should pass multiple arguments to wrapped function', async () => {
      const mockFn = jest.fn().mockResolvedValue('result');
      mockBreakerInstance.fire.mockResolvedValue('result');

      await executeWithCircuitBreaker(
        mockFn,
        'test-service',
        'arg1',
        123,
        { key: 'value' },
        ['array']
      );

      expect(mockBreakerInstance.fire).toHaveBeenCalledWith(
        'arg1',
        123,
        { key: 'value' },
        ['array']
      );
    });

    it('should handle async function results', async () => {
      const asyncResult = { data: 'async data' };
      mockBreakerInstance.fire.mockResolvedValue(asyncResult);

      const result = await executeWithCircuitBreaker(
        jest.fn(),
        'async-service'
      );

      expect(result).toEqual(asyncResult);
    });
  });

  describe('getCircuitBreakerStats()', () => {
    it('should return circuit breaker statistics', () => {
      mockBreakerInstance.stats = {
        failures: 2,
        successes: 98,
        rejects: 0,
        timeouts: 1,
        percentiles: {
          0.5: 100,
          0.9: 200,
          0.99: 500,
        },
      };
      mockBreakerInstance.status.name = 'CLOSED';

      const stats = getCircuitBreakerStats(mockBreakerInstance);

      expect(stats).toEqual({
        name: 'test-service',
        status: 'CLOSED',
        failures: 2,
        successes: 98,
        rejects: 0,
        timeouts: 1,
        percentiles: {
          0.5: 100,
          0.9: 200,
          0.99: 500,
        },
      });
    });

    it('should handle different breaker statuses', () => {
      mockBreakerInstance.status.name = 'OPEN';

      const stats = getCircuitBreakerStats(mockBreakerInstance);

      expect(stats.status).toBe('OPEN');
    });

    it('should handle HALF_OPEN status', () => {
      mockBreakerInstance.status.name = 'HALF_OPEN';

      const stats = getCircuitBreakerStats(mockBreakerInstance);

      expect(stats.status).toBe('HALF_OPEN');
    });

    it('should include all required stat fields', () => {
      const stats = getCircuitBreakerStats(mockBreakerInstance);

      expect(stats).toHaveProperty('name');
      expect(stats).toHaveProperty('status');
      expect(stats).toHaveProperty('failures');
      expect(stats).toHaveProperty('successes');
      expect(stats).toHaveProperty('rejects');
      expect(stats).toHaveProperty('timeouts');
      expect(stats).toHaveProperty('percentiles');
    });
  });

  describe('Edge Cases', () => {
    it('should handle undefined function gracefully', () => {
      expect(() => {
        createCircuitBreaker(undefined, 'test-service');
      }).not.toThrow();
    });

    it('should handle empty service name', () => {
      const mockFn = jest.fn();
      createCircuitBreaker(mockFn, '');

      expect(CircuitBreaker).toHaveBeenCalledWith(
        mockFn,
        expect.objectContaining({ name: '' })
      );
    });

    it('should handle null options', () => {
      const mockFn = jest.fn();
      createCircuitBreaker(mockFn, 'test-service', null);

      expect(CircuitBreaker).toHaveBeenCalled();
    });

    it('should create independent circuit breakers for different services', () => {
      const fn1 = jest.fn();
      const fn2 = jest.fn();

      createCircuitBreaker(fn1, 'service-1');
      createCircuitBreaker(fn2, 'service-2');

      expect(CircuitBreaker).toHaveBeenCalledTimes(2);
      expect(CircuitBreaker).toHaveBeenNthCalledWith(
        1,
        fn1,
        expect.objectContaining({ name: 'service-1' })
      );
      expect(CircuitBreaker).toHaveBeenNthCalledWith(
        2,
        fn2,
        expect.objectContaining({ name: 'service-2' })
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle errors without message property', async () => {
      const error = { toString: () => 'Unknown error' };
      mockBreakerInstance.fire.mockRejectedValue(error);

      await expect(
        executeWithCircuitBreaker(jest.fn(), 'test-service')
      ).rejects.toBe(error);
    });

    it('should differentiate between breaker errors and function errors', async () => {
      const functionError = new Error('Database connection failed');
      mockBreakerInstance.fire.mockRejectedValue(functionError);

      await expect(
        executeWithCircuitBreaker(jest.fn(), 'db-service')
      ).rejects.toThrow('Database connection failed');
    });
  });
});
