/**
 * Simple Test Script
 * Tests basic functionality without a testing framework
 */

const mongoose = require('mongoose');
const config = require('./src/config/env');
const { hashPassword, verifyPassword } = require('./src/utils/password.util');
const { generateAccessToken, verifyAccessToken } = require('./src/utils/jwt.util');
const logger = require('./src/utils/logger.util');

async function runTests() {
  console.log('\n🧪 Running Auth Service Tests...\n');

  let passed = 0;
  let failed = 0;

  // Test 1: Password Hashing
  try {
    console.log('Test 1: Password hashing...');
    const password = 'TestPassword123';
    const hashed = await hashPassword(password);
    const isValid = await verifyPassword(password, hashed);
    const isInvalid = await verifyPassword('WrongPassword', hashed);
    
    if (isValid && !isInvalid) {
      console.log('✅ Password hashing works correctly\n');
      passed++;
    } else {
      console.log('❌ Password hashing failed\n');
      failed++;
    }
  } catch (error) {
    console.log('❌ Password hashing error:', error.message, '\n');
    failed++;
  }

  // Test 2: JWT Token Generation
  try {
    console.log('Test 2: JWT token generation...');
    const tokenPayload = {
      userId: '123',
      email: 'test@example.com',
      role: 'patient',
    };
    
    const token = generateAccessToken(tokenPayload);
    const { valid, decoded } = verifyAccessToken(token);
    
    if (valid && decoded.userId === '123' && decoded.email === 'test@example.com') {
      console.log('✅ JWT token generation works correctly\n');
      passed++;
    } else {
      console.log('❌ JWT token generation failed\n');
      failed++;
    }
  } catch (error) {
    console.log('❌ JWT token error:', error.message, '\n');
    failed++;
  }

  // Test 3: MongoDB Connection
  try {
    console.log('Test 3: MongoDB connection...');
    await mongoose.connect(config.mongodb.uri);
    console.log('✅ MongoDB connection successful\n');
    await mongoose.disconnect();
    passed++;
  } catch (error) {
    console.log('❌ MongoDB connection failed:', error.message, '\n');
    failed++;
  }

  // Test 4: Environment Configuration
  try {
    console.log('Test 4: Environment configuration...');
    config.validateConfig();
    console.log('✅ Environment configuration valid\n');
    passed++;
  } catch (error) {
    console.log('❌ Environment configuration error:', error.message, '\n');
    failed++;
  }

  // Test 5: Logger
  try {
    console.log('Test 5: Logger functionality...');
    logger.info('Test log message');
    logger.error('Test error message');
    console.log('✅ Logger works correctly\n');
    passed++;
  } catch (error) {
    console.log('❌ Logger error:', error.message, '\n');
    failed++;
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('Test Results:');
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`Total: ${passed + failed}`);
  console.log('='.repeat(50) + '\n');

  if (failed === 0) {
    console.log('🎉 All tests passed! Service is ready to run.\n');
    process.exit(0);
  } else {
    console.log('⚠️  Some tests failed. Please check the configuration.\n');
    process.exit(1);
  }
}

// Run tests
runTests().catch((error) => {
  console.error('Test execution error:', error);
  process.exit(1);
});
