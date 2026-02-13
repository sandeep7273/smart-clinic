import React from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';

/**
 * Splash Screen
 * Shown while checking authentication status on app start
 */
export default function SplashScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* App Logo or Icon */}
        <View style={styles.logoContainer}>
          <Text style={styles.logo}>🏥</Text>
        </View>

        {/* App Name */}
        <Text style={styles.appName}>Smart Appointment</Text>
        <Text style={styles.tagline}>AI-Powered Healthcare</Text>

        {/* Loading Indicator */}
        <ActivityIndicator 
          size="large" 
          color="#007AFF" 
          style={styles.loader} 
        />

        {/* Loading Text */}
        <Text style={styles.loadingText}>Loading...</Text>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>Version 1.0.0</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  logoContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#F0F4FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  logo: {
    fontSize: 64,
  },
  appName: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 8,
    textAlign: 'center',
  },
  tagline: {
    fontSize: 16,
    color: '#666666',
    marginBottom: 48,
    textAlign: 'center',
  },
  loader: {
    marginBottom: 16,
  },
  loadingText: {
    fontSize: 14,
    color: '#999999',
    textAlign: 'center',
  },
  footer: {
    paddingBottom: 40,
  },
  footerText: {
    fontSize: 12,
    color: '#CCCCCC',
    textAlign: 'center',
  },
});
