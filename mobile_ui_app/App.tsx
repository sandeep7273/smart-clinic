/**
 * Smart Appointment System - Mobile App
 * Main Application Entry Point
 */

import React from 'react';
import { StatusBar, useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider } from 'react-redux';
import { store } from './src/store';
import { RootNavigator } from './src/navigation';
import { AuthProvider } from './src/context/AuthContext';


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
