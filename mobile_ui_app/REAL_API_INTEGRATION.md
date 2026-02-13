# Mobile App - Real API Integration

## Changes Made

### 1. Updated API Configuration
**File:** `src/constants/config.ts`

- Changed API mode from `'dummy'` to `'development'`
- Updated API URL to point to API Gateway: `http://localhost:3000/api`
- Renamed `DUMMY_API_URL` to `DEVELOPMENT_API_URL` for clarity

```typescript
export const APP_CONFIG = {
  API_MODE: 'development', // Now points to real API Gateway
  DEVELOPMENT_API_URL: 'http://localhost:3000/api', // API Gateway URL
  PRODUCTION_API_URL: 'https://api.smartappointment.com/api',
  // ...
};
```

### 2. Updated Type Definitions
**File:** `src/types/auth.types.ts`

Made registration fields optional to match API requirements:
- `role`: Optional (defaults to 'patient')
- `phoneNumber`: Optional
- `dateOfBirth`: Optional

```typescript
export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role?: 'patient' | 'doctor' | 'admin';
  phoneNumber?: string;
  dateOfBirth?: string;
}
```

### 3. Updated Registration Logic
**File:** `src/screens/Register/RegisterScreen.tsx`

Modified the registration handler to:
- Include `role: 'patient'` by default
- Only include phoneNumber and dateOfBirth if provided
- Match the exact format expected by the API

## API Gateway Integration

### Current Setup
```
Mobile App (Port 19006/Expo)
    ↓
API Gateway (Port 3000)
    ↓
Auth Service (Port 4001)
    ↓
PostgreSQL Database
```

### API Endpoints Available

1. **Register**: `POST /api/auth/register`
2. **Login**: `POST /api/auth/login`
3. **Logout**: `POST /api/auth/logout` (requires auth)
4. **Refresh Token**: `POST /api/auth/refresh` (requires auth)
5. **Get Profile**: `GET /api/auth/me` (requires auth)

## Testing the Integration

### Prerequisites

1. **API Gateway must be running** (Port 3000)
   ```bash
   cd api-gateway
   node src/index.js
   ```

2. **Auth Service must be running** (Port 4001)
   ```bash
   cd services/auth-service
   npm start
   ```

3. **PostgreSQL must be running**

### Test Steps

1. **Start the Mobile App**
   ```bash
   cd mobile_ui_app
   npm start
   ```

2. **Test Registration**
   - Open app in emulator/device
   - Go to Register screen
   - Fill in the form:
     - First Name: Test
     - Last Name: User
     - Email: testuser@example.com
     - Phone: +1234567890 (optional)
     - Date of Birth: Select date (optional)
     - Password: Test123!@#
   - Click "Create Account"
   - Should successfully register and navigate to Home

3. **Test Login**
   - Go to Login screen
   - Enter registered credentials
   - Click "Sign In"
   - Should successfully login and navigate to Home

4. **Verify Token Storage**
   - Tokens are stored securely using react-native-keychain
   - Fallback to AsyncStorage if keychain unavailable
   - Check console logs for token storage confirmation

### Expected Response Format

**Registration Success:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "firstName": "Test",
      "lastName": "User",
      "role": "patient",
      "tenantId": "tenant-001",
      "isEmailVerified": false,
      "createdAt": "2026-02-04T...",
      "updatedAt": "2026-02-04T..."
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
    "expiresIn": 900
  }
}
```

**Login Success:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": { /* user object */ },
    "accessToken": "...",
    "refreshToken": "...",
    "expiresIn": 900
  }
}
```

## Features Working

### ✅ Authentication Flow
- User registration with validation
- User login with credentials
- JWT token management
- Secure token storage (Keychain/AsyncStorage)
- Automatic token refresh on 401 errors
- Logout functionality

### ✅ API Integration
- All requests go through API Gateway
- Correlation IDs for distributed tracing
- Rate limiting (5 req/15min for auth endpoints)
- Proper error handling and display
- Loading states during API calls

### ✅ Security
- JWT Bearer token authentication
- Secure credential storage
- Password validation
- Email validation
- HTTPS ready for production

## Troubleshooting

### Issue: Cannot connect to API
**Solution:**
- Ensure API Gateway is running on port 3000
- Check if auth service is running on port 4001
- Verify network connectivity
- For iOS Simulator: Use `http://localhost:3000/api`
- For Android Emulator: Use `http://10.0.2.2:3000/api` (may need to update config)
- For Physical Device: Use your computer's IP address `http://192.168.x.x:3000/api`

### Issue: Registration fails with validation errors
**Solution:**
- Ensure all required fields are filled
- Password must meet criteria (min 8 chars, uppercase, lowercase, number, special char)
- Email must be valid format
- Check API Gateway logs for detailed error messages

### Issue: Tokens not being saved
**Solution:**
- Check if react-native-keychain is installed
- Run `pod install` in ios folder if needed
- Falls back to AsyncStorage if Keychain unavailable
- Check console for token storage logs

### Issue: 401 Unauthorized after login
**Solution:**
- Token might be expired (15 minutes)
- Automatic refresh should handle this
- Check refresh token validity (7 days)
- Clear app data and login again if needed

## Network Configuration for Different Environments

### iOS Simulator
```typescript
DEVELOPMENT_API_URL: 'http://localhost:3000/api'
```

### Android Emulator
Update config to use Android emulator localhost:
```typescript
DEVELOPMENT_API_URL: 'http://10.0.2.2:3000/api'
```

### Physical Device
Update config to use your computer's IP:
```typescript
DEVELOPMENT_API_URL: 'http://192.168.1.100:3000/api' // Replace with your IP
```

To find your IP:
- macOS: `ifconfig | grep "inet " | grep -v 127.0.0.1`
- Windows: `ipconfig`
- Linux: `hostname -I`

## Next Steps

1. ✅ Mobile app integrated with API Gateway
2. ✅ Authentication working end-to-end
3. ⏭️ Test on physical devices
4. ⏭️ Implement remaining features (doctor search, appointments)
5. ⏭️ Add error boundary and offline support
6. ⏭️ Implement token refresh UI notifications
7. ⏭️ Add biometric authentication

## API Request Flow

```
User Action (Register/Login)
    ↓
Mobile App (React Native)
    ↓
Auth Context (Redux)
    ↓
Auth Service (Token Management)
    ↓
HTTP Client (Axios + Interceptors)
    ↓
API Gateway (Port 3000)
  - Rate Limiting
  - Correlation ID
  - Request Logging
    ↓
Auth Service (Port 4001)
  - Validation
  - Business Logic
  - JWT Generation
    ↓
PostgreSQL Database
    ↓
Response flows back up the chain
    ↓
UI Updates with user data
```

## Monitoring and Debugging

### Check API Gateway Logs
```bash
tail -f api-gateway/logs/combined.log
```

### Check Auth Service Logs
```bash
tail -f services/auth-service/logs/combined.log
```

### Enable Debug Mode in Mobile App
Set `__DEV__` flag to see detailed request/response logs in console.

## Success Indicators

- ✅ User can register successfully
- ✅ User can login successfully
- ✅ JWT tokens are stored securely
- ✅ Protected routes require authentication
- ✅ Token refresh works automatically
- ✅ Logout clears tokens properly
- ✅ Error messages display correctly
- ✅ Loading states work properly

**The mobile app is now fully integrated with the real API through the API Gateway!** 🎉
