/**
 * Application Configuration
 * Toggle between dummy and real API endpoints
 */

import { Platform } from 'react-native';

export const APP_CONFIG = {
  // Set to 'development' for API Gateway, 'production' for deployed API
  API_MODE: 'development' as 'development' | 'production',

  // API Gateway URLs
  // iOS Simulator: Use local network IP
  IOS_SIMULATOR_URL: 'http://192.168.1.101:3000/api',
  IOS_SIMULATOR_GRAPHQL_URL: 'http://192.168.1.101:3000/graphql',
  // Android Emulator / Physical Device: Use local network IP
  ANDROID_EMULATOR_URL: 'http://192.168.1.101:3000/api',
  ANDROID_EMULATOR_GRAPHQL_URL: 'http://192.168.1.101:3000/graphql',
  // Physical Device: Local network IP of machine running API Gateway
  PHYSICAL_DEVICE_URL: 'http://192.168.1.101:3000/api',
  PHYSICAL_DEVICE_GRAPHQL_URL: 'http://192.168.1.101:3000/graphql',

  // Direct Service URLs (deprecated - use API Gateway instead)
  // Doctor Service
  // DOCTOR_SERVICE_ANDROID_URL: 'http://10.0.2.2:4003/api',
  // DOCTOR_SERVICE_PHYSICAL_URL: 'http://192.168.1.100:4003/api', // UPDATE THIS!
  // Appointment Service
  // APPOINTMENT_SERVICE_IOS_URL: 'http://localhost:4004',
  // APPOINTMENT_SERVICE_ANDROID_URL: 'http://10.0.2.2:4004',
  // APPOINTMENT_SERVICE_PHYSICAL_URL: 'http://192.168.1.100:4004', // UPDATE THIS!

  // Production URL
  PRODUCTION_API_URL: 'http://3.104.74.129:3000/api',
  PRODUCTION_GRAPHQL_URL: 'http://3.104.74.129:3000/graphql',

  // Timeout settings (increased for debugging)
  API_TIMEOUT: 30000,

  // Feature flags
  ENABLE_BIOMETRICS: true,
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
    console.log(
      '[API Config] Platform: iOS, Using URL:',
      APP_CONFIG.IOS_SIMULATOR_URL,
    );
    return APP_CONFIG.IOS_SIMULATOR_URL;
  } else if (Platform.OS === 'android') {
    // Android Emulator needs special IP
    console.log(
      '[API Config] Platform: Android, Using URL:',
      APP_CONFIG.ANDROID_EMULATOR_URL,
    );
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
    console.log(
      '[GraphQL Config] Platform: iOS, Using URL:',
      APP_CONFIG.IOS_SIMULATOR_GRAPHQL_URL,
    );
    return APP_CONFIG.IOS_SIMULATOR_GRAPHQL_URL;
  } else if (Platform.OS === 'android') {
    console.log(
      '[GraphQL Config] Platform: Android, Using URL:',
      APP_CONFIG.ANDROID_EMULATOR_GRAPHQL_URL,
    );
    return APP_CONFIG.ANDROID_EMULATOR_GRAPHQL_URL;
  }

  // Fallback to localhost
  console.log('[GraphQL Config] Platform: Unknown, Using default URL');
  return APP_CONFIG.IOS_SIMULATOR_GRAPHQL_URL;
};

/**
 * Export the API configuration object with base URLs
 */
export const API_CONFIG = {
  BASE_URL: getApiBaseUrl(),
  API_GATEWAY_URL: getApiBaseUrl().replace('/api', ''), // Remove /api suffix
  GRAPHQL_URL: getApiGraphQLUrl(),
  TIMEOUT: APP_CONFIG.API_TIMEOUT,
};
