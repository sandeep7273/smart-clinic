import React, { useState } from 'react';
import { View, Text, Button, ScrollView, StyleSheet } from 'react-native';
import { Platform } from 'react-native';
import axios from 'axios';
import { APP_CONFIG, getApiBaseUrl } from '../constants/config';

/**
 * Network Diagnostic Component
 * Use this to test API connectivity from the mobile app
 */
const NetworkDiagnostic: React.FC = () => {
  const [results, setResults] = useState<string[]>([]);

  const addResult = (message: string) => {
    setResults(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
  };

  const clearResults = () => {
    setResults([]);
  };

  // Test 1: Check platform and URL
  const testPlatform = () => {
    addResult(`Platform: ${Platform.OS}`);
    addResult(`API URL: ${getApiBaseUrl()}`);
    addResult(`Timeout: ${APP_CONFIG.API_TIMEOUT}ms`);
  };

  // Test 2: Test basic connectivity
  const testConnectivity = async () => {
    addResult('Testing connectivity...');
    const baseURL = getApiBaseUrl();
    
    try {
      const response = await axios.get(`${baseURL}/auth/health`, {
        timeout: 5000,
      });
      addResult(`✓ SUCCESS: ${response.status} ${JSON.stringify(response.data)}`);
    } catch (error: any) {
      if (error.response) {
        addResult(`✗ HTTP ERROR: ${error.response.status}`);
        addResult(`Response: ${JSON.stringify(error.response.data)}`);
      } else if (error.request) {
        addResult(`✗ NETWORK ERROR: No response received`);
        addResult(`Error: ${error.message}`);
        addResult(`Check: Is API Gateway running on ${baseURL}?`);
      } else {
        addResult(`✗ ERROR: ${error.message}`);
      }
    }
  };

  // Test 3: Test registration endpoint
  const testRegistration = async () => {
    addResult('Testing registration...');
    const baseURL = getApiBaseUrl();
    const timestamp = Date.now();
    
    try {
      const response = await axios.post(
        `${baseURL}/auth/register`,
        {
          email: `test${timestamp}@example.com`,
          password: 'Test123!@#',
          firstName: 'Test',
          lastName: 'User',
          role: 'patient',
        },
        {
          timeout: 10000,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
      addResult(`✓ SUCCESS: ${response.status}`);
      addResult(`User: ${response.data.data?.user?.email}`);
      addResult(`Token: ${response.data.data?.accessToken?.substring(0, 20)}...`);
    } catch (error: any) {
      if (error.response) {
        addResult(`✗ HTTP ERROR: ${error.response.status}`);
        addResult(`Message: ${error.response.data?.message}`);
      } else if (error.request) {
        addResult(`✗ NETWORK ERROR: No response`);
        addResult(`URL: ${baseURL}/auth/register`);
        addResult(`Error: ${error.message}`);
      } else {
        addResult(`✗ ERROR: ${error.message}`);
      }
    }
  };

  // Test 4: Test different URLs
  const testURLs = async () => {
    const urls = [
      'http://localhost:3000/api',
      'http://10.0.2.2:3000/api',
      'http://127.0.0.1:3000/api',
    ];

    for (const url of urls) {
      addResult(`Testing ${url}...`);
      try {
        const response = await axios.get(`${url}/auth/health`, {
          timeout: 3000,
        });
        addResult(`  ✓ ${url} - SUCCESS`);
      } catch (error: any) {
        addResult(`  ✗ ${url} - FAILED: ${error.message}`);
      }
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Network Diagnostic Tool</Text>
      
      <View style={styles.buttonContainer}>
        <Button title="1. Check Platform" onPress={testPlatform} />
        <Button title="2. Test Health" onPress={testConnectivity} />
        <Button title="3. Test Registration" onPress={testRegistration} />
        <Button title="4. Test All URLs" onPress={testURLs} />
        <Button title="Clear Results" onPress={clearResults} color="#999" />
      </View>

      <ScrollView style={styles.resultsContainer}>
        {results.map((result, index) => (
          <Text key={index} style={styles.resultText}>
            {result}
          </Text>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  buttonContainer: {
    gap: 10,
    marginBottom: 20,
  },
  resultsContainer: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 5,
  },
  resultText: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginBottom: 5,
  },
});

export default NetworkDiagnostic;
