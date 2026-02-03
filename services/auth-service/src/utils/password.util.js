/**
 * Password Utility Functions
 * Password hashing and verification using bcrypt
 */

const bcrypt = require('bcrypt');
const logger = require('./logger.util');

// Number of salt rounds for bcrypt
const SALT_ROUNDS = 12;

/**
 * Hash a password
 */
async function hashPassword(password) {
  try {
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    return hashedPassword;
  } catch (error) {
    logger.error('Error hashing password:', error);
    throw new Error('Failed to hash password');
  }
}

/**
 * Verify password against hash
 */
async function verifyPassword(password, hashedPassword) {
  try {
    const isMatch = await bcrypt.compare(password, hashedPassword);
    return isMatch;
  } catch (error) {
    logger.error('Error verifying password:', error);
    throw new Error('Failed to verify password');
  }
}

/**
 * Validate password strength
 * Minimum 8 characters, at least one uppercase, one lowercase, one number
 */
function validatePasswordStrength(password) {
  const minLength = 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  const errors = [];

  if (password.length < minLength) {
    errors.push(`Password must be at least ${minLength} characters long`);
  }
  if (!hasUpperCase) {
    errors.push('Password must contain at least one uppercase letter');
  }
  if (!hasLowerCase) {
    errors.push('Password must contain at least one lowercase letter');
  }
  if (!hasNumber) {
    errors.push('Password must contain at least one number');
  }

  return {
    valid: errors.length === 0,
    errors,
    score: [hasUpperCase, hasLowerCase, hasNumber, hasSpecialChar].filter(Boolean).length,
  };
}

module.exports = {
  hashPassword,
  verifyPassword,
  validatePasswordStrength,
};
