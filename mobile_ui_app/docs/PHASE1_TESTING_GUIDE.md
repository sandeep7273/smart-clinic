# Phase 1 Testing Guide

**Quick guide to test all Phase 1 authentication features**

---

## ✅ Pre-Testing Checklist

1. **Install Dependencies:**
   ```bash
   cd mobile_ui_app
   npm install
   cd ios && pod install && cd ..
   ```

2. **Verify TypeScript Compilation:**
   ```bash
   npx tsc --noEmit
   # Should show: 0 errors
   ```

3. **Start Metro:**
   ```bash
   npm start -- --reset-cache
   ```

4. **Run App:**
   ```bash
   # iOS
   npm run ios

   # Android
   npm run android
   ```

---

## 🧪 Test Scenarios

### 1. First Launch - Splash Screen
**What to Test:**
- App shows splash screen on launch
- Loading indicator visible
- Smooth transition to Login screen

**Expected Result:**
- ✅ Splash screen shows for ~1-2 seconds
- ✅ Automatically navigates to Login screen
- ✅ No authentication errors

---

### 2. Login with Secure Storage
**Steps:**
1. Launch app
2. Click "Quick Login" button (or enter credentials manually)
3. Click "Sign In"

**What to Check:**
- Console logs show Keychain storage (check terminal)
- Smooth navigation to Dashboard
- User data displayed correctly

**Expected Logs:**
```
📤 POST /auth/login
📥 POST /auth/login - 200
Token stored in Keychain ✅
```

**Expected Result:**
- ✅ Login successful
- ✅ Navigates to Dashboard
- ✅ User name displayed
- ✅ Tokens stored in Keychain (not AsyncStorage)

---

### 3. Token Persistence - App Restart
**Steps:**
1. Login successfully
2. Close app completely (swipe up from app switcher)
3. Relaunch app

**Expected Result:**
- ✅ Splash screen shows briefly
- ✅ Automatically navigates to Dashboard
- ✅ No login screen shown
- ✅ User remains logged in

---

### 4. Logout
**Steps:**
1. From Dashboard, tap "Logout"
2. Confirm logout in alert

**Expected Result:**
- ✅ Tokens removed from Keychain
- ✅ User data cleared
- ✅ Navigates to Login screen
- ✅ Can't navigate back to Dashboard

---

### 5. Auto Token Refresh (Mock Simulation)
**Note:** This is best tested with production API that returns 401

**To Simulate:**
1. Login successfully
2. Wait for token to "expire" (in mock, tokens are valid for 1 hour)
3. Make an API call

**Expected Behavior:**
- httpClient intercepts 401
- Automatically calls refresh endpoint
- Retries original request
- User sees no interruption

**Console Logs to Look For:**
```
🔄 Token expired, attempting refresh...
✅ Token refreshed successfully
```

---

### 6. Failed Refresh - Automatic Logout
**To Test:**
1. Login successfully
2. Manually corrupt refresh token in Keychain (difficult to test without real API)
3. Or wait for refresh token to expire

**Expected Result:**
- ✅ Refresh attempt fails
- ✅ Auth data cleared automatically
- ✅ User logged out
- ✅ Navigates to Login screen

---

### 7. Registration with Secure Storage
**Steps:**
1. From Login, tap "Sign Up"
2. Fill registration form
3. Submit

**Expected Result:**
- ✅ Registration successful
- ✅ Tokens stored in Keychain
- ✅ Automatically logged in
- ✅ Navigates to Dashboard

---

### 8. Navigation Flow
**Test:**
- Login → Dashboard → Logout → Login
- Login → Register → Auto-login → Dashboard
- Login → Forgot Password → Back → Login

**Expected Result:**
- ✅ All navigation transitions smooth
- ✅ Proper auth guards on all screens
- ✅ Can't access Dashboard without login
- ✅ Can't see Login when logged in

---

## 🔍 What to Check in Console

### Successful Login:
```
🔧 Mock API Server initialized
✅ Mock API routes configured
📤 POST /auth/login
📥 POST /auth/login - 200
Tokens saved to Keychain
```

### Token Refresh:
```
📤 GET /appointments
❌ 401 - /appointments
🔄 Token expired, attempting refresh...
📤 POST /auth/refresh
📥 POST /auth/refresh - 200
✅ Token refreshed successfully
📤 GET /appointments (retry)
📥 GET /appointments - 200
```

### Logout:
```
Tokens removed from Keychain
User data cleared
Auth state reset
```

---

## 📱 Platform-Specific Testing

### iOS Testing
1. **Keychain Access:**
   - Check Xcode console for Keychain logs
   - Verify no AsyncStorage token logs

2. **Background/Foreground:**
   - Send app to background
   - Wait 30 seconds
   - Bring back to foreground
   - Should still be logged in

3. **Device Lock:**
   - Login
   - Lock device
   - Unlock device
   - Tokens should still be accessible

### Android Testing
1. **Keystore Access:**
   - Check Android logcat for Keystore logs
   - Verify secure storage usage

2. **App Switching:**
   - Switch to another app
   - Return to app
   - Session maintained

3. **Device Restart:**
   - Login
   - Restart device
   - Open app
   - Should still be logged in

---

## 🐛 Common Issues & Solutions

### Issue: "Cannot find Keychain"
**Solution:**
```bash
cd ios
pod install
cd ..
npm run ios
```

### Issue: TypeScript Errors
**Solution:**
```bash
# Restart TS server in VS Code
Cmd + Shift + P → TypeScript: Restart TS Server
```

### Issue: Metro Bundler Cache
**Solution:**
```bash
npm start -- --reset-cache
```

### Issue: Token Refresh Not Working
**Check:**
- Mock API initialized?
- Refresh endpoint configured?
- Console shows 401 response?

---

## ✅ Success Criteria

Phase 1 is working correctly if:

- [x] Splash screen shows on app launch
- [x] Login stores tokens in Keychain
- [x] App restart maintains session
- [x] Logout clears all auth data
- [x] Navigation guards work correctly
- [x] No AsyncStorage used for tokens
- [x] Console logs show proper flow
- [x] TypeScript compiles with 0 errors
- [x] No app crashes or errors

---

## 📊 Test Results Template

```markdown
## Test Session: [Date]

**Platform:** iOS / Android
**Device:** [Device Name]
**OS Version:** [Version]

### Results:

| Test Case | Status | Notes |
|-----------|--------|-------|
| Splash Screen | ✅/❌ | |
| Login | ✅/❌ | |
| Token Storage | ✅/❌ | |
| App Restart | ✅/❌ | |
| Logout | ✅/❌ | |
| Registration | ✅/❌ | |
| Navigation | ✅/❌ | |

### Issues Found:
- None / [List issues]

### Overall Status:
✅ Passed / ❌ Failed
```

---

## 🎯 Next Steps After Testing

If all tests pass:
1. ✅ Phase 1 Complete
2. ✅ Ready for Phase 2
3. ✅ Commit changes
4. ✅ Update documentation

If tests fail:
1. Check console logs
2. Review error messages
3. Follow troubleshooting guide
4. Re-run failed tests

---

**For detailed Phase 1 documentation, see PHASE1_COMPLETE.md**
