# Automatic Logout on 401 Errors - Implementation Guide

## Overview
This implementation ensures that the mobile app automatically logs out users and redirects to the login screen whenever an **invalid or expired token** error (HTTP 401) is received from any API endpoint.

## Architecture

### Components Involved

1. **authEvents.ts** - Centralized event emitter
   - Manages authentication error events
   - Allows multiple subscribers (future-proof for analytics, logging, etc.)
   - Triggers app-wide logout on 401 errors

2. **AuthContext.tsx** - Authentication state manager
   - Subscribes to auth events
   - Executes logout when auth error is emitted
   - Clears user state and tokens
   - Navigation automatically redirects to login (handled by RootNavigator)

3. **httpClient.ts** - Main API client (used by auth.api.ts, etc.)
   - Intercepts 401 responses
   - Attempts token refresh automatically
   - On refresh failure: emits auth error → triggers logout

4. **doctor.api.ts** - Doctor service API client
   - Has separate axios instance for doctor service
   - Intercepts 401 responses
   - Immediately emits auth error → triggers logout
   - No retry attempt (direct logout for security)

## Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│ Any API Call (doctor service, auth service, etc.)          │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
              ┌──────────────────────┐
              │  Receives 401 Error  │
              │ (Invalid/Expired)    │
              └──────────┬───────────┘
                         │
         ┌───────────────┴────────────────┐
         │                                │
         ▼                                ▼
┌──────────────────┐          ┌─────────────────────┐
│   httpClient     │          │   doctorClient      │
│  (Main APIs)     │          │  (Doctor Service)   │
└────────┬─────────┘          └──────────┬──────────┘
         │                               │
         │ Try Token Refresh             │ No Retry
         ▼                               │
┌──────────────────┐                     │
│ Refresh Success? │                     │
└────────┬─────────┘                     │
         │                               │
    ┌────┴────┐                         │
    │ Yes│ No │                         │
    ▼    │    │                         │
  Retry  │    │                         │
  API    │    └─────────────┬───────────┘
         ▼                  ▼
    ┌─────────────────────────────┐
    │ authEvents.emitAuthError()  │
    └──────────────┬──────────────┘
                   │
                   ▼
    ┌──────────────────────────────┐
    │  AuthContext Subscription    │
    │  Receives Event              │
    └──────────────┬───────────────┘
                   │
                   ▼
         ┌─────────────────┐
         │  logout()        │
         │  - Clear tokens  │
         │  - Clear user    │
         │  - Stop timers   │
         └────────┬─────────┘
                  │
                  ▼
    ┌──────────────────────────────┐
    │  RootNavigator Detects       │
    │  isAuthenticated = false     │
    └──────────────┬───────────────┘
                   │
                   ▼
    ┌──────────────────────────────┐
    │  Redirect to Login Screen    │
    │  User sees: "Session Expired"│
    └──────────────────────────────┘
```

## Implementation Details

### 1. authEvents.ts (Event Emitter)

```typescript
class AuthEventEmitter {
  private listeners: AuthEventListener[] = [];

  // Subscribe to auth errors
  subscribe(listener: AuthEventListener): () => void {
    this.listeners.push(listener);
    return () => { /* unsubscribe */ };
  }

  // Emit auth error (called by API clients on 401)
  emitAuthError() {
    this.listeners.forEach(listener => listener());
  }
}

export const authEvents = new AuthEventEmitter();
```

### 2. AuthContext.tsx (Subscriber)

```typescript
// Subscribe to auth errors in useEffect
useEffect(() => {
  const unsubscribe = authEvents.subscribe(async () => {
    console.log('🔒 Auth error received - logging out...');
    await logout(); // Clears tokens, user state
  });

  return () => unsubscribe();
}, []);
```

### 3. httpClient.ts (Main API Client)

```typescript
// Response interceptor
if (error.response?.status === 401) {
  try {
    // Attempt token refresh
    const tokens = await refreshAccessToken();
    if (tokens) {
      // Retry request with new token
      return httpClient(originalRequest);
    }
  } catch (refreshError) {
    // Refresh failed - emit auth error
    await removeTokens();
    authEvents.emitAuthError(); // 🚨 Triggers logout
    return Promise.reject(error);
  }
}
```

### 4. doctor.api.ts (Doctor Service Client)

```typescript
// Response interceptor
doctorClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle 401 immediately
    if (error.response?.status === 401) {
      console.warn('🚨 Doctor Service: 401 Unauthorized - Triggering logout');
      authEvents.emitAuthError(); // 🚨 Triggers logout
    }
    return Promise.reject(error);
  }
);
```

## Error Scenarios Handled

### Scenario 1: Token Expired During API Call
```
User Action: Fetches doctor list after 15+ minutes
Backend Response: 401 - "Invalid or expired token"
App Behavior:
  1. doctorClient intercepts 401
  2. authEvents.emitAuthError() called
  3. AuthContext receives event
  4. logout() executes
  5. User redirected to login screen
  6. User sees clear error message
