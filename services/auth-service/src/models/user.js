/**
 * User Model
 * MongoDB schema for user authentication and profile
 */

const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const userSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      default: () => uuidv4(),
      unique: true,
      required: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters long'],
      select: false, // Don't include password in queries by default
    },
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true,
    },
    lastName: {
      type: String,
      required: [true, 'Last name is required'],
      trim: true,
    },
    phoneNumber: {
      type: String,
      trim: true,
    },
    dateOfBirth: {
      type: Date,
    },
    profilePicture: {
      type: String,
    },
    role: {
      type: String,
      enum: ['patient', 'doctor', 'admin'],
      default: 'patient',
    },
    tenantId: {
      type: String,
      default: 'tenant-001',
      required: true,
    },
    refreshTokens: [
      {
        token: {
          type: String,
          required: true,
        },
        deviceInfo: {
          type: String,
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
        expiresAt: {
          type: Date,
          required: true,
        },
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    lastLogin: {
      type: Date,
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt automatically
  }
);

// Indexes for performance
userSchema.index({ email: 1 });
userSchema.index({ id: 1 });
userSchema.index({ role: 1 });
userSchema.index({ 'refreshTokens.token': 1 });

// Virtual for full name
userSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`;
});

// Method to add refresh token
userSchema.methods.addRefreshToken = function (token, expiresAt, deviceInfo = '') {
  this.refreshTokens.push({
    token,
    deviceInfo,
    expiresAt,
  });

  // Keep only last 5 refresh tokens per user
  if (this.refreshTokens.length > 5) {
    this.refreshTokens = this.refreshTokens.slice(-5);
  }
};

// Method to remove refresh token
userSchema.methods.removeRefreshToken = function (token) {
  this.refreshTokens = this.refreshTokens.filter((rt) => rt.token !== token);
};

// Method to check if refresh token is valid
userSchema.methods.hasValidRefreshToken = function (token) {
  const refreshToken = this.refreshTokens.find((rt) => rt.token === token);
  if (!refreshToken) {
    return false;
  }
  return new Date() < refreshToken.expiresAt;
};

// Method to clean expired refresh tokens
userSchema.methods.cleanExpiredTokens = function () {
  const now = new Date();
  this.refreshTokens = this.refreshTokens.filter((rt) => rt.expiresAt > now);
};

// Method to get user public profile (without sensitive data)
userSchema.methods.toPublicJSON = function () {
  return {
    id: this.id,
    email: this.email,
    firstName: this.firstName,
    lastName: this.lastName,
    phoneNumber: this.phoneNumber,
    dateOfBirth: this.dateOfBirth,
    profilePicture: this.profilePicture,
    role: this.role,
    tenantId: this.tenantId,
    isEmailVerified: this.isEmailVerified,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

// Ensure virtuals are included in JSON
userSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    delete ret._id;
    delete ret.__v;
    delete ret.password;
    delete ret.refreshTokens;
    return ret;
  },
});

const User = mongoose.model('User', userSchema);

module.exports = User;
