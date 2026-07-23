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
  getBiometricEmail,
} from '../../services/biometric.service';
import {
  authenticateWithPin,
  getPinEmail,
  isPinEnabled,
  isPinValid,
  savePinCredentials,
} from '../../services/pin.service';
import styles from './Login.styles';

export default function LoginScreen({ navigation }: LoginScreenProps) {
  const dispatch = useAppDispatch();
  const { loading, error, isAuthenticated } = useAppSelector(
    state => state.auth,
  );
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
  const [pinEnabled, setPinEnabled] = useState(false);
  const [pinLoading, setPinLoading] = useState(false);
  const [showPinLogin, setShowPinLogin] = useState(false);
  const [pin, setPin] = useState('');
  const [pinSetupVisible, setPinSetupVisible] = useState(false);
  const [setupPin, setSetupPin] = useState('');
  const [confirmSetupPin, setConfirmSetupPin] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [shouldNavigate, setShouldNavigate] = useState(false);

  // Validation errors
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Check biometric availability on mount and when screen is focused
  useFocusEffect(
    useCallback(() => {
      checkBiometricAvailability();
      checkPinAvailability();
      setShouldNavigate(false);
    }, []),
  );

  // Re-check biometric availability when email changes
  useEffect(() => {
    if (email.trim()) {
      checkBiometricAvailability();
      checkPinAvailability();
    } else {
      // Reset biometric enabled state if no email
      setBiometricEnabled(false);
      checkPinAvailability();
    }
  }, [email]);

  const checkBiometricAvailability = async () => {
    try {
      const supported = await isBiometricSupported();
      setBiometricSupported(supported);

      if (supported) {
        // Check if biometric is enabled for the current email
        const currentEmail = email.trim();
        const enabled = currentEmail
          ? await isBiometricEnabled(currentEmail)
          : await isBiometricEnabled();

        setBiometricEnabled(enabled);

        const name = await getBiometricName();
        setBiometricName(name);

        // Log for debugging
        if (currentEmail) {
          const storedEmail = await getBiometricEmail();
          console.log('🔍 Biometric check for:', currentEmail);
          console.log('🔍 Stored email:', storedEmail);
          console.log('🔍 Enabled:', enabled);
        }
      }
    } catch (error) {
      console.error('Error checking biometric availability:', error);
    }
  };

  const checkPinAvailability = async () => {
    try {
      const currentEmail = email.trim();
      const enabled = currentEmail
        ? await isPinEnabled(currentEmail)
        : await isPinEnabled();
      setPinEnabled(enabled);

      if (!currentEmail && enabled) {
        const storedEmail = await getPinEmail();
        if (storedEmail) {
          setEmail(storedEmail);
        }
      }
    } catch (error) {
      console.error('Error checking PIN availability:', error);
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

      // Re-check if biometric and PIN are enabled for THIS specific user
      const isEnabledForThisUser = await isBiometricEnabled(email.trim());
      const isPinEnabledForThisUser = await isPinEnabled(email.trim());
      const completeLoginSetup = () => {
        if (!isPinEnabledForThisUser) {
          setPinSetupVisible(true);
        } else {
          setShouldNavigate(true);
        }
      };

      // Offer to enable biometric if not enabled for this user
      if (biometricSupported && !isEnabledForThisUser) {
        offerBiometricSetup(completeLoginSetup);
      } else {
        completeLoginSetup();
      }
    } catch (err) {
      // Error is handled by Redux state
      console.error('Login error:', err);
    }
  };

  // Offer to enable biometric login after successful password login
  const offerBiometricSetup = (onComplete: () => void) => {
    setTimeout(() => {
      Alert.alert(
        `Enable ${biometricName} Login?`,
        `Would you like to use ${biometricName} to sign in faster next time?`,
        [
          {
            text: 'Not Now',
            style: 'cancel',
            onPress: onComplete,
          },
          {
            text: 'Enable',
            onPress: async () => {
              console.log('💾 Saving biometric credentials for:', email.trim());
              const success = await saveBiometricCredentials(
                email.trim(),
                password,
              );

              if (success) {
                setBiometricEnabled(true);
                console.log('✅ Biometric enabled for new user:', email.trim());
                Alert.alert(
                  'Success',
                  `${biometricName} login has been enabled. You can now use it to sign in.`,
                  [
                    {
                      text: 'OK',
                      onPress: onComplete,
                    },
                  ],
                );
              } else {
                console.error('Failed to enable biometric login');
                Alert.alert(
                  'Error',
                  `Failed to enable ${biometricName} login. Please try again later.`,
                  [
                    {
                      text: 'OK',
                      onPress: onComplete,
                    },
                  ],
                );
              }
            },
          },
        ],
        {
          cancelable: false,
          onDismiss: onComplete,
        },
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
          }),
        ).unwrap();

        // Navigate immediately after biometric login
        setShouldNavigate(true);
      }
    } catch (err) {
      console.error('Biometric login error:', err);
      Alert.alert(
        'Login Failed',
        'Could not sign in with biometrics. Please try using your password.',
      );
    } finally {
      setBiometricLoading(false);
    }
  };

  const handlePinLogin = async () => {
    setPinLoading(true);
    setPinError(null);
    dispatch(clearError());

    try {
      const credentials = await authenticateWithPin(
        pin,
        email.trim() || undefined,
      );

      if (!credentials) {
        setPinError('Invalid PIN. Please try again or use your password.');
        return;
      }

      await dispatch(
        loginUser({
          email: credentials.email,
          password: credentials.password,
        }),
      ).unwrap();

      setPin('');
      setShowPinLogin(false);
      setShouldNavigate(true);
    } catch (err) {
      console.error('PIN login error:', err);
      setPinError('Could not sign in with PIN. Please use your password.');
    } finally {
      setPinLoading(false);
    }
  };

  const handleSavePinSetup = async () => {
    setPinError(null);

    if (!isPinValid(setupPin)) {
      setPinError('Enter a 4 to 6 digit PIN.');
      return;
    }

    if (setupPin !== confirmSetupPin) {
      setPinError('PIN entries do not match.');
      return;
    }

    const success = await savePinCredentials(email.trim(), password, setupPin);

    if (!success) {
      setPinError('Failed to enable PIN login. Please try again.');
      return;
    }

    setPinEnabled(true);
    setPinSetupVisible(false);
    setSetupPin('');
    setConfirmSetupPin('');
    setShouldNavigate(true);
  };

  const handleSkipPinSetup = () => {
    setPinSetupVisible(false);
    setPinError(null);
    setSetupPin('');
    setConfirmSetupPin('');
    setShouldNavigate(true);
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
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
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
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <Text style={styles.eyeText}>
                    {showPassword ? '👁️' : '👁️‍🗨️'}
                  </Text>
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
              style={styles.forgotPassword}
            >
              <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
            </TouchableOpacity>

            {/* Login Button */}
            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Sign In</Text>
              )}
            </TouchableOpacity>

            {/* Biometric Login Button */}
            {biometricSupported && biometricEnabled && (
              <TouchableOpacity
                style={[
                  styles.biometricButton,
                  biometricLoading && styles.buttonDisabled,
                ]}
                onPress={handleBiometricLogin}
                disabled={loading || biometricLoading}
              >
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

            {/* PIN Fallback */}
            {pinEnabled && (
              <View style={styles.pinContainer}>
                {showPinLogin && (
                  <TextInput
                    placeholder="Enter PIN"
                    value={pin}
                    onChangeText={text => {
                      setPin(text.replace(/\D/g, '').slice(0, 6));
                      setPinError(null);
                    }}
                    style={[styles.input, pinError && styles.inputError]}
                    keyboardType="number-pad"
                    secureTextEntry
                    editable={!loading && !pinLoading}
                    maxLength={6}
                  />
                )}
                {pinError && <Text style={styles.errorText}>{pinError}</Text>}
                <TouchableOpacity
                  style={[
                    styles.pinButton,
                    pinLoading && styles.buttonDisabled,
                  ]}
                  onPress={
                    showPinLogin ? handlePinLogin : () => setShowPinLogin(true)
                  }
                  disabled={loading || pinLoading}
                >
                  {pinLoading ? (
                    <ActivityIndicator color="#007AFF" />
                  ) : (
                    <Text style={styles.pinButtonText}>
                      {showPinLogin ? 'Sign in with PIN' : 'Use PIN instead'}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {/* PIN Setup */}
            {pinSetupVisible && (
              <View style={styles.pinSetupCard}>
                <Text style={styles.pinSetupTitle}>Create PIN fallback</Text>
                <Text style={styles.pinSetupText}>
                  Use a 4 to 6 digit PIN if biometric login is unavailable.
                </Text>
                <TextInput
                  placeholder="New PIN"
                  value={setupPin}
                  onChangeText={text => {
                    setSetupPin(text.replace(/\D/g, '').slice(0, 6));
                    setPinError(null);
                  }}
                  style={styles.input}
                  keyboardType="number-pad"
                  secureTextEntry
                  maxLength={6}
                />
                <TextInput
                  placeholder="Confirm PIN"
                  value={confirmSetupPin}
                  onChangeText={text => {
                    setConfirmSetupPin(text.replace(/\D/g, '').slice(0, 6));
                    setPinError(null);
                  }}
                  style={[styles.input, styles.pinConfirmInput]}
                  keyboardType="number-pad"
                  secureTextEntry
                  maxLength={6}
                />
                {pinError && <Text style={styles.errorText}>{pinError}</Text>}
                <View style={styles.pinSetupActions}>
                  <TouchableOpacity
                    style={styles.pinSkipButton}
                    onPress={handleSkipPinSetup}
                  >
                    <Text style={styles.pinSkipButtonText}>Not Now</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.pinSaveButton}
                    onPress={handleSavePinSetup}
                  >
                    <Text style={styles.pinSaveButtonText}>Save PIN</Text>
                  </TouchableOpacity>
                </View>
              </View>
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
              style={styles.registerContainer}
            >
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
