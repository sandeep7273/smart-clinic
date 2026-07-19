/**
 * Service Client
 * HTTP client for microservice communication with circuit breaker
 */

const axios = require('axios');
const config = require('../config');
const logger = require('../utils/logger');
const { createCircuitBreaker } = require('./circuitBreaker');
const { ServiceUnavailableError, TimeoutError } = require('../utils/errors');
const { CORRELATION_ID_HEADER } = require('../utils/correlationId');

/**
 * Service Client Class
 * Handles HTTP communication with microservices
 */
class ServiceClient {
  constructor(serviceName, baseURL, options = {}) {
    this.serviceName = serviceName;
    this.baseURL = baseURL;
    this.timeout = options.timeout || config.timeouts.service;

    // Create axios instance
    this.client = axios.create({
      baseURL,
      timeout: this.timeout,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        logger.debug(`${this.serviceName} request`, {
          method: config.method,
          url: config.url,
        });
        return config;
      },
      (error) => {
        logger.error(`${this.serviceName} request error`, {
          error: error.message,
        });
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => {
        logger.debug(`${this.serviceName} response`, {
          status: response.status,
          url: response.config.url,
        });
        return response;
      },
      (error) => {
        logger.error(`${this.serviceName} response error`, {
          error: error.message,
          status: error.response?.status,
          url: error.config?.url,
        });
        return Promise.reject(error);
      }
    );

    // Create circuit breaker for each HTTP method
    this.breakers = {
      get: createCircuitBreaker(this._get.bind(this), `${serviceName}-GET`),
      post: createCircuitBreaker(this._post.bind(this), `${serviceName}-POST`),
      put: createCircuitBreaker(this._put.bind(this), `${serviceName}-PUT`),
      patch: createCircuitBreaker(this._patch.bind(this), `${serviceName}-PATCH`),
      delete: createCircuitBreaker(this._delete.bind(this), `${serviceName}-DELETE`),
    };
  }

  /**
   * Prepare request headers
   */
  _prepareHeaders(correlationId, user, additionalHeaders = {}) {
    const headers = {
      ...additionalHeaders,
    };

    // Add correlation ID
    if (correlationId) {
      headers[CORRELATION_ID_HEADER] = correlationId;
    }

    // Forward user information
    if (user) {
      headers['x-user-id'] = user.userId;
      headers['x-user-email'] = user.email;
      headers['x-user-role'] = user.role;
      if (user.tenantId) {
        headers['x-tenant-id'] = user.tenantId;
      }
    }

    return headers;
  }

  /**
   * Internal GET method (wrapped by circuit breaker)
   */
  async _get(url, correlationId, user, config = {}) {
    const headers = this._prepareHeaders(correlationId, user, config.headers);
    const response = await this.client.get(url, { ...config, headers });
    return response.data;
  }

  /**
   * Internal POST method (wrapped by circuit breaker)
   */
  async _post(url, data, correlationId, user, config = {}) {
    const headers = this._prepareHeaders(correlationId, user, config.headers);
    const response = await this.client.post(url, data, { ...config, headers });
    return response.data;
  }

  /**
   * Internal PUT method (wrapped by circuit breaker)
   */
  async _put(url, data, correlationId, user, config = {}) {
    const headers = this._prepareHeaders(correlationId, user, config.headers);
    const response = await this.client.put(url, data, { ...config, headers });
    return response.data;
  }

  /**
   * Internal PATCH method (wrapped by circuit breaker)
   */
  async _patch(url, data, correlationId, user, config = {}) {
    const headers = this._prepareHeaders(correlationId, user, config.headers);
    const response = await this.client.patch(url, data, { ...config, headers });
    return response.data;
  }

  /**
   * Internal DELETE method (wrapped by circuit breaker)
   */
  async _delete(url, correlationId, user, config = {}) {
    const headers = this._prepareHeaders(correlationId, user, config.headers);
    const response = await this.client.delete(url, { ...config, headers });
    return response.data;
  }

  /**
   * Public GET method
   */
  async get(url, correlationId, user, config = {}) {
    try {
      return await this.breakers.get.fire(url, correlationId, user, config);
    } catch (error) {
      this._handleError(error);
    }
  }

  /**
   * Public POST method
   */
  async post(url, data, correlationId, user, config = {}) {
    try {
      return await this.breakers.post.fire(url, data, correlationId, user, config);
    } catch (error) {
      this._handleError(error);
    }
  }

  /**
   * Public PUT method
   */
  async put(url, data, correlationId, user, config = {}) {
    try {
      return await this.breakers.put.fire(url, data, correlationId, user, config);
    } catch (error) {
      this._handleError(error);
    }
  }

  /**
   * Public PATCH method
   */
  async patch(url, data, correlationId, user, config = {}) {
    try {
      return await this.breakers.patch.fire(url, data, correlationId, user, config);
    } catch (error) {
      this._handleError(error);
    }
  }

  /**
   * Public DELETE method
   */
  async delete(url, correlationId, user, config = {}) {
    try {
      return await this.breakers.delete.fire(url, correlationId, user, config);
    } catch (error) {
      this._handleError(error);
    }
  }

  /**
   * Health check
   */
  async healthCheck() {
    try {
      const response = await this.client.get('/health', { timeout: 2000 });
      return {
        healthy: response.status === 200,
        status: response.status,
        data: response.data,
      };
    } catch (error) {
      return {
        healthy: false,
        error: error.message,
      };
    }
  }

  /**
   * Handle errors
   */
  _handleError(error) {
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      throw new ServiceUnavailableError(this.serviceName);
    }
    if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
      throw new TimeoutError(this.serviceName);
    }
    throw error;
  }
}

/**
 * Create service clients for all configured services
 */
function createServiceClients() {
  const clients = {};

  // Auth Service
  if (config.services.auth) {
    clients.auth = new ServiceClient('auth-service', config.services.auth);
  }

  // Patient Service
  if (config.services.patient) {
    clients.patient = new ServiceClient('patient-service', config.services.patient);
  }

  // Doctor Service
  if (config.services.doctor) {
    clients.doctor = new ServiceClient('doctor-service', config.services.doctor);
  }

  // Appointment Service
  if (config.services.appointment) {
    clients.appointment = new ServiceClient('appointment-service', config.services.appointment);
  }

  // Notification Service
  if (config.services.notification) {
    clients.notification = new ServiceClient('notification-service', config.services.notification);
  }

  // Search Service
  if (config.services.search) {
    clients.search = new ServiceClient('search-service', config.services.search);
  }

  return clients;
}

// Export `ServiceClient` as the module default for backwards compatibility
module.exports = ServiceClient;
// Also expose the factory as a property
module.exports.createServiceClients = createServiceClients;
