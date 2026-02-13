# Mobile App Registration Testing Checklist

## Pre-Testing Setup ✅

- [x] API Gateway running on port 3000
- [x] Auth Service running on port 4001
- [x] Mobile app configured to use http://localhost:3000/api

## Issues Fixed ✅

- [x] Phone number validation made optional
- [x] Form validation handles empty optional fields
- [x] Error logging enhanced with detailed console logs
- [x] RegisterResponse type includes expiresIn field
- [x] UI label updated to show "Phone Number (Optional)"
- [x] Auth thunks improved error handling

## Manual Testing Steps

### Test 1: Full Registration with All Fields
- [ ] Open mobile app
- [ ] Navigate to Register screen
- [ ] Fill in all fields:
  - First Name: Test
  - Last Name: User
  - Email: test@example.com
  - Phone: +1234567890
  - DOB: 1990-01-01
  - Password: Test123!@#
  - Confirm: Test123!@#
- [ ] Tap "Sign Up"
- [ ] Check console logs for "Sending registration data"
- [ ] Verify success message appears
- [ ] Verify user is logged in (redirected to home/dashboard)

**Expected Result**: ✅ Registration succeeds

### Test 2: Registration Without Optional Fields
- [ ] Clear form or restart app
- [ ] Fill in only required fields:
  - First Name: Jane
  - Last Name: Doe
  - Email: jane@example.com
  - Phone: (leave empty)
  - DOB: (leave empty)
  - Password: SecurePass1!
  - Confirm: SecurePass1!
- [ ] Tap "Sign Up"
- [ ] Verify registration succeeds without phone/DOB

**Expected Result**: ✅ Registration succeeds

### Test 3: Validation Errors

#### 3a. Invalid Email
- [ ] Enter invalid email: "notanemail"
- [ ] Verify "Invalid email format" error appears
- [ ] Verify button doesn't submit

#### 3b. Weak Password
- [ ] Enter password: "weak"
- [ ] Verify validation error appears

#### 3c. Mismatched Passwords
- [ ] Password: Test123!@#
- [ ] Confirm: Different123!@#
- [ ] Verify "Passwords do not match" error

#### 3d. Invalid Phone Format (if entered)
- [ ] Enter phone: "123"
- [ ] Should show error in mobile app
- [ ] Note: Backend may accept it (backend validation issue)

### Test 4: Network Error Handling

#### 4a. Backend Down
- [ ] Stop auth service
- [ ] Try to register
- [ ] Verify error message appears
- [ ] Check console for detailed error

#### 4b. Rate Limiting
- [ ] Register 5 users quickly
- [ ] 6th attempt should fail with rate limit
- [ ] Verify error message is user-friendly

### Test 5: Token Storage
- [ ] Successfully register
- [ ] Close and reopen app
- [ ] Verify user remains logged in
- [ ] Check that tokens are in Keychain (iOS) or Keystore (Android)

## Console Log Verification

Check React Native console for:
```
📤 POST /api/auth/register
Sending registration data: { email: '...', firstName: '...', password: '***', role: 'patient' }
📥 POST /api/auth/register - 201
Registration successful!
```

## Backend Log Verification

Check API Gateway logs:
```bash
tail -f api-gateway/logs/combined.log | grep -E "(register|POST /auth)"
```

Should see:
```
info: Proxying POST request to auth service
info: Request completed - Status: 201
```

## Success Criteria

- [x] All automated tests pass (test-registration-fix.sh)
- [ ] Manual registration with all fields succeeds
- [ ] Manual registration without optional fields succeeds
- [ ] Validation errors display correctly
- [ ] Error messages are user-friendly
- [ ] Tokens stored securely
- [ ] User remains logged in after app restart
- [ ] Console logs show detailed debug info

## Known Issues

### ⚠️ Backend Phone Validation
- Backend accepts invalid phone format "123"
- This is a backend validation issue, not critical
- Mobile app validates phone format correctly
- Fix required in auth-service validators

### ⚠️ Rate Limiting During Testing
- Auth endpoints: 5 requests per 15 minutes
- May need to wait or restart service during testing
- Consider increasing limit for development environment

## Troubleshooting

### Issue: "Cannot connect to API"
**Solution**: 
- Verify API Gateway is running: `curl http://localhost:3000/api/auth/health`
- Check mobile_ui_app/src/constants/config.ts has correct URL
- For Android emulator, may need http://10.0.2.2:3000/api

### Issue: "Rate limit exceeded"
**Solution**:
- Wait 15 minutes
- Or restart auth service
- Or temporarily disable in auth-service/src/middlewares/rateLimit.middleware.js

### Issue: "Validation failed"
**Solution**:
- Check console logs for specific validation errors
- Verify password meets requirements (8+ chars, uppercase, number, special char)
- Check email format is valid

### Issue: Tokens not persisting
**Solution**:
- Check react-native-keychain is properly installed
- iOS: Check keychain permissions
- Android: Check minimum SDK version
- Fall back to AsyncStorage if Keychain unavailable

## Post-Testing

After successful testing:
- [ ] Document any issues found
- [ ] Update integration guide if needed
- [ ] Commit changes
- [ ] Test on physical device if possible
- [ ] Test on both iOS and Android

## Next Features to Test

1. Login with registered credentials
2. Token refresh on 401
3. Logout functionality
4. Protected route access
5. Profile update
6. Password change

## Notes

- Keep API Gateway and Auth Service running during all tests
- Clear app data between tests if needed
- Use unique email addresses for each registration test
- Check both mobile logs and backend logs for full picture
