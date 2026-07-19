# Login Screen - Smart Appointment System

## Overview
Complete and production-ready Login screen implementation with dummy API support for testing.

## Features Implemented

### ✅ User Interface
- Clean, modern design with proper spacing and typography
- Email and password input fields with validation
- Show/hide password toggle
- Loading states with ActivityIndicator
- Error messages (field-level and global)
- Forgot Password link
- Sign Up navigation
- Keyboard-aware scrolling
- Development quick-login button (DEV only)

### ✅ Form Validation
- Email format validation
- Password minimum length (8 characters)
- Real-time field validation
- Clear error messaging
- Input error highlighting

### ✅ State Management (Redux Toolkit)
- Login user action
- Register user action
- Logout user action
- Check authentication status
- Token persistence with AsyncStorage
- Automatic token refresh on 401 errors

### ✅ API Integration
- Configurable API mode (dummy/production)
- Mock API server for testing
- Axios HTTP client with interceptors
- JWT token management
- Error handling and retry logic

## Project Structure

```
src/
├── api/
│   ├── httpClient.ts          # Axios instance with interceptors
│   ├── auth.api.ts            # Authentication API endpoints
│   └── mockApi.ts             # Mock API server for testing
├── constants/
│   ├── config.ts              # App configuration (API mode toggle)
│   └── apiEndpoints.ts        # Centralized API endpoint definitions
├── screens/
│   └── Login/
│       ├── LoginScreen.tsx    # Main Login component
│       ├── Login.styles.ts    # Styles
│       └── index.ts           # Export
├── store/
│   ├── index.ts               # Redux store configuration
│   ├── hooks.ts               # Typed Redux hooks
│   └── auth/
│       ├── authSlice.ts       # Auth state slice
│       ├── authThunks.ts      # Async actions
│       └── auth.types.ts      # TypeScript types
├── types/
│   ├── auth.types.ts          # Auth-related type definitions
│   └── index.ts               # Type exports
└── utils/
    └── validation.ts          # Form validation utilities
```

## Setup Instructions

### 1. Install Dependencies

```bash
cd mobile_ui_app
npm install
```

### 2. Install CocoaPods (iOS only)

```bash
cd ios
bundle install
bundle exec pod install
cd ..
```

### 3. Configure API Mode

Open `src/constants/config.ts` and set the API mode:

```typescript
export const APP_CONFIG = {
  API_MODE: 'dummy',  // Use 'dummy' for testing, 'production' for real API
  // ...
};
```

### 4. Run the Application

**Android:**
```bash
npm run android
```

**iOS:**
```bash
npm run ios
```

## Testing with Mock API

### Default Test Credentials

When `API_MODE` is set to `'dummy'`, you can use these credentials:

**Patient Account:**
- Email: `patient@test.com`
- Password: `password123`

**Doctor Account:**
- Email: `doctor@test.com`
- Password: `password123`

### Quick Login (Development Only)

In development mode, click the "🔧 Quick Login (Dev Only)" button to auto-fill test credentials.

## API Configuration

### Switching to Production API

When ready to connect to the real backend:

1. Update `src/constants/config.ts`:
```typescript
export const APP_CONFIG = {
  API_MODE: 'production',
  PRODUCTION_API_URL: 'https://your-api-domain.com/api',
  // ...
};
```

2. The app will automatically use the production API endpoints.

### API Response Format

The mock API follows the expected production response format:

**Login Success:**
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
      ...
    },
    "accessToken": "jwt_token_here",
    "refreshToken": "refresh_token_here",
    "expiresIn": 3600
  }
}
```

**Login Error:**
```json
{
  "success": false,
  "message": "Invalid email or password",
  "errors": {
    "auth": ["Invalid credentials"]
  }
}
```

## Token Management

### Automatic Token Storage
- Access tokens are stored in AsyncStorage
- Refresh tokens are stored for token refresh
- User data is persisted across app restarts

### Automatic Token Refresh
- HTTP client automatically refreshes expired tokens
- Seamless retry of failed requests with new token
- Automatic logout on refresh token expiration

## State Management

### Redux Store Structure

```typescript
{
  auth: {
    user: User | null,
    accessToken: string | null,
    refreshToken: string | null,
    loading: boolean,
    error: string | null,
    isAuthenticated: boolean
  }
}
```

### Available Actions

```typescript
// Login
dispatch(loginUser({ email, password }))

// Register
dispatch(registerUser({ email, password, firstName, lastName, ... }))

// Logout
dispatch(logoutUser())

// Check auth status on app start
dispatch(checkAuthStatus())

// Clear errors
dispatch(clearError())
```

## Validation Rules

### Email
- Required field
- Must be valid email format

### Password
- Required field
- Minimum 8 characters

## Next Steps

### Upcoming Features
1. ✅ Login Screen (COMPLETED)
2. 🔄 Register Screen (Next)
3. 🔄 Forgot Password Screen
4. 🔄 Home/Dashboard Screen
5. 🔄 Navigation Setup
6. 🔄 Doctor Search Screen
7. 🔄 AI Search Screen
8. 🔄 Appointment Booking

## Troubleshooting

### Common Issues

**1. Mock API not working**
- Ensure `axios-mock-adapter` is installed: `npm install axios-mock-adapter`
- Verify `API_MODE` is set to `'dummy'` in config.ts
- Check console for initialization logs

**2. Redux state not updating**
- Ensure Redux Provider is wrapping the app in App.tsx
- Check Redux DevTools for action dispatching

**3. AsyncStorage errors**
- Ensure `@react-native-async-storage/async-storage` is properly linked
- For iOS: Run `cd ios && pod install`

## Development Tips

### Quick Testing
1. Use the Quick Login button in DEV mode
2. Check Redux state with Redux DevTools
3. Monitor network requests in console
4. Test with different screen sizes

### Code Style
- Follow TypeScript strict mode
- Use proper type definitions
- Keep components focused and testable
- Use functional components with hooks

## Resources

- [React Native Documentation](https://reactnative.dev/)
- [Redux Toolkit Documentation](https://redux-toolkit.js.org/)
- [Axios Documentation](https://axios-http.com/)
- [React Navigation](https://reactnavigation.org/)
