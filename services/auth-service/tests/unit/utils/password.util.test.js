/**
 * Unit Tests for Password Utility
 */

const { hashPassword, verifyPassword, validatePasswordStrength } = require('../../../src/utils/password.util');

describe('Password Utility - Unit Tests', () => {
  describe('hashPassword', () => {
    it('should hash a password', async () => {
      const password = 'TestPassword@123';
      const hashedPassword = await hashPassword(password);

      expect(hashedPassword).toBeDefined();
      expect(hashedPassword).not.toBe(password);
      expect(typeof hashedPassword).toBe('string');
    });

    it('should produce different hashes for same password', async () => {
      const password = 'SamePassword@123';
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);

      expect(hash1).not.toBe(hash2); // bcrypt adds salt
    });

    it('should produce bcrypt format hash', async () => {
      const password = 'BcryptFormat@123';
      const hashedPassword = await hashPassword(password);

      // Bcrypt hash starts with $2a$, $2b$, or $2y$ and is 60 characters
      expect(hashedPassword).toMatch(/^\$2[ayb]\$.{56}$/);
    });

    it('should handle empty string', async () => {
      const hashedPassword = await hashPassword('');
      expect(hashedPassword).toBeDefined();
    });

    it('should handle long passwords', async () => {
      const longPassword = 'a'.repeat(100);
      const hashedPassword = await hashPassword(longPassword);
      expect(hashedPassword).toBeDefined();
    });
  });

  describe('verifyPassword', () => {
    const testPassword = 'VerifyTest@123';
    let hashedPassword;

    beforeAll(async () => {
      hashedPassword = await hashPassword(testPassword);
    });

    it('should verify correct password', async () => {
      const isValid = await verifyPassword(testPassword, hashedPassword);
      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const isValid = await verifyPassword('WrongPassword', hashedPassword);
      expect(isValid).toBe(false);
    });

    it('should be case-sensitive', async () => {
      const isValid = await verifyPassword('verifytest@123', hashedPassword);
      expect(isValid).toBe(false);
    });

    it('should handle empty password', async () => {
      const isValid = await verifyPassword('', hashedPassword);
      expect(isValid).toBe(false);
    });

    it('should handle special characters', async () => {
      const specialPassword = '!@#$%^&*()_+-={}[]|\\:";\'<>?,./';
      const hash = await hashPassword(specialPassword);
      const isValid = await verifyPassword(specialPassword, hash);
      expect(isValid).toBe(true);
    });
  });

  describe('validatePasswordStrength', () => {
    it('should accept strong password', () => {
      const result = validatePasswordStrength('StrongPass@123');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject password less than 8 characters', () => {
      const result = validatePasswordStrength('Short1!');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must be at least 8 characters long');
    });

    it('should reject password without uppercase', () => {
      const result = validatePasswordStrength('lowercase123!');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one uppercase letter');
    });

    it('should reject password without lowercase', () => {
      const result = validatePasswordStrength('UPPERCASE123!');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one lowercase letter');
    });

    it('should reject password without number', () => {
      const result = validatePasswordStrength('NoNumbers!@#');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one number');
    });

    it('should return multiple errors for weak password', () => {
      const result = validatePasswordStrength('weak');
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
    });

    it('should accept password with all requirements', () => {
      const strongPasswords = [
        'Test@123456',
        'MyP@ssw0rd',
        'Secure#2024',
        'C0mpl3x!Pass',
      ];

      strongPasswords.forEach(password => {
        const result = validatePasswordStrength(password);
        expect(result.valid).toBe(true);
      });
    });
  });
});
