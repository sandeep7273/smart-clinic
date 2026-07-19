import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { RegisterScreenProps } from '../../navigation/types';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { registerUser } from '../../store/auth/authThunks';
import { clearError } from '../../store/auth/authSlice';
import { validateField, isValidEmail } from '../../utils/validation';
import { useAuth } from '../../context/AuthContext';
import styles from './Register.styles';

export default function RegisterScreen({ navigation }: RegisterScreenProps) {
  const dispatch = useAppDispatch();
  const { loading, error, isAuthenticated } = useAppSelector(state => state.auth);
  const { checkAuth } = useAuth();

  // Form state
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    password: '',
    confirmPassword: '',
    dateOfBirth: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string | null>>({});

  // Clear errors on unmount
  useEffect(() => {
    return () => {
      dispatch(clearError());
    };
  }, [dispatch]);

  // Navigate to DoctorList on successful registration - trigger AuthContext to re-check auth
  useEffect(() => {
    if (isAuthenticated) {
      // Re-check auth in context to trigger navigation to DoctorList
      checkAuth();
    }
  }, [isAuthenticated]);

  // Update form field
  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field
    setErrors(prev => ({ ...prev, [field]: null }));
  };

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: Record<string, string | null> = {};
    let isValid = true;

    // First name
    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
      isValid = false;
    }

    // Last name
    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
      isValid = false;
    }

    // Email
    const emailError = validateField('email', formData.email);
    if (emailError) {
      newErrors.email = emailError;
      isValid = false;
    }

    // Phone number (optional but validate format if provided)
    if (formData.phoneNumber) {
      const phoneError = validateField('phoneNumber', formData.phoneNumber);
      if (phoneError) {
        newErrors.phoneNumber = phoneError;
        isValid = false;
      }
    }

    // Password
    const passwordError = validateField('password', formData.password);
    if (passwordError) {
      newErrors.password = passwordError;
      isValid = false;
    }

    // Confirm password
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
      isValid = false;
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
      isValid = false;
    }

    // Date of birth (optional but validate format if provided)
    if (formData.dateOfBirth && !/^\d{4}-\d{2}-\d{2}$/.test(formData.dateOfBirth)) {
      newErrors.dateOfBirth = 'Date format should be YYYY-MM-DD';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  // Handle registration
  const handleRegister = async () => {
    dispatch(clearError());

    if (!validateForm()) {
      return;
    }

    try {
      const registrationData = {
        email: formData.email.trim(),
        password: formData.password,
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        role: 'patient' as const,
        ...(formData.phoneNumber && { phoneNumber: formData.phoneNumber.trim() }),
        ...(formData.dateOfBirth && { dateOfBirth: formData.dateOfBirth }),
      };

      console.log('Sending registration data:', { ...registrationData, password: '***' });
      await dispatch(registerUser(registrationData)).unwrap();
      console.log('Registration successful!');
    } catch (err: any) {
      console.error('Registration error:', err);
      // Error will be displayed in UI via Redux state
    }
  };

  // Navigate to login
  const handleLoginNavigation = () => {
    navigation.navigate('Login');
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled">
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Sign up to get started</Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {/* First Name */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>First Name *</Text>
              <TextInput
                placeholder="Enter your first name"
                value={formData.firstName}
                onChangeText={text => updateField('firstName', text)}
                style={[styles.input, errors.firstName && styles.inputError]}
                autoCapitalize="words"
                editable={!loading}
              />
              {errors.firstName && (
                <Text style={styles.errorText}>{errors.firstName}</Text>
              )}
            </View>

            {/* Last Name */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Last Name *</Text>
              <TextInput
                placeholder="Enter your last name"
                value={formData.lastName}
                onChangeText={text => updateField('lastName', text)}
                style={[styles.input, errors.lastName && styles.inputError]}
                autoCapitalize="words"
                editable={!loading}
              />
              {errors.lastName && (
                <Text style={styles.errorText}>{errors.lastName}</Text>
              )}
            </View>

            {/* Email */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Email *</Text>
              <TextInput
                placeholder="Enter your email"
                value={formData.email}
                onChangeText={text => updateField('email', text)}
                style={[styles.input, errors.email && styles.inputError]}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
                editable={!loading}
              />
              {errors.email && (
                <Text style={styles.errorText}>{errors.email}</Text>
              )}
            </View>

            {/* Phone Number */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Phone Number (Optional)</Text>
              <TextInput
                placeholder="+1234567890"
                value={formData.phoneNumber}
                onChangeText={text => updateField('phoneNumber', text)}
                style={[styles.input, errors.phoneNumber && styles.inputError]}
                keyboardType="phone-pad"
                autoComplete="tel"
                editable={!loading}
              />
              {errors.phoneNumber && (
                <Text style={styles.errorText}>{errors.phoneNumber}</Text>
              )}
            </View>

            {/* Date of Birth */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Date of Birth (Optional)</Text>
              <TextInput
                placeholder="YYYY-MM-DD"
                value={formData.dateOfBirth}
                onChangeText={text => updateField('dateOfBirth', text)}
                style={[styles.input, errors.dateOfBirth && styles.inputError]}
                editable={!loading}
              />
              {errors.dateOfBirth && (
                <Text style={styles.errorText}>{errors.dateOfBirth}</Text>
              )}
            </View>

            {/* Password */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Password *</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  placeholder="Enter your password"
                  value={formData.password}
                  onChangeText={text => updateField('password', text)}
                  style={[
                    styles.input,
                    styles.passwordInput,
                    errors.password && styles.inputError,
                  ]}
                  secureTextEntry={!showPassword}
                  autoComplete="password"
                  editable={!loading}
                />
                <TouchableOpacity
                  style={styles.eyeIcon}
                  onPress={() => setShowPassword(!showPassword)}>
                  <Text style={styles.eyeText}>
                    {showPassword ? '👁️' : '👁️‍🗨️'}
                  </Text>
                </TouchableOpacity>
              </View>
              {errors.password && (
                <Text style={styles.errorText}>{errors.password}</Text>
              )}
            </View>

            {/* Confirm Password */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Confirm Password *</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  placeholder="Confirm your password"
                  value={formData.confirmPassword}
                  onChangeText={text => updateField('confirmPassword', text)}
                  style={[
                    styles.input,
                    styles.passwordInput,
                    errors.confirmPassword && styles.inputError,
                  ]}
                  secureTextEntry={!showConfirmPassword}
                  editable={!loading}
                />
                <TouchableOpacity
                  style={styles.eyeIcon}
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                  <Text style={styles.eyeText}>
                    {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
                  </Text>
                </TouchableOpacity>
              </View>
              {errors.confirmPassword && (
                <Text style={styles.errorText}>{errors.confirmPassword}</Text>
              )}
            </View>

            {/* Global Error */}
            {error && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorMessage}>⚠️ {error}</Text>
              </View>
            )}

            {/* Register Button */}
            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleRegister}
              disabled={loading}>
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Sign Up</Text>
              )}
            </TouchableOpacity>

            {/* Login Link */}
            <TouchableOpacity
              onPress={handleLoginNavigation}
              disabled={loading}
              style={styles.loginContainer}>
              <Text style={styles.loginText}>
                Already have an account?{' '}
                <Text style={styles.loginLink}>Sign In</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
