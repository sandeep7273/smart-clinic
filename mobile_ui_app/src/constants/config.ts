/**
 * Application Configuration
 * Toggle between dummy and real API endpoints
 */

import { Platform } from 'react-native';

export const APP_CONFIG = {
  // Set to 'development' for API Gateway, 'production' for deployed API
  API_MODE: 'development' as 'development' | 'production',
  
  // API Gateway URLs
  // iOS Simulator: Use localhost
  IOS_SIMULATOR_URL: 'http://localhost:3000/api',
  IOS_SIMULATOR_GRAPHQL_URL: 'http://localhost:3000/graphql',
  // Android Emulator: Use 10.0.2.2 (special alias to host machine)
  ANDROID_EMULATOR_URL: 'http://10.0.2.2:3000/api',
  ANDROID_EMULATOR_GRAPHQL_URL: 'http://10.0.2.2:3000/graphql',
  // Physical Device: Use your computer's local IP (update this!)
  // Find your IP: macOS: ifconfig | grep "inet " | grep -v 127.0.0.1
  PHYSICAL_DEVICE_URL: 'http://192.168.1.100:3000/api', // UPDATE THIS!
  PHYSICAL_DEVICE_GRAPHQL_URL: 'http://192.168.1.100:3000/graphql', // UPDATE THIS!
  
  // Direct Service URLs (deprecated - use API Gateway instead)
  // Doctor Service
  DOCTOR_SERVICE_IOS_URL: 'http://localhost:4003/api',
  DOCTOR_SERVICE_ANDROID_URL: 'http://10.0.2.2:4003/api',
  DOCTOR_SERVICE_PHYSICAL_URL: 'http://192.168.1.100:4003/api', // UPDATE THIS!
  // Appointment Service
  APPOINTMENT_SERVICE_IOS_URL: 'http://localhost:4004',
  APPOINTMENT_SERVICE_ANDROID_URL: 'http://10.0.2.2:4004',
  APPOINTMENT_SERVICE_PHYSICAL_URL: 'http://192.168.1.100:4004', // UPDATE THIS!
  
  // Production URL
  PRODUCTION_API_URL: 'https://api.smartappointment.com/api',
  PRODUCTION_GRAPHQL_URL: 'https://api.smartappointment.com/graphql',
  
  // Timeout settings (increased for debugging)
  API_TIMEOUT: 30000,
  
  // Feature flags
  ENABLE_BIOMETRICS: false,
  ENABLE_AI_SEARCH: true,
};

/**
 * Get the active API base URL based on current mode and platform
 * 
 * IMPORTANT: If testing on a physical device, update PHYSICAL_DEVICE_URL above
 * with your computer's local IP address
 */
export const getApiBaseUrl = (): string => {
  if (APP_CONFIG.API_MODE === 'production') {
    return APP_CONFIG.PRODUCTION_API_URL;
  }
  
  // Development mode - choose URL based on platform
  if (Platform.OS === 'ios') {
    // iOS Simulator can use localhost
    console.log('[API Config] Platform: iOS, Using URL:', APP_CONFIG.IOS_SIMULATOR_URL);
    return APP_CONFIG.IOS_SIMULATOR_URL;
  } else if (Platform.OS === 'android') {
    // Android Emulator needs special IP
    console.log('[API Config] Platform: Android, Using URL:', APP_CONFIG.ANDROID_EMULATOR_URL);
    return APP_CONFIG.ANDROID_EMULATOR_URL;
  }
  
  // Fallback to localhost
  console.log('[API Config] Platform: Unknown, Using default URL');
  return APP_CONFIG.IOS_SIMULATOR_URL;
};

/**
 * Get the API Gateway GraphQL endpoint
 * 
 * IMPORTANT: All GraphQL queries should go through API Gateway
 */
export const getApiGraphQLUrl = (): string => {
  if (APP_CONFIG.API_MODE === 'production') {
    return APP_CONFIG.PRODUCTION_GRAPHQL_URL;
  }
  
  // Development mode - choose URL based on platform
  if (Platform.OS === 'ios') {
    console.log('[GraphQL Config] Platform: iOS, Using URL:', APP_CONFIG.IOS_SIMULATOR_GRAPHQL_URL);
    return APP_CONFIG.IOS_SIMULATOR_GRAPHQL_URL;
  } else if (Platform.OS === 'android') {
    console.log('[GraphQL Config] Platform: Android, Using URL:', APP_CONFIG.ANDROID_EMULATOR_GRAPHQL_URL);
    return APP_CONFIG.ANDROID_EMULATOR_GRAPHQL_URL;
  }
  
  // Fallback to localhost
  console.log('[GraphQL Config] Platform: Unknown, Using default URL');
  return APP_CONFIG.IOS_SIMULATOR_GRAPHQL_URL;
};

/**
 * Get the Doctor Service URL (direct connection, bypassing API Gateway)
 * @deprecated Use GraphQL through API Gateway instead (getApiGraphQLUrl)
 * This function is kept for backward compatibility only
 */
export const getDoctorServiceUrl = (): string => {
  if (APP_CONFIG.API_MODE === 'production') {
    return APP_CONFIG.PRODUCTION_API_URL;
  }
  
  // Development mode - choose URL based on platform
  if (Platform.OS === 'ios') {
    console.log('[Doctor Service] Platform: iOS, Using URL:', APP_CONFIG.DOCTOR_SERVICE_IOS_URL);
    return APP_CONFIG.DOCTOR_SERVICE_IOS_URL;
  } else if (Platform.OS === 'android') {
    console.log('[Doctor Service] Platform: Android, Using URL:', APP_CONFIG.DOCTOR_SERVICE_ANDROID_URL);
    return APP_CONFIG.DOCTOR_SERVICE_ANDROID_URL;
  }
  
  // Fallback to localhost
  console.log('[Doctor Service] Platform: Unknown, Using default URL');
  return APP_CONFIG.DOCTOR_SERVICE_IOS_URL;
};

/**
 * Get the Appointment Service URL (direct connection, bypassing API Gateway)
 */
export const getAppointmentServiceUrl = (): string => {
  if (APP_CONFIG.API_MODE === 'production') {
    return APP_CONFIG.PRODUCTION_API_URL;
  }
  
  // Development mode - choose URL based on platform
  if (Platform.OS === 'ios') {
    console.log('[Appointment Service] Platform: iOS, Using URL:', APP_CONFIG.APPOINTMENT_SERVICE_IOS_URL);
    return APP_CONFIG.APPOINTMENT_SERVICE_IOS_URL;
  } else if (Platform.OS === 'android') {
    console.log('[Appointment Service] Platform: Android, Using URL:', APP_CONFIG.APPOINTMENT_SERVICE_ANDROID_URL);
    return APP_CONFIG.APPOINTMENT_SERVICE_ANDROID_URL;
  }
  
  // Fallback to localhost
  console.log('[Appointment Service] Platform: Unknown, Using default URL');
  return APP_CONFIG.APPOINTMENT_SERVICE_IOS_URL;
};

/**
 * Export the API configuration object with base URLs
 */
export const API_CONFIG = {
  BASE_URL: getApiBaseUrl(),
  API_GATEWAY_URL: getApiBaseUrl().replace('/api', ''), // Remove /api suffix
  GRAPHQL_URL: getApiGraphQLUrl(),
  DOCTOR_SERVICE_URL: getDoctorServiceUrl(),
  APPOINTMENT_SERVICE_URL: getAppointmentServiceUrl(),
  TIMEOUT: APP_CONFIG.API_TIMEOUT,
};
