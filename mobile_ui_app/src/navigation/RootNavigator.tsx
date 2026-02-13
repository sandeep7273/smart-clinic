/**
 * Root Navigator
 * Main navigation container that switches between Auth and Main stacks
 * Now uses AuthContext for better state management
 */

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { AuthNavigator } from './AuthNavigator';
import { MainNavigator } from './MainNavigator';
import SplashScreen from '../screens/Splash';

export const RootNavigator = () => {
  const { isLoading, isAuthenticated } = useAuth();

  // Show splash screen while checking auth status
  if (isLoading) {
    return <SplashScreen />;
  }

  return (
    <NavigationContainer>
      {isAuthenticated ? <MainNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
};
