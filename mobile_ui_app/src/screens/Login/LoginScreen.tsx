import React, { useState, useEffect, useCallback } from 'react';
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
import { LoginScreenProps } from '../../navigation/types';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { loginUser } from '../../store/auth/authThunks';
import { clearError } from '../../store/auth/authSlice';
import { validateField } from '../../utils/validation';
import { useAuth } from '../../context/AuthContext';
import { useFocusEffect } from '@react-navigation/native';
import {
  isBiometricSupported,
  getBiometricName,
  isBiometricEnabled,
  authenticateWithBiometrics,
  saveBiometricCredentials,
} from '../../services/biometric.service';
import styles from './Login.styles';

export default function LoginScreen({ navigation }: LoginScreenProps) {
  const dispatch = useAppDispatch();
  const { loading, error, isAuthenticated } = useAppSelector(state => state.auth);
  const { checkAuth } = useAuth();

  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Biometric state
  const [biometricSupported, setBiometricSupported] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricName, setBiometricName] = useState('Biometric');
  const [biometricLoading, setBiometricLoading] = useState(false);
  const [shouldNavigate, setShouldNavigate] = useState(false);

  // Validation errors
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Check biometric availability on mount and when screen is focused
  useFocusEffect(
    useCallback(() => {
      checkBiometricAvailability();
      setShouldNavigate(false);
    }, [])
  );

  const checkBiometricAvailability = async () => {
    try {
      const supported = await isBiometricSupported();
      setBiometricSupported(supported);

      if (supported) {
        const enabled = await isBiometricEnabled();
        setBiometricEnabled(enabled);

        const name = await getBiometricName();
        setBiometricName(name);
      }
    } catch (error) {
      console.error('Error checking biometric availability:', error);
    }
  };

  // Clear errors when component unmounts
  useEffect(() => {
    return () => {
      dispatch(clearError());
    };
  }, [dispatch]);

  // Navigate on successful login only after biometric setup is handled
  useEffect(() => {
    if (isAuthenticated && shouldNavigate) {
      checkAuth();
      setShouldNavigate(false);
    }
  }, [isAuthenticated, shouldNavigate, checkAuth]);

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
      
      // Offer to enable biometric after successful login
      if (biometricSupported && !biometricEnabled) {
        offerBiometricSetup();
      } else {
        // No biometric setup needed, navigate immediately
        setShouldNavigate(true);
      }
    } catch (err) {
      // Error is handled by Redux state
      console.error('Login error:', err);
    }
  };

  // Offer to enable biometric login after successful password login
  const offerBiometricSetup = () => {
    setTimeout(() => {
      Alert.alert(
        `Enable ${biometricName} Login?`,
        `Would you like to use ${biometricName} to sign in faster next time?`,
        [
          {
            text: 'Not Now',
            style: 'cancel',
            onPress: () => setShouldNavigate(true),
          },
          {
            text: 'Enable',
            onPress: async () => {
              const success = await saveBiometricCredentials(email.trim(), password);
              
              if (success) {
                setBiometricEnabled(true);
                Alert.alert(
                  'Success',
                  `${biometricName} login has been enabled. You can now use it to sign in.`,
                  [
                    {
                      text: 'OK',
                      onPress: () => setShouldNavigate(true),
                    },
                  ]
                );
              } else {
                console.error('Failed to enable biometric login');
                Alert.alert(
                  'Error',
                  `Failed to enable ${biometricName} login. Please try again later.`,
                  [
                    {
                      text: 'OK',
                      onPress: () => setShouldNavigate(true),
                    },
                  ]
                );
              }
            },
          },
        ],
        { 
          cancelable: false,
          onDismiss: () => setShouldNavigate(true)
        }
      );
    }, 500);
  };

  // Handle biometric login
  const handleBiometricLogin = async () => {
    setBiometricLoading(true);
    dispatch(clearError());

    try {
      const credentials = await authenticateWithBiometrics();

      if (credentials) {
        // Login with retrieved credentials
        await dispatch(
          loginUser({
            email: credentials.email,
            password: credentials.password,
          })
        ).unwrap();
        
        // Navigate immediately after biometric login
        setShouldNavigate(true);
      }
    } catch (err) {
      console.error('Biometric login error:', err);
      Alert.alert(
        'Login Failed',
        'Could not sign in with biometrics. Please try using your password.'
      );
    } finally {
      setBiometricLoading(false);
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

            {/* Biometric Login Button */}
            {biometricSupported && biometricEnabled && (
              <TouchableOpacity
                style={[styles.biometricButton, biometricLoading && styles.buttonDisabled]}
                onPress={handleBiometricLogin}
                disabled={loading || biometricLoading}>
                {biometricLoading ? (
                  <ActivityIndicator color="#007AFF" />
                ) : (
                  <>
                    <Text style={styles.biometricIcon}>
                      {biometricName === 'Face ID' ? '👤' : '👆'}
                    </Text>
                    <Text style={styles.biometricButtonText}>
                      Sign in with {biometricName}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            )}

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
