/**
 * Form Validation Utilities
 */

export const validateField = (field: string, value: string): string | null => {
  switch (field) {
    case "email": {
      if (!value.trim()) return "Email is required";
      if (!isValidEmail(value)) return "Please enter a valid email address";
      return null;
    }
    case "password": {
      if (!value) return "Password is required";
      if (value.length < 6) return "Password must be at least 6 characters";
      return null;
    }
    case "phoneNumber": {
      const phoneRegex = /^\+?[\d\s\-()]{7,15}$/;
      if (!phoneRegex.test(value)) return "Please enter a valid phone number";
      return null;
    }
    default:
      return null;
  }
};

export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
};
