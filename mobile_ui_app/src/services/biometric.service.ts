/**
 * Biometric Authentication Service
 * Handles fingerprint, Face ID, and other biometric authentication
 */

import * as Keychain from 'react-native-keychain';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BIOMETRIC_CREDENTIALS_SERVICE = 'com.smartappointment.biometric';
const BIOMETRIC_ENABLED_KEY = '@biometric_enabled';

export type BiometryType = 
  | 'TouchID' 
  | 'FaceID' 
  | 'Fingerprint' 
  | 'Face' 
  | 'Iris' 
  | null;

/**
 * Check if device supports biometric authentication
 */
export const isBiometricSupported = async (): Promise<boolean> => {
  try {
    const biometryType = await Keychain.getSupportedBiometryType();
    return biometryType !== null;
  } catch (error) {
    console.error('Error checking biometric support:', error);
    return false;
  }
};

/**
 * Get the type of biometric authentication supported
 */
export const getBiometryType = async (): Promise<BiometryType> => {
  try {
    const biometryType = await Keychain.getSupportedBiometryType();
    return biometryType as BiometryType;
  } catch (error) {
    console.error('Error getting biometry type:', error);
    return null;
  }
};

/**
 * Get user-friendly biometric type name
 */
export const getBiometricName = async (): Promise<string> => {
  const type = await getBiometryType();
  
  switch (type) {
    case 'TouchID':
    case 'Fingerprint':
      return 'Fingerprint';
    case 'FaceID':
    case 'Face':
      return 'Face ID';
    case 'Iris':
      return 'Iris';
    default:
      return 'Biometric';
  }
};

/**
 * Save user credentials for biometric login
 */
export const saveBiometricCredentials = async (
  email: string,
  password: string
): Promise<boolean> => {
  try {
    const isSupported = await isBiometricSupported();
    
    if (!isSupported) {
      console.warn('Biometric authentication not supported on this device');
      return false;
    }

    // Save credentials with biometric protection
    await Keychain.setGenericPassword(email, password, {
      service: BIOMETRIC_CREDENTIALS_SERVICE,
      accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_ANY,
    });

    // Mark biometric as enabled
    await AsyncStorage.setItem(BIOMETRIC_ENABLED_KEY, 'true');

    console.log('✅ Biometric credentials saved');
    return true;
  } catch (error) {
    console.error('Error saving biometric credentials:', error);
    return false;
  }
};

/**
 * Authenticate with biometrics and get credentials
 */
export const authenticateWithBiometrics = async (
  promptMessage?: string
): Promise<{ email: string; password: string } | null> => {
  try {
    const isSupported = await isBiometricSupported();
    
    if (!isSupported) {
      console.warn('Biometric authentication not supported');
      return null;
    }

    const biometricName = await getBiometricName();
    const defaultMessage = `Use ${biometricName} to sign in`;

    // Attempt to retrieve credentials with biometric authentication
    const credentials = await Keychain.getGenericPassword({
      service: BIOMETRIC_CREDENTIALS_SERVICE,
      authenticationPrompt: {
        title: 'Authentication Required',
        subtitle: promptMessage || defaultMessage,
        cancel: 'Cancel',
      },
    });

    if (credentials) {
      return {
        email: credentials.username,
        password: credentials.password,
      };
    }

    return null;
  } catch (error: any) {
    // Handle specific error cases
    if (error.message?.includes('User canceled')) {
      console.log('User canceled biometric authentication');
      return null;
    }
    
    if (error.message?.includes('Authentication failed')) {
      console.warn('Biometric authentication failed');
      return null;
    }

    console.error('Error authenticating with biometrics:', error);
    return null;
  }
};

/**
 * Check if biometric login is enabled
 */
export const isBiometricEnabled = async (): Promise<boolean> => {
  try {
    const enabled = await AsyncStorage.getItem(BIOMETRIC_ENABLED_KEY);
    return enabled === 'true';
  } catch (error) {
    console.error('Error checking if biometric is enabled:', error);
    return false;
  }
};

/**
 * Disable biometric login and remove stored credentials
 */
export const disableBiometricLogin = async (): Promise<boolean> => {
  try {
    // Remove stored credentials
    await Keychain.resetGenericPassword({
      service: BIOMETRIC_CREDENTIALS_SERVICE,
    });

    // Mark as disabled
    await AsyncStorage.removeItem(BIOMETRIC_ENABLED_KEY);

    console.log('✅ Biometric login disabled');
    return true;
  } catch (error) {
    console.error('Error disabling biometric login:', error);
    return false;
  }
};

/**
 * Check if biometric credentials are stored
 */
export const hasBiometricCredentials = async (): Promise<boolean> => {
  try {
    const isEnabled = await isBiometricEnabled();
    if (!isEnabled) {
      return false;
    }

    // Check if credentials exist (without triggering biometric prompt)
    const hasCredentials = await Keychain.hasInternetCredentials(
      BIOMETRIC_CREDENTIALS_SERVICE
    );

    return hasCredentials;
  } catch (error) {
    console.error('Error checking biometric credentials:', error);
    return false;
  }
};
