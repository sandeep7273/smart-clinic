/**
 * Error Handler Utility
 * Formats API errors into user-friendly messages
 */

/**
 * Extract user-friendly error message from API error response
 */
export const getErrorMessage = (error: any): string => {
  // Network errors
  if (error.message === 'Network Error') {
    return 'Unable to connect to the server. Please check your internet connection and try again.';
  }

  // Timeout errors
  if (error.code === 'ECONNABORTED') {
    return 'The request took too long to complete. Please try again.';
  }

  // API response errors
  if (error.response) {
    const { status, data } = error.response;

    // Extract error message from response (handles nested error structure)
    const errorMessage = data?.error?.message || data?.message;

    // Handle specific status codes
    switch (status) {
      case 400:
        return errorMessage || 'Invalid request. Please check your input and try again.';
      
      case 401:
        return 'Your session has expired. Please login again.';
      
      case 403:
        return 'You do not have permission to perform this action.';
      
      case 404:
        return errorMessage || 'The requested resource was not found.';
      
      case 409:
        return errorMessage || 'This action conflicts with existing data.';
      
      case 422:
        // Validation errors
        if (data?.errors && typeof data.errors === 'object') {
          const errorMessages = Object.values(data.errors).flat();
          return errorMessages.join('\n');
        }
        return errorMessage || 'Validation failed. Please check your input.';
      
      case 429:
        return 'Too many requests. Please wait a moment and try again.';
      
      case 500:
        return errorMessage || 'Server error occurred. Please try again later.';
      
      case 502:
      case 503:
      case 504:
        return 'Service temporarily unavailable. Please try again later.';
      
      default:
        return errorMessage || `An error occurred (${status}). Please try again.`;
    }
  }

  // Generic error
  return error.message || 'An unexpected error occurred. Please try again.';
};

/**
 * Get error title based on error type
 */
export const getErrorTitle = (error: any): string => {
  if (error.message === 'Network Error') {
    return 'Connection Error';
  }

  if (error.response) {
    const { status, data } = error.response;
    const errorCode = data?.error?.code || data?.code;
    
    // Handle specific error codes
    if (errorCode === 'SagaError') {
      return 'Booking Failed';
    }
    
    if (status === 401) {
      return 'Session Expired';
    }
    
    if (status === 403) {
      return 'Access Denied';
    }
    
    if (status === 404) {
      return 'Not Found';
    }
    
    if (status === 422) {
      return 'Validation Error';
    }
    
    if (status >= 500) {
      return 'Server Error';
    }
  }

  return 'Error';
};

/**
 * Format appointment booking errors specifically
 */
export const getBookingErrorMessage = (error: any): string => {
  // Extract message from nested error structure
  const message = error.response?.data?.error?.message || 
                  error.response?.data?.message || 
                  error.message;
  
  const errorCode = error.response?.data?.error?.code || error.response?.data?.code;

  // Handle SagaError specifically
  if (errorCode === 'SagaError') {
    // Check for specific booking-related errors
    if (message?.includes('Slot already booked')) {
      return 'The selected time slot is no longer available. Please choose another time slot.';
    }
    return message || 'Booking failed. Please try again.';
  }

  // Check for specific booking-related errors
  if (message?.toLowerCase().includes('slot') && message?.toLowerCase().includes('available')) {
    return 'The selected time slot is no longer available. Please choose another time.';
  }

  if (message?.toLowerCase().includes('slot already booked')) {
    return 'The selected time slot has already been booked. Please choose another time slot.';
  }

  if (message?.toLowerCase().includes('doctor') && message?.toLowerCase().includes('not found')) {
    return 'Doctor information not found. Please go back and select another doctor.';
  }

  if (message?.includes('Invalid or expired token')) {
    return 'Your session has expired. You will be redirected to login.';
  }

  // Default to generic error handler
  return getErrorMessage(error);
};
