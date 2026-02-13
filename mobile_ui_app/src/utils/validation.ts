/**
 * Validation Utilities
 * Common validation functions for forms
 */

/**
 * Email validation
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Password validation
 * At least 8 characters, 1 uppercase, 1 lowercase, 1 number
 */
export const isValidPassword = (password: string): boolean => {
  return password.length >= 8;
};

/**
 * Strong password validation
 * At least 8 characters, 1 uppercase, 1 lowercase, 1 number, 1 special char
 */
export const isStrongPassword = (password: string): boolean => {
  const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  return strongPasswordRegex.test(password);
};

/**
 * Phone number validation (simple)
 */
export const isValidPhoneNumber = (phone: string): boolean => {
  const phoneRegex = /^\+?[\d\s-()]{10,}$/;
  return phoneRegex.test(phone);
};

/**
 * Get password strength
 */
export const getPasswordStrength = (password: string): {
  strength: 'weak' | 'medium' | 'strong';
  score: number;
} => {
  let score = 0;

  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[a-z]/.test(password)) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[@$!%*?&#]/.test(password)) score += 1;

  if (score <= 2) return { strength: 'weak', score };
  if (score <= 4) return { strength: 'medium', score };
  return { strength: 'strong', score };
};

/**
 * Validate form field
 */
export const validateField = (
  fieldName: string,
  value: string
): string | null => {
  switch (fieldName) {
    case 'email':
      if (!value) return 'Email is required';
      if (!isValidEmail(value)) return 'Invalid email format';
      return null;

    case 'password':
      if (!value) return 'Password is required';
      if (!isValidPassword(value)) return 'Password must be at least 8 characters';
      return null;

    case 'phoneNumber':
      if (!value) return null; // Phone number is optional
      if (!isValidPhoneNumber(value)) return 'Invalid phone number';
      return null;

    default:
      return null;
  }
};
