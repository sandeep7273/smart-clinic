/**
 * ForgotPasswordScreen Tests
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import ForgotPasswordScreen from '../../src/screens/ForgotPassword/ForgotPasswordScreen';
import * as authApi from '../../src/api/auth.api';

// Mock navigation
const mockNavigate = jest.fn();
const mockNavigation = {
  navigate: mockNavigate,
  goBack: jest.fn(),
  replace: jest.fn(),
  reset: jest.fn(),
  setOptions: jest.fn(),
};

// Mock Alert
jest.spyOn(Alert, 'alert');

// Mock auth API
jest.mock('../../src/api/auth.api', () => ({
  forgotPasswordApi: jest.fn(),
}));

describe('ForgotPasswordScreen', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    (Alert.alert as jest.Mock).mockClear();
    (authApi.forgotPasswordApi as jest.Mock).mockClear();
  });

  const renderForgotPasswordScreen = () => {
    return render(
      <ForgotPasswordScreen navigation={mockNavigation as any} route={{} as any} />
    );
  };

  it('should render forgot password form correctly', () => {
    const { getByText, getByPlaceholderText } = renderForgotPasswordScreen();

    expect(getByText('Forgot Password?')).toBeTruthy();
    expect(getByText(/Enter your email address/i)).toBeTruthy();
    expect(getByPlaceholderText('Enter your email')).toBeTruthy();
    expect(getByText('Send Reset Link')).toBeTruthy();
  });

  it('should display the lock icon', () => {
    const { getByText } = renderForgotPasswordScreen();

    expect(getByText('🔐')).toBeTruthy();
  });

  it('should show validation error for invalid email', async () => {
    const { getByPlaceholderText, getByText, queryByText } = renderForgotPasswordScreen();

    const emailInput = getByPlaceholderText('Enter your email');
    const submitButton = getByText('Send Reset Link');

    fireEvent.changeText(emailInput, 'invalid-email');
    fireEvent.press(submitButton);

    await waitFor(() => {
      expect(queryByText(/valid email/i)).toBeTruthy();
    });
  });

  it('should show validation error for empty email', async () => {
    const { getByText, queryByText } = renderForgotPasswordScreen();

    const submitButton = getByText('Send Reset Link');
    fireEvent.press(submitButton);

    await waitFor(() => {
      expect(queryByText(/required/i)).toBeTruthy();
    });
  });

  it('should call API and show success alert on valid email', async () => {
    (authApi.forgotPasswordApi as jest.Mock).mockResolvedValue({ success: true });

    const { getByPlaceholderText, getByText } = renderForgotPasswordScreen();

    const emailInput = getByPlaceholderText('Enter your email');
    const submitButton = getByText('Send Reset Link');

    fireEvent.changeText(emailInput, 'test@example.com');
    fireEvent.press(submitButton);

    await waitFor(() => {
      expect(authApi.forgotPasswordApi).toHaveBeenCalledWith('test@example.com');
      expect(Alert.alert).toHaveBeenCalledWith(
        'Success',
        'Password reset instructions have been sent to your email.',
        expect.any(Array)
      );
    });
  });

  it('should navigate back to Login when clicking Back to Sign In', () => {
    const { getByText } = renderForgotPasswordScreen();

    const backButton = getByText('← Back to Sign In');
    fireEvent.press(backButton);

    expect(mockNavigate).toHaveBeenCalledWith('Login');
  });

  it('should clear error when typing in email field', () => {
    const { getByPlaceholderText, getByText, queryByText } = renderForgotPasswordScreen();

    const emailInput = getByPlaceholderText('Enter your email');
    const submitButton = getByText('Send Reset Link');

    // Trigger error
    fireEvent.press(submitButton);

    // Type in email
    fireEvent.changeText(emailInput, 'test@example.com');

    // Error should be cleared
    expect(queryByText(/required/i)).toBeFalsy();
  });

  it('should match snapshot', () => {
    const tree = renderForgotPasswordScreen();
    expect(tree).toMatchSnapshot();
  });
});
