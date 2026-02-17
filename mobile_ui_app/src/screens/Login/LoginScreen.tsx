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
} from 'react-native';
import { LoginScreenProps } from '../../navigation/types';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { loginUser } from '../../store/auth/authThunks';
import { clearError } from '../../store/auth/authSlice';
import { validateField } from '../../utils/validation';
import { useAuth } from '../../context/AuthContext';
import styles from './Login.styles';

export default function LoginScreen({ navigation }: LoginScreenProps) {
  const dispatch = useAppDispatch();
  const { loading, error, isAuthenticated } = useAppSelector(state => state.auth);
  const { checkAuth } = useAuth();

  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Validation errors
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Clear errors when component unmounts
  useEffect(() => {
    return () => {
      dispatch(clearError());
    };
  }, [dispatch]);

  // Navigate on successful login - trigger AuthContext to re-check auth
  useEffect(() => {
    if (isAuthenticated) {
      // Re-check auth in context to trigger navigation
      checkAuth();
    }
  }, [isAuthenticated]);

  // Validate form
  const validateForm = (): boolean => {
    let isValid = true;

    // Validate email
    const emailValidation = validateField('email', email);
    if (emailValidation) {
      setEmailError(emailValidation);
      isValid = false;
    } else {
      setEmailError(null);
    }

    // Validate password
    const passwordValidation = validateField('password', password);
    if (passwordValidation) {
      setPasswordError(passwordValidation);
      isValid = false;
    } else {
      setPasswordError(null);
    }

    return isValid;
  };

  // Handle login
  const handleLogin = async () => {
    // Clear previous errors
    dispatch(clearError());
    setEmailError(null);
    setPasswordError(null);

    // Validate form
    if (!validateForm()) {
      return;
    }

    // Dispatch login action
    try {
      await dispatch(loginUser({ email: email.trim(), password })).unwrap();
    } catch (err) {
      // Error is handled by Redux state
      console.error('Login error:', err);
    }
  };

  // Handle forgot password
  const handleForgotPassword = () => {
    navigation.navigate('ForgotPassword');
  };

  // Handle register navigation
  const handleRegister = () => {
    navigation.navigate('Register');
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
            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>Sign in to continue</Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {/* Email Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                placeholder="Enter your email"
                value={email}
                onChangeText={text => {
                  setEmail(text);
                  setEmailError(null);
                }}
                style={[styles.input, emailError && styles.inputError]}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
                editable={!loading}
              />
              {emailError && <Text style={styles.errorText}>{emailError}</Text>}
            </View>

            {/* Password Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  placeholder="Enter your password"
                  value={password}
                  onChangeText={text => {
                    setPassword(text);
                    setPasswordError(null);
                  }}
                  style={[
                    styles.input,
                    styles.passwordInput,
                    passwordError && styles.inputError,
                  ]}
                  secureTextEntry={!showPassword}
                  autoComplete="password"
                  editable={!loading}
                />
                <TouchableOpacity
                  style={styles.eyeIcon}
                  onPress={() => setShowPassword(!showPassword)}>
                  <Text style={styles.eyeText}>{showPassword ? '👁️' : '👁️‍🗨️'}</Text>
                </TouchableOpacity>
              </View>
              {passwordError && (
                <Text style={styles.errorText}>{passwordError}</Text>
              )}
            </View>

            {/* Global Error */}
            {error && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorMessage}>⚠️ {error}</Text>
              </View>
            )}

            {/* Forgot Password */}
            <TouchableOpacity
              onPress={handleForgotPassword}
              disabled={loading}
              style={styles.forgotPassword}>
              <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
            </TouchableOpacity>

            {/* Login Button */}
            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleLogin}
              disabled={loading}>
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Sign In</Text>
              )}
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Register Link */}
            <TouchableOpacity
              onPress={handleRegister}
              disabled={loading}
              style={styles.registerContainer}>
              <Text style={styles.registerText}>
                Don't have an account?{' '}
                <Text style={styles.registerLink}>Sign Up</Text>
              </Text>
            </TouchableOpacity>
            
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
