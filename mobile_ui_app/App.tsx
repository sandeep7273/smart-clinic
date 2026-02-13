/**
 * Smart Appointment System - Mobile App
 * Main Application Entry Point
 */

import React from 'react';
import { StatusBar, useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider } from 'react-redux';
import { store } from './src/store';
import { APP_CONFIG } from './src/constants/config';
import { initializeMockApi } from './src/api/mockApi';
import { RootNavigator } from './src/navigation';
import { AuthProvider } from './src/context/AuthContext';

// Initialize Mock API if in dummy mode
if (APP_CONFIG.API_MODE === 'dummy') {
  initializeMockApi();
}

function App() {
  const isDarkMode = useColorScheme() === 'dark';

  return (
    <Provider store={store}>
      <AuthProvider>
        <SafeAreaProvider>
          <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
          <RootNavigator />
        </SafeAreaProvider>
      </AuthProvider>
    </Provider>
  );
}

export default App;