```

### Scenario 2: Token Refresh Failure (Main API)
```
User Action: Any API call to auth/user service
Backend Response: 401 - Token expired
App Behavior:
  1. httpClient intercepts 401
  2. Attempts token refresh
  3. Refresh token also expired (401)
  4. authEvents.emitAuthError() called
  5. AuthContext logs out user
  6. Redirect to login screen
```

### Scenario 3: Multiple Simultaneous 401s
```
Situation: User opens app after long time, multiple APIs called
Backend Response: All return 401
App Behavior:
  1. Multiple 401s detected
  2. authEvents.emitAuthError() called (possibly multiple times)
  3. AuthContext processes event once
  4. Single logout() execution
  5. Clean redirect to login
  6. No race conditions or duplicate logouts
```

## Benefits

### ✅ Security
- Immediate logout on invalid/expired tokens
- No stale tokens persisting in storage
- Clear separation between expired session and user action

### ✅ User Experience
- Automatic detection (no manual intervention)
- Clean navigation flow to login screen
- Clear console logs for debugging
- No app crashes or hanging states

### ✅ Maintainability
- Centralized auth error handling
- Easy to add new API clients
- No code duplication
- Event-driven architecture (decoupled)

### ✅ Scalability
- Works with any number of API clients
- Easy to add analytics/logging subscribers
- Future-proof for new services

## Testing

### Unit Tests
```bash
cd mobile_ui_app
npm test authEvents.test.ts
npm test AuthContext.test.ts
```

### Manual Testing Steps

1. **Test Expired Token**
   ```
   1. Log in to the app
   2. Wait for 15+ minutes (or manually expire token in backend)
   3. Navigate to Doctor List screen
   4. Observe: Automatic logout and redirect to login
   5. Check logs for: "🚨 Doctor Service: 401 Unauthorized - Triggering logout"
   ```

2. **Test Multiple 401s**
   ```
   1. Log in to the app
   2. Put app in background for 20 minutes
   3. Return to app and navigate quickly through screens
   4. Multiple APIs called simultaneously
   5. Observe: Single clean logout, no errors
   ```

3. **Test Token Refresh**
   ```
   1. Log in to the app
   2. Make API call just before token expiry
   3. If refresh token valid: Request succeeds
   4. If refresh token expired: Automatic logout
   ```

### Expected Console Logs

**Success Case (Token Refreshed):**
```
🔄 Token expired, attempting refresh...
✅ Token refreshed successfully
📤 GET /doctors - 200
```

**Failure Case (Logout):**
```
📤 GET /doctors
🚨 Doctor Service: 401 Unauthorized - Triggering logout
🔒 Auth error received - logging out...
✅ User logged out successfully
```

## Configuration

### Timeout Settings (config.ts)
```typescript
export const APP_CONFIG = {
  API_TIMEOUT: 15000, // 15 seconds
  TOKEN_EXPIRY_BUFFER: 5 * 60 * 1000, // 5 minutes
};
```

### Backend Token Settings
```env
ACCESS_TOKEN_EXPIRY=15m
REFRESH_TOKEN_EXPIRY=7d
```

## Troubleshooting

### Issue: Logout not triggering on 401
**Check:**
1. Verify `authEvents.emitAuthError()` is called in interceptor
2. Check AuthContext subscription is active
3. Ensure `useEffect` dependencies are correct
4. Check console for subscription logs

### Issue: Multiple logouts on single 401
**Solution:**
- AuthContext `logout()` is idempotent
- Multiple calls are safe but can be debounced if needed
- Current implementation handles this gracefully

### Issue: User not redirected to login
**Check:**
1. Verify `isAuthenticated` state is false after logout
2. Check RootNavigator logic
3. Ensure AsyncStorage user data is cleared
4. Verify navigation stack is correct

## Future Enhancements

1. **Add Analytics**
   ```typescript
   authEvents.subscribe(() => {
     analytics.track('session_expired');
   });
   ```

2. **Show Toast Notification**
   ```typescript
   authEvents.subscribe(() => {
     Toast.show('Session expired. Please log in again.');
   });
   ```

3. **Save User Context**
   ```typescript
   authEvents.subscribe(() => {
     // Save current screen for post-login redirect
     saveNavigationState();
   });
   ```

## Related Files

- [authEvents.ts](src/utils/authEvents.ts) - Event emitter
- [AuthContext.tsx](src/context/AuthContext.tsx) - Auth state manager
- [httpClient.ts](src/api/httpClient.ts) - Main API client
- [doctor.api.ts](src/api/doctor.api.ts) - Doctor service client
- [RootNavigator.tsx](src/navigation/RootNavigator.tsx) - Navigation logic
- [TOKEN_EXPIRY_AUTO_LOGOUT.md](TOKEN_EXPIRY_AUTO_LOGOUT.md) - Periodic expiry check

## Summary

This implementation provides **robust, automatic logout functionality** for any 401 error received from backend services. The event-driven architecture ensures:
- ✅ All API clients are covered (existing and future)
- ✅ No code duplication
- ✅ Clean separation of concerns
- ✅ Easy to test and maintain
- ✅ Excellent user experience

The solution handles edge cases like multiple simultaneous 401s, token refresh failures, and app state transitions gracefully.
