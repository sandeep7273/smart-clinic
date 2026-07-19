/**
 * Authentication Validators
 * Input validation schemas using Zod
 */

const { z } = require('zod');

// Register schema
const registerSchema = z.object({
  body: z.object({
    email: z
      .string({
        required_error: 'Email is required',
      })
      .email('Invalid email address')
      .toLowerCase(),
    password: z
      .string({
        required_error: 'Password is required',
      })
      .min(8, 'Password must be at least 8 characters long')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number'),
    firstName: z
      .string({
        required_error: 'First name is required',
      })
      .min(1, 'First name cannot be empty')
      .max(50, 'First name is too long'),
    lastName: z
      .string({
        required_error: 'Last name is required',
      })
      .min(1, 'Last name cannot be empty')
      .max(50, 'Last name is too long'),
    phoneNumber: z.string().optional(),
    dateOfBirth: z.string().datetime().optional().or(z.string().optional()),
  }),
});

// Login schema
const loginSchema = z.object({
  body: z.object({
    email: z
      .string({
        required_error: 'Email is required',
      })
      .email('Invalid email address')
      .toLowerCase(),
    password: z.string({
      required_error: 'Password is required',
    }),
  }),
});

// Refresh token schema
const refreshTokenSchema = z.object({
  body: z.object({
    refreshToken: z.string({
      required_error: 'Refresh token is required',
    }),
  }),
});

// Logout schema
const logoutSchema = z.object({
  body: z.object({
    refreshToken: z.string({
      required_error: 'Refresh token is required',
    }),
  }),
});

// Forgot password schema
const forgotPasswordSchema = z.object({
  body: z.object({
    email: z
      .string({
        required_error: 'Email is required',
      })
      .email('Invalid email address')
      .toLowerCase(),
  }),
});

// Validation middleware factory
function validate(schema) {
  return (req, res, next) => {
    try {
      schema.parse({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }));

        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors,
        });
      }
      next(error);
    }
  };
}

module.exports = {
  validate,
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  logoutSchema,
  forgotPasswordSchema,
};
