import React, { useState } from 'react';
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
import { ForgotPasswordScreenProps } from '../../navigation/types';
import { forgotPasswordApi } from '../../api/auth.api';
import { validateField } from '../../utils/validation';
import styles from './ForgotPassword.styles';

export default function ForgotPasswordScreen({ navigation }: ForgotPasswordScreenProps) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Validate and submit
  const handleSubmit = async () => {
    // Validate email
    const error = validateField('email', email);
    if (error) {
      setEmailError(error);
      return;
    }

    setLoading(true);
    setEmailError(null);

    try {
      await forgotPasswordApi(email.trim());
      setSuccess(true);
      Alert.alert(
        'Success',
        'Password reset instructions have been sent to your email.',
        [
          {
            text: 'OK',
            onPress: () => navigation.navigate('Login'),
          },
        ]
      );
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.message || 'Failed to send reset email. Please try again.';
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Navigate back to login
  const handleBackToLogin = () => {
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
            <Text style={styles.icon}>🔐</Text>
            <Text style={styles.title}>Forgot Password?</Text>
            <Text style={styles.subtitle}>
              Enter your email address and we'll send you instructions to reset your password.
            </Text>
          </View>

          {!success ? (
            <>
              {/* Email Input */}
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Email Address</Text>
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
                  autoFocus
                />
                {emailError && (
                  <Text style={styles.errorText}>{emailError}</Text>
                )}
              </View>

              {/* Submit Button */}
              <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handleSubmit}
                disabled={loading}>
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Send Reset Link</Text>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <View style={styles.successContainer}>
              <Text style={styles.successIcon}>✅</Text>
              <Text style={styles.successTitle}>Check Your Email</Text>
              <Text style={styles.successMessage}>
                We've sent password reset instructions to {email}
              </Text>
            </View>
          )}

          {/* Back to Login */}
          <TouchableOpacity
            onPress={handleBackToLogin}
            disabled={loading}
            style={styles.backContainer}>
            <Text style={styles.backText}>← Back to Sign In</Text>
          </TouchableOpacity>

          {/* Additional Help */}
          <View style={styles.helpContainer}>
            <Text style={styles.helpText}>
              Didn't receive the email? Check your spam folder or{' '}
              <Text style={styles.helpLink} onPress={handleSubmit}>
                try again
              </Text>
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
