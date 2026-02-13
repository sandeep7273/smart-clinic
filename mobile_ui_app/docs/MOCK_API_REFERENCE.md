# Mock API Server - Quick Reference

## 🔧 Configuration

The mock API is automatically initialized when `API_MODE` is set to `'dummy'` in `src/constants/config.ts`.

## 📋 Available Endpoints

### 1. Login
**Endpoint:** `POST /auth/login`

**Request:**
```json
{
  "email": "patient@test.com",
  "password": "password123"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "user-001",
      "email": "patient@test.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "patient",
      "tenantId": "tenant-001"
    },
    "accessToken": "mock_access_token_...",
    "refreshToken": "mock_refresh_token_...",
    "expiresIn": 3600
  }
}
```

**Error Response (401):**
```json
{
  "success": false,
  "message": "Invalid email or password",
  "errors": {
    "auth": ["Invalid credentials"]
  }
}
```

### 2. Register
**Endpoint:** `POST /auth/register`

**Request:**
```json
{
  "email": "newuser@test.com",
  "password": "password123",
  "firstName": "Jane",
  "lastName": "Doe",
  "phoneNumber": "+1234567890",
  "dateOfBirth": "1995-06-15"
}
```

**Success Response (201):**
```json
{
  "success": true,
  "message": "Registration successful",
  "data": {
    "user": { /* user object */ },
    "accessToken": "mock_access_token_...",
    "refreshToken": "mock_refresh_token_..."
  }
}
```

**Error Response (400):**
```json
{
  "success": false,
  "message": "User already exists",
  "errors": {
    "email": ["Email already registered"]
  }
}
```

### 3. Logout
**Endpoint:** `POST /auth/logout`

**Success Response (200):**
```json
{
  "success": true,
  "message": "Logout successful"
}
```

### 4. Forgot Password
**Endpoint:** `POST /auth/forgot-password`

**Request:**
```json
{
  "email": "patient@test.com"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Password reset email sent"
}
```

### 5. Refresh Token
**Endpoint:** `POST /auth/refresh`

**Request:**
```json
{
  "refreshToken": "mock_refresh_token_..."
}
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "accessToken": "mock_access_token_refreshed_...",
    "expiresIn": 3600
  }
}
```

### 6. Get User Profile
**Endpoint:** `GET /users/profile`

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "user-001",
    "email": "patient@test.com",
    "firstName": "John",
    "lastName": "Doe",
    "phoneNumber": "+1234567890",
    "role": "patient"
  }
}
```

## 👤 Test Accounts

### Patient Account
```
Email: patient@test.com
Password: password123
Role: patient
```

### Doctor Account
```
Email: doctor@test.com
Password: password123
Role: doctor
```

## ⚙️ Mock API Features

### Realistic Delays
- All API calls have 800ms simulated delay
- Mimics real network latency

### Token Generation
- Unique tokens generated for each login
- Tokens include user ID and timestamp
- Refresh tokens supported

### Persistent Mock Data
- Users are stored in mock database
- New registrations are added to the database
- Data persists during app session

### Error Simulation
- Invalid credentials return 401
- Duplicate registration returns 400
- Missing user returns 404

## 🔄 Adding New Mock Endpoints

To add new mock endpoints, edit `src/api/mockApi.ts`:

```typescript
// Example: Add new endpoint
mock.onGet('/doctors/search').reply(() => {
  return [200, {
    success: true,
    data: [
      // mock doctors data
    ]
  }];
});
```

## 🐛 Debugging

### Check Mock API Initialization
Look for these console logs when app starts:
```
🔧 Mock API Server initialized
✅ Mock API routes configured
📧 Test credentials: patient@test.com / password123
```

### Test Mock API
```typescript
// In your component or test
import { getMockUsers } from '../api/mockApi';

// Get all mock users
const users = getMockUsers();
console.log('Mock users:', users);
```

### Reset Mock API
```typescript
import { resetMockApi } from '../api/mockApi';

// Reset all mock adapters
resetMockApi();
```

## 🚀 Production Transition

When switching to production API:

1. Set `API_MODE` to `'production'` in `config.ts`
2. Update `PRODUCTION_API_URL` with your backend URL
3. Ensure backend API follows the same response format
4. Remove or comment out mock API initialization in `App.tsx`

## 📊 Response Format Standards

All mock API responses follow this structure:

**Success:**
```typescript
{
  success: true,
  message: string,        // Optional success message
  data: any              // Response data
}
```

**Error:**
```typescript
{
  success: false,
  message: string,        // Error message
  errors?: {             // Optional field-specific errors
    [field: string]: string[]
  }
}
```

This format should be maintained by your production backend for seamless transition.

## 💡 Tips

1. **Quick Testing:** Use the "Quick Login" button in development
2. **Network Inspection:** Mock requests appear in network logs
3. **Custom Test Data:** Modify `mockUsers` array in `mockApi.ts`
4. **Response Delays:** Adjust `delayResponse` value for faster/slower responses
5. **Error Testing:** Modify mock responses to test error scenarios

---

**Happy Testing! 🎉**
