# Network Error Troubleshooting Guide

## Issue
Mobile app shows "Network error" during registration.

## Root Cause
The mobile app cannot reach the API Gateway at the configured URL.

## Solutions Applied

### 1. Platform-Specific URL Configuration ✅

Updated [src/constants/config.ts](../src/constants/config.ts) to automatically use the correct URL based on platform:

- **iOS Simulator**: `http://localhost:3000/api`
- **Android Emulator**: `http://10.0.2.2:3000/api`
- **Physical Device**: `http://YOUR_LOCAL_IP:3000/api`

### 2. Enhanced Error Logging ✅

Updated [src/api/httpClient.ts](../src/api/httpClient.ts) to provide detailed debugging information when network errors occur.

## Quick Fix Steps

### Step 1: Verify Services are Running

```bash
# Check Auth Service (should return health status)
curl http://localhost:4001/auth/health

# Check API Gateway (should return success)
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"Test123!@#","firstName":"Test","lastName":"User","role":"patient"}'
```

Both should return successful JSON responses.

### Step 2: Check Platform-Specific Configuration

#### For iOS Simulator (Default)
No changes needed - uses `localhost:3000`

#### For Android Emulator
The config automatically uses `10.0.2.2:3000`, but if needed, you can verify by checking the console log which shows:
```
📱 Using Android Emulator URL: http://10.0.2.2:3000/api
```

#### For Physical Device
1. Find your computer's local IP address:
   ```bash
   # macOS
   ifconfig | grep "inet " | grep -v 127.0.0.1
   
   # Example output: inet 192.168.1.100 netmask...
   ```

2. Update [src/constants/config.ts](../src/constants/config.ts):
   ```typescript
   // Line ~18
   PHYSICAL_DEVICE_URL: 'http://192.168.1.100:3000/api', // YOUR IP HERE!
   ```

3. **Important**: Ensure your phone and computer are on the same WiFi network

### Step 3: Check Console Logs

The updated error handling now provides detailed troubleshooting info. Look for:

```
❌ Network Error: No response from server
Request config: { url: '/auth/register', baseURL: 'http://...', method: 'post' }

🔧 Troubleshooting:
1. Is the API Gateway running? (http://localhost:3000)
2. Is the Auth Service running? (http://localhost:4001)
3. Using Android Emulator? Check if API_URL uses 10.0.2.2
4. Using Physical Device? Update PHYSICAL_DEVICE_URL in config.ts
```

## Testing the Fix

### Test 1: Verify Platform Detection
Start your mobile app and check the console for:
```
📱 Using iOS Simulator URL: http://localhost:3000/api
// or
📱 Using Android Emulator URL: http://10.0.2.2:3000/api
```

### Test 2: Try Registration
1. Open the Register screen
2. Fill in the form:
   - First Name: John
   - Last Name: Doe
   - Email: john.doe@example.com
   - Password: Test123!@#
   - Confirm Password: Test123!@#
3. Tap "Sign Up"

### Test 3: Check Console Output
You should see:
```
📤 POST /auth/register
Sending registration data: { email: '...', firstName: '...', password: '***', role: 'patient' }
📥 POST /auth/register - 201
Registration successful!
```

If you see a network error, the console will now show detailed troubleshooting steps.

## Common Issues & Solutions

### Issue 1: "Network Error" on Android Emulator
**Solution**: Config now automatically uses `10.0.2.2` for Android

To verify:
```bash
# From your computer, this should work:
curl http://10.0.2.2:3000/api/auth/health
```

### Issue 2: "Network Error" on Physical Device
**Solution**: Update PHYSICAL_DEVICE_URL with your local IP

Steps:
1. Find IP: `ifconfig | grep "inet " | grep -v 127.0.0.1`
2. Update config.ts line ~18
3. Restart mobile app
4. Ensure same WiFi network

### Issue 3: Services Not Running
**Error**: Connection refused or timeout

**Solution**: Start services:
```bash
# Terminal 1: Auth Service
cd services/auth-service
node src/server.js

# Terminal 2: API Gateway
cd api-gateway
node src/index.js
```

Verify:
```bash
curl http://localhost:4001/auth/health
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"Test123!@#","firstName":"Test","lastName":"User"}'
```

### Issue 4: Firewall Blocking Requests
**Solution**: Add firewall rules to allow Node.js

macOS:
```bash
# System Settings > Security & Privacy > Firewall > Firewall Options
# Allow incoming connections for Node.js
```

### Issue 5: Wrong Port
**Verify ports**:
- Auth Service: `4001` ✅
- API Gateway: `3000` ✅

## Files Modified

1. [src/constants/config.ts](../src/constants/config.ts)
   - Added platform-specific URL configuration
   - Auto-detects iOS vs Android vs Physical Device
   - Increased timeout to 30s for debugging

2. [src/api/httpClient.ts](../src/api/httpClient.ts)
   - Enhanced network error logging
   - Provides troubleshooting steps in console
   - Shows request config details

## Current Configuration

```typescript
// Auto-detected based on Platform.OS
iOS Simulator:     http://localhost:3000/api
Android Emulator:  http://10.0.2.2:3000/api
Physical Device:   http://192.168.1.100:3000/api (UPDATE THIS!)
```

## Verification Checklist

- [x] Auth Service running on port 4001
- [x] API Gateway running on port 3000
- [x] Platform-specific URL configuration added
- [x] Enhanced error logging implemented
- [ ] Update PHYSICAL_DEVICE_URL if testing on physical device
- [ ] Test registration on iOS Simulator
- [ ] Test registration on Android Emulator
- [ ] Test registration on Physical Device (if applicable)

## Next Steps

1. **Reload mobile app** to pick up the new configuration
2. **Check console logs** to see which URL is being used
3. **Try registration** again
4. **Review detailed error logs** if it still fails

The network error should now be resolved with proper platform detection!

## Additional Resources

- [API Gateway Status Check](http://localhost:3000/api/auth/health)
- [Auth Service Status Check](http://localhost:4001/auth/health)
- [Registration Fix Documentation](./REGISTRATION_FIX.md)
- [Real API Integration Guide](./REAL_API_INTEGRATION.md)
