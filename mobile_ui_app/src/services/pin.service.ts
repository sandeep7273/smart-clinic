/**
 * PIN Authentication Service
 * Stores a local PIN fallback for biometric login.
 */

import * as Keychain from 'react-native-keychain';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PIN_CREDENTIALS_SERVICE = 'com.smartappointment.pin';
const PIN_ENABLED_KEY = '@pin_enabled';
const PIN_EMAIL_KEY = '@pin_email';
const PIN_HASH_KEY = '@pin_hash';
const PIN_SALT_KEY = '@pin_salt';

const createSalt = (): string => {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

const hashPin = (pin: string, salt: string): string => {
  let hash = 0;
  const value = `${salt}:${pin}`;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }

  return `${hash}`;
};

export const isPinValid = (pin: string): boolean => /^\d{4,6}$/.test(pin);

export const savePinCredentials = async (
  email: string,
  password: string,
  pin: string,
): Promise<boolean> => {
  try {
    if (!isPinValid(pin)) {
      return false;
    }

    await Keychain.setGenericPassword(email, password, {
      service: PIN_CREDENTIALS_SERVICE,
      accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });

    const salt = createSalt();
    await AsyncStorage.multiSet([
      [PIN_ENABLED_KEY, 'true'],
      [PIN_EMAIL_KEY, email],
      [PIN_SALT_KEY, salt],
      [PIN_HASH_KEY, hashPin(pin, salt)],
    ]);

    return true;
  } catch (error) {
    console.error('Error saving PIN credentials:', error);
    return false;
  }
};

export const isPinEnabled = async (email?: string): Promise<boolean> => {
  try {
    const enabled = await AsyncStorage.getItem(PIN_ENABLED_KEY);

    if (enabled !== 'true') {
      return false;
    }

    if (email) {
      const storedEmail = await AsyncStorage.getItem(PIN_EMAIL_KEY);
      return storedEmail === email;
    }

    return true;
  } catch (error) {
    console.error('Error checking PIN status:', error);
    return false;
  }
};

export const getPinEmail = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem(PIN_EMAIL_KEY);
  } catch (error) {
    console.error('Error getting PIN email:', error);
    return null;
  }
};

export const authenticateWithPin = async (
  pin: string,
  email?: string,
): Promise<{ email: string; password: string } | null> => {
  try {
    if (!isPinValid(pin)) {
      return null;
    }

    const [enabled, storedEmail, salt, storedHash] =
      await AsyncStorage.multiGet([
        PIN_ENABLED_KEY,
        PIN_EMAIL_KEY,
        PIN_SALT_KEY,
        PIN_HASH_KEY,
      ]);

    if (
      enabled[1] !== 'true' ||
      !storedEmail[1] ||
      !salt[1] ||
      !storedHash[1]
    ) {
      return null;
    }

    if (email && storedEmail[1] !== email) {
      return null;
    }

    if (hashPin(pin, salt[1]) !== storedHash[1]) {
      return null;
    }

    const credentials = await Keychain.getGenericPassword({
      service: PIN_CREDENTIALS_SERVICE,
    });

    if (!credentials || credentials.username !== storedEmail[1]) {
      return null;
    }

    return {
      email: credentials.username,
      password: credentials.password,
    };
  } catch (error) {
    console.error('Error authenticating with PIN:', error);
    return null;
  }
};

export const disablePinLogin = async (): Promise<boolean> => {
  try {
    await Keychain.resetGenericPassword({ service: PIN_CREDENTIALS_SERVICE });
    await AsyncStorage.multiRemove([
      PIN_ENABLED_KEY,
      PIN_EMAIL_KEY,
      PIN_HASH_KEY,
      PIN_SALT_KEY,
    ]);
    return true;
  } catch (error) {
    console.error('Error disabling PIN login:', error);
    return false;
  }
};
