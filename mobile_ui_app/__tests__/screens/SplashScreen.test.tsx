/**
 * SplashScreen Tests
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import SplashScreen from '../../src/screens/Splash/SplashScreen';

describe('SplashScreen', () => {
  it('should render correctly', () => {
    const { getByText } = render(<SplashScreen />);
    
    expect(getByText('Smart Appointment')).toBeTruthy();
    expect(getByText('AI-Powered Healthcare')).toBeTruthy();
  });

  it('should display loading indicator', () => {
    const { getByText } = render(<SplashScreen />);
    
    expect(getByText('Loading...')).toBeTruthy();
  });

  it('should display app version', () => {
    const { getByText } = render(<SplashScreen />);
    
    expect(getByText('Version 1.0.0')).toBeTruthy();
  });

  it('should display the healthcare icon', () => {
    const { getByText } = render(<SplashScreen />);
    
    expect(getByText('🏥')).toBeTruthy();
  });

  it('should match snapshot', () => {
    const tree = render(<SplashScreen />);
    expect(tree).toMatchSnapshot();
  });
});
