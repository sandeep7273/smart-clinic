/**
 * Unit Tests for Service Client
 */

const axios = require('axios');
const ServiceClient = require('../../../src/services/serviceClient');
const { createCircuitBreaker } = require('../../../src/services/circuitBreaker');
const { ServiceUnavailableError, TimeoutError } = require('../../../src/utils/errors');
const { CORRELATION_ID_HEADER } = require('../../../src/utils/correlationId');
const config = require('../../../src/config');

// Mock dependencies
jest.mock('axios');
jest.mock('../../../src/services/circuitBreaker');
jest.mock('../../../src/utils/logger');

describe('ServiceClient', () => {
  let serviceClient;
  let mockAxiosInstance;
  let mockCircuitBreaker;

  beforeEach(() => {
    // Mock axios instance
    mockAxiosInstance = {
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      patch: jest.fn(),
      delete: jest.fn(),
      interceptors: {
        request: {
          use: jest.fn(),
        },
        response: {
          use: jest.fn(),
        },
      },
    };

    axios.create.mockReturnValue(mockAxiosInstance);

    // Mock circuit breaker
    mockCircuitBreaker = {
      fire: jest.fn(),
    };
    createCircuitBreaker.mockReturnValue(mockCircuitBreaker);

    jest.clearAllMocks();
  });

  describe('Constructor', () => {
    it('should create service client with correct configuration', () => {
      serviceClient = new ServiceClient('test-service', 'http://localhost:4000');

      expect(axios.create).toHaveBeenCalledWith({
        baseURL: 'http://localhost:4000',
        timeout: config.timeouts.service,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    });

    it('should use custom timeout when provided', () => {
      serviceClient = new ServiceClient('test-service', 'http://localhost:4000', {
        timeout: 10000,
      });

      expect(axios.create).toHaveBeenCalledWith({
        baseURL: 'http://localhost:4000',
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    });

    it('should set up request and response interceptors', () => {
      serviceClient = new ServiceClient('test-service', 'http://localhost:4000');

      expect(mockAxiosInstance.interceptors.request.use).toHaveBeenCalled();
      expect(mockAxiosInstance.interceptors.response.use).toHaveBeenCalled();
    });

    it('should create circuit breakers for all HTTP methods', () => {
      serviceClient = new ServiceClient('test-service', 'http://localhost:4000');

      expect(createCircuitBreaker).toHaveBeenCalledTimes(5);
      expect(createCircuitBreaker).toHaveBeenCalledWith(
        expect.any(Function),
        'test-service-GET'
      );
      expect(createCircuitBreaker).toHaveBeenCalledWith(
        expect.any(Function),
        'test-service-POST'
      );
      expect(createCircuitBreaker).toHaveBeenCalledWith(
        expect.any(Function),
        'test-service-PUT'
      );
      expect(createCircuitBreaker).toHaveBeenCalledWith(
        expect.any(Function),
        'test-service-PATCH'
      );
      expect(createCircuitBreaker).toHaveBeenCalledWith(
        expect.any(Function),
        'test-service-DELETE'
      );
    });
  });

  describe('_prepareHeaders()', () => {
    beforeEach(() => {
      serviceClient = new ServiceClient('test-service', 'http://localhost:4000');
    });

    it('should prepare headers with correlation ID', () => {
      const headers = serviceClient._prepareHeaders('corr-123', null);

      expect(headers[CORRELATION_ID_HEADER]).toBe('corr-123');
    });

    it('should prepare headers with user information', () => {
      const user = {
        userId: 'user-123',
        email: 'test@example.com',
        role: 'patient',
        tenantId: 'tenant-1',
      };

      const headers = serviceClient._prepareHeaders('corr-123', user);

      expect(headers['x-user-id']).toBe('user-123');
      expect(headers['x-user-email']).toBe('test@example.com');
      expect(headers['x-user-role']).toBe('patient');
      expect(headers['x-tenant-id']).toBe('tenant-1');
    });

    it('should include correlation ID and user info together', () => {
      const user = {
        userId: 'user-456',
        email: 'admin@example.com',
        role: 'admin',
      };

      const headers = serviceClient._prepareHeaders('corr-456', user);

      expect(headers[CORRELATION_ID_HEADER]).toBe('corr-456');
      expect(headers['x-user-id']).toBe('user-456');
      expect(headers['x-user-email']).toBe('admin@example.com');
      expect(headers['x-user-role']).toBe('admin');
    });

    it('should not include tenant header when tenantId is missing', () => {
      const user = {
        userId: 'user-789',
        email: 'user@example.com',
        role: 'doctor',
      };

      const headers = serviceClient._prepareHeaders('corr-789', user);

      expect(headers['x-tenant-id']).toBeUndefined();
    });

    it('should merge with additional headers', () => {
      const additionalHeaders = {
        'X-Custom-Header': 'custom-value',
        'Authorization': 'Bearer token',
      };

      const headers = serviceClient._prepareHeaders('corr-999', null, additionalHeaders);

      expect(headers['X-Custom-Header']).toBe('custom-value');
      expect(headers['Authorization']).toBe('Bearer token');
      expect(headers[CORRELATION_ID_HEADER]).toBe('corr-999');
    });

    it('should handle null correlation ID', () => {
      const headers = serviceClient._prepareHeaders(null, null);

      expect(headers[CORRELATION_ID_HEADER]).toBeUndefined();
    });

    it('should handle null user', () => {
      const headers = serviceClient._prepareHeaders('corr-123', null);

      expect(headers['x-user-id']).toBeUndefined();
      expect(headers['x-user-email']).toBeUndefined();
      expect(headers['x-user-role']).toBeUndefined();
    });
  });

  describe('GET Method', () => {
    beforeEach(() => {
      serviceClient = new ServiceClient('test-service', 'http://localhost:4000');
    });

    it('should make GET request successfully', async () => {
      const mockResponse = { data: { id: 1, name: 'Test' } };
      mockAxiosInstance.get.mockResolvedValue(mockResponse);
      mockCircuitBreaker.fire.mockResolvedValue(mockResponse.data);

      const result = await serviceClient.breakers.get.fire('/api/test', 'corr-123', null);

      expect(result).toEqual(mockResponse.data);
    });

    it('should include correlation ID in GET request headers', async () => {
      const mockResponse = { data: { success: true } };
      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      await serviceClient._get('/api/resource', 'corr-456', null);

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/resource', {
        headers: expect.objectContaining({
          [CORRELATION_ID_HEADER]: 'corr-456',
        }),
      });
    });

    it('should include user info in GET request headers', async () => {
      const mockResponse = { data: { success: true } };
      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const user = {
        userId: 'user-123',
        email: 'test@example.com',
        role: 'patient',
      };

      await serviceClient._get('/api/resource', 'corr-123', user);

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/resource', {
        headers: expect.objectContaining({
          'x-user-id': 'user-123',
          'x-user-email': 'test@example.com',
          'x-user-role': 'patient',
        }),
      });
    });
  });

  describe('POST Method', () => {
    beforeEach(() => {
      serviceClient = new ServiceClient('test-service', 'http://localhost:4000');
    });

    it('should make POST request successfully', async () => {
      const requestData = { name: 'Test', value: 123 };
      const mockResponse = { data: { id: 1, ...requestData } };
      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const result = await serviceClient._post('/api/create', requestData, 'corr-123', null);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/api/create',
        requestData,
        expect.objectContaining({
          headers: expect.objectContaining({
            [CORRELATION_ID_HEADER]: 'corr-123',
          }),
        })
      );
      expect(result).toEqual(mockResponse.data);
    });

    it('should include user info in POST request', async () => {
      const requestData = { data: 'test' };
      const mockResponse = { data: { success: true } };
      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const user = {
        userId: 'user-456',
        email: 'user@example.com',
        role: 'doctor',
        tenantId: 'tenant-2',
      };

      await serviceClient._post('/api/create', requestData, 'corr-789', user);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/api/create',
        requestData,
        expect.objectContaining({
          headers: expect.objectContaining({
            'x-user-id': 'user-456',
            'x-tenant-id': 'tenant-2',
          }),
        })
      );
    });
  });

  describe('PUT Method', () => {
    beforeEach(() => {
      serviceClient = new ServiceClient('test-service', 'http://localhost:4000');
    });

    it('should make PUT request successfully', async () => {
      const requestData = { name: 'Updated' };
      const mockResponse = { data: { id: 1, name: 'Updated' } };
      mockAxiosInstance.put.mockResolvedValue(mockResponse);

      const result = await serviceClient._put('/api/update/1', requestData, 'corr-123', null);

      expect(mockAxiosInstance.put).toHaveBeenCalledWith(
        '/api/update/1',
        requestData,
        expect.any(Object)
      );
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('PATCH Method', () => {
    beforeEach(() => {
      serviceClient = new ServiceClient('test-service', 'http://localhost:4000');
    });

    it('should make PATCH request successfully', async () => {
      const requestData = { status: 'active' };
      const mockResponse = { data: { id: 1, status: 'active' } };
      mockAxiosInstance.patch.mockResolvedValue(mockResponse);

      const result = await serviceClient._patch('/api/patch/1', requestData, 'corr-123', null);

      expect(mockAxiosInstance.patch).toHaveBeenCalledWith(
        '/api/patch/1',
        requestData,
        expect.any(Object)
      );
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('DELETE Method', () => {
    beforeEach(() => {
      serviceClient = new ServiceClient('test-service', 'http://localhost:4000');
    });

    it('should make DELETE request successfully', async () => {
      const mockResponse = { data: { success: true } };
      mockAxiosInstance.delete.mockResolvedValue(mockResponse);

      const result = await serviceClient._delete('/api/delete/1', 'corr-123', null);

      expect(mockAxiosInstance.delete).toHaveBeenCalledWith(
        '/api/delete/1',
        expect.objectContaining({
          headers: expect.objectContaining({
            [CORRELATION_ID_HEADER]: 'corr-123',
          }),
        })
      );
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('Request Interceptors', () => {
    it('should log requests through interceptor', () => {
      serviceClient = new ServiceClient('test-service', 'http://localhost:4000');

      const requestInterceptor = mockAxiosInstance.interceptors.request.use.mock.calls[0][0];
      const config = { method: 'GET', url: '/api/test' };

      const result = requestInterceptor(config);

      expect(result).toBe(config);
    });

    it('should handle request errors through interceptor', () => {
      serviceClient = new ServiceClient('test-service', 'http://localhost:4000');

      const errorInterceptor = mockAxiosInstance.interceptors.request.use.mock.calls[0][1];
      const error = new Error('Request setup failed');

      expect(errorInterceptor(error)).rejects.toEqual(error);
    });
  });

  describe('Response Interceptors', () => {
    it('should handle successful responses through interceptor', () => {
      serviceClient = new ServiceClient('test-service', 'http://localhost:4000');

      const responseInterceptor = mockAxiosInstance.interceptors.response.use.mock.calls[0][0];
      const response = {
        status: 200,
        config: { url: '/api/test' },
        data: { success: true },
      };

      const result = responseInterceptor(response);

      expect(result).toBe(response);
    });

    it('should handle response errors through interceptor', () => {
      serviceClient = new ServiceClient('test-service', 'http://localhost:4000');

      const errorInterceptor = mockAxiosInstance.interceptors.response.use.mock.calls[0][1];
      const error = {
        message: 'Request failed',
        response: { status: 500 },
        config: { url: '/api/test' },
      };

      expect(errorInterceptor(error)).rejects.toEqual(error);
    });
  });

  describe('Edge Cases', () => {
    beforeEach(() => {
      serviceClient = new ServiceClient('test-service', 'http://localhost:4000');
    });

    it('should handle requests without config parameter', async () => {
      const mockResponse = { data: { success: true } };
      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      await serviceClient._get('/api/resource', 'corr-123', null);

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/resource', {
        headers: expect.any(Object),
      });
    });

    it('should merge custom headers with prepared headers', async () => {
      const mockResponse = { data: { success: true } };
      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const customConfig = {
        headers: {
          'X-Custom': 'value',
        },
      };

      await serviceClient._get('/api/resource', 'corr-123', null, customConfig);

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/resource', {
        headers: expect.objectContaining({
          'X-Custom': 'value',
          [CORRELATION_ID_HEADER]: 'corr-123',
        }),
      });
    });

    it('should handle empty URLs', async () => {
      const mockResponse = { data: { success: true } };
      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      await serviceClient._get('', 'corr-123', null);

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('', expect.any(Object));
    });

    it('should handle null request data in POST', async () => {
      const mockResponse = { data: { success: true } };
      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      await serviceClient._post('/api/create', null, 'corr-123', null);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/api/create',
        null,
        expect.any(Object)
      );
    });
  });

  describe('Service Properties', () => {
    it('should store service name correctly', () => {
      serviceClient = new ServiceClient('auth-service', 'http://localhost:4001');

      expect(serviceClient.serviceName).toBe('auth-service');
    });

    it('should store base URL correctly', () => {
      serviceClient = new ServiceClient('test-service', 'http://localhost:4000');

      expect(serviceClient.baseURL).toBe('http://localhost:4000');
    });

    it('should store timeout correctly', () => {
      serviceClient = new ServiceClient('test-service', 'http://localhost:4000', {
        timeout: 15000,
      });

      expect(serviceClient.timeout).toBe(15000);
    });
  });
});
