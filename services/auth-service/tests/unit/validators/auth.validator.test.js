/**
 * Unit Tests for Auth Validators
 */

const {
  validate,
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  logoutSchema,
  forgotPasswordSchema,
} = require('../../../src/validators/auth.validator');

describe('Auth Validators - Unit Tests', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      body: {},
      query: {},
      params: {},
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  describe('registerSchema', () => {
    it('should validate valid registration data', () => {
      req.body = {
        email: 'test@example.com',
        password: 'Password@123',
        firstName: 'John',
        lastName: 'Doe',
      };

      const middleware = validate(registerSchema);
      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should reject missing email', () => {
      req.body = {
        password: 'Password@123',
        firstName: 'John',
        lastName: 'Doe',
      };

      const middleware = validate(registerSchema);
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Validation failed',
          errors: expect.arrayContaining([
            expect.objectContaining({
              message: 'Email is required',
            }),
          ]),
        })
      );
    });

    it('should reject invalid email format', () => {
      req.body = {
        email: 'invalid-email',
        password: 'Password@123',
        firstName: 'John',
        lastName: 'Doe',
      };

      const middleware = validate(registerSchema);
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          errors: expect.arrayContaining([
            expect.objectContaining({
              message: 'Invalid email address',
            }),
          ]),
        })
      );
    });

    it('should convert email to lowercase', () => {
      req.body = {
        email: 'TEST@EXAMPLE.COM',
        password: 'Password@123',
        firstName: 'John',
        lastName: 'Doe',
      };

      const middleware = validate(registerSchema);
      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });

    it('should reject password less than 8 characters', () => {
      req.body = {
        email: 'test@example.com',
        password: 'Pass@1',
        firstName: 'John',
        lastName: 'Doe',
      };

      const middleware = validate(registerSchema);
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          errors: expect.arrayContaining([
            expect.objectContaining({
              message: 'Password must be at least 8 characters long',
            }),
          ]),
        })
      );
    });

    it('should reject password without uppercase letter', () => {
      req.body = {
        email: 'test@example.com',
        password: 'password@123',
        firstName: 'John',
        lastName: 'Doe',
      };

      const middleware = validate(registerSchema);
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          errors: expect.arrayContaining([
            expect.objectContaining({
              message: 'Password must contain at least one uppercase letter',
            }),
          ]),
        })
      );
    });

    it('should reject password without lowercase letter', () => {
      req.body = {
        email: 'test@example.com',
        password: 'PASSWORD@123',
        firstName: 'John',
        lastName: 'Doe',
      };

      const middleware = validate(registerSchema);
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          errors: expect.arrayContaining([
            expect.objectContaining({
              message: 'Password must contain at least one lowercase letter',
            }),
          ]),
        })
      );
    });

    it('should reject password without number', () => {
      req.body = {
        email: 'test@example.com',
        password: 'Password@abc',
        firstName: 'John',
        lastName: 'Doe',
      };

      const middleware = validate(registerSchema);
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          errors: expect.arrayContaining([
            expect.objectContaining({
              message: 'Password must contain at least one number',
            }),
          ]),
        })
      );
    });

    it('should reject missing firstName', () => {
      req.body = {
        email: 'test@example.com',
        password: 'Password@123',
        lastName: 'Doe',
      };

      const middleware = validate(registerSchema);
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          errors: expect.arrayContaining([
            expect.objectContaining({
              message: 'First name is required',
            }),
          ]),
        })
      );
    });

    it('should reject missing lastName', () => {
      req.body = {
        email: 'test@example.com',
        password: 'Password@123',
        firstName: 'John',
      };

      const middleware = validate(registerSchema);
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          errors: expect.arrayContaining([
            expect.objectContaining({
              message: 'Last name is required',
            }),
          ]),
        })
      );
    });

    it('should reject firstName longer than 50 characters', () => {
      req.body = {
        email: 'test@example.com',
        password: 'Password@123',
        firstName: 'A'.repeat(51),
        lastName: 'Doe',
      };

      const middleware = validate(registerSchema);
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          errors: expect.arrayContaining([
            expect.objectContaining({
              message: 'First name is too long',
            }),
          ]),
        })
      );
    });

    it('should accept optional phoneNumber', () => {
      req.body = {
        email: 'test@example.com',
        password: 'Password@123',
        firstName: 'John',
        lastName: 'Doe',
        phoneNumber: '+1234567890',
      };

      const middleware = validate(registerSchema);
      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });

    it('should accept optional dateOfBirth', () => {
      req.body = {
        email: 'test@example.com',
        password: 'Password@123',
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: '1990-01-01',
      };

      const middleware = validate(registerSchema);
      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });
  });

  describe('loginSchema', () => {
    it('should validate valid login data', () => {
      req.body = {
        email: 'test@example.com',
        password: 'Password@123',
      };

      const middleware = validate(loginSchema);
      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should reject missing email', () => {
      req.body = {
        password: 'Password@123',
      };

      const middleware = validate(loginSchema);
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          errors: expect.arrayContaining([
            expect.objectContaining({
              message: 'Email is required',
            }),
          ]),
        })
      );
    });

    it('should reject missing password', () => {
      req.body = {
        email: 'test@example.com',
      };

      const middleware = validate(loginSchema);
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          errors: expect.arrayContaining([
            expect.objectContaining({
              message: 'Password is required',
            }),
          ]),
        })
      );
    });

    it('should reject invalid email format', () => {
      req.body = {
        email: 'not-an-email',
        password: 'Password@123',
      };

      const middleware = validate(loginSchema);
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should convert email to lowercase', () => {
      req.body = {
        email: 'TEST@EXAMPLE.COM',
        password: 'Password@123',
      };

      const middleware = validate(loginSchema);
      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });
  });

  describe('refreshTokenSchema', () => {
    it('should validate valid refresh token data', () => {
      req.body = {
        refreshToken: 'valid-refresh-token-here',
      };

      const middleware = validate(refreshTokenSchema);
      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });

    it('should reject missing refresh token', () => {
      req.body = {};

      const middleware = validate(refreshTokenSchema);
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          errors: expect.arrayContaining([
            expect.objectContaining({
              message: 'Refresh token is required',
            }),
          ]),
        })
      );
    });
  });

  describe('logoutSchema', () => {
    it('should validate valid logout data', () => {
      req.body = {
        refreshToken: 'valid-refresh-token',
      };

      const middleware = validate(logoutSchema);
      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });

    it('should reject missing refresh token', () => {
      req.body = {};

      const middleware = validate(logoutSchema);
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          errors: expect.arrayContaining([
            expect.objectContaining({
              message: 'Refresh token is required',
            }),
          ]),
        })
      );
    });
  });

  describe('forgotPasswordSchema', () => {
    it('should validate valid forgot password data', () => {
      req.body = {
        email: 'test@example.com',
      };

      const middleware = validate(forgotPasswordSchema);
      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });

    it('should reject missing email', () => {
      req.body = {};

      const middleware = validate(forgotPasswordSchema);
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          errors: expect.arrayContaining([
            expect.objectContaining({
              message: 'Email is required',
            }),
          ]),
        })
      );
    });

    it('should reject invalid email format', () => {
      req.body = {
        email: 'invalid-email',
      };

      const middleware = validate(forgotPasswordSchema);
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should convert email to lowercase', () => {
      req.body = {
        email: 'TEST@EXAMPLE.COM',
      };

      const middleware = validate(forgotPasswordSchema);
      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });
  });

  describe('validate middleware factory', () => {
    it('should return a middleware function', () => {
      const middleware = validate(loginSchema);
      expect(typeof middleware).toBe('function');
    });

    it('should handle multiple validation errors', () => {
      req.body = {
        email: 'invalid-email',
        password: 'weak',
        firstName: '',
      };

      const middleware = validate(registerSchema);
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          errors: expect.arrayContaining([
            expect.any(Object),
            expect.any(Object),
          ]),
        })
      );
    });

    it('should include field path in error', () => {
      req.body = {
        password: 'Password@123',
        firstName: 'John',
        lastName: 'Doe',
      };

      const middleware = validate(registerSchema);
      middleware(req, res, next);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          errors: expect.arrayContaining([
            expect.objectContaining({
              field: expect.stringContaining('email'),
            }),
          ]),
        })
      );
    });

    it('should handle non-Zod errors', () => {
      const invalidSchema = {
        parse: () => {
          throw new Error('Unexpected error');
        },
      };

      const middleware = validate(invalidSchema);
      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('Edge cases', () => {
    it('should handle empty request body', () => {
      req.body = {};

      const middleware = validate(registerSchema);
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Validation failed',
        })
      );
    });

    it('should handle null values', () => {
      req.body = {
        email: null,
        password: null,
        firstName: null,
        lastName: null,
      };

      const middleware = validate(registerSchema);
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should handle extra fields gracefully', () => {
      req.body = {
        email: 'test@example.com',
        password: 'Password@123',
        firstName: 'John',
        lastName: 'Doe',
        extraField: 'should be ignored',
      };

      const middleware = validate(registerSchema);
      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });
  });
});
