# 🧪 Testing Checklist - Login Screen

## Pre-Testing Setup

- [ ] Dependencies installed (`npm install`)
- [ ] Pods installed (iOS: `cd ios && pod install`)
- [ ] Metro bundler running (`npm start`)
- [ ] App running on emulator/simulator
- [ ] Console visible for debugging

## 📱 UI/UX Testing

### Visual Elements
- [ ] Login screen renders correctly
- [ ] App title "Welcome Back" displays
- [ ] Subtitle "Sign in to continue" displays
- [ ] Email input field visible
- [ ] Password input field visible
- [ ] Sign In button visible and styled
- [ ] Forgot Password link visible
- [ ] Sign Up link visible
- [ ] Quick Login button visible (dev mode only)
- [ ] All text is readable and properly sized
- [ ] Colors match design (primary blue #0066FF)
- [ ] Spacing and padding are consistent

### Input Fields
- [ ] Email field accepts text input
- [ ] Email field has proper placeholder
- [ ] Email field uses email keyboard type
- [ ] Password field accepts text input
- [ ] Password field has proper placeholder
- [ ] Password field hides text by default
- [ ] Eye icon visible next to password field
- [ ] Eye icon toggles password visibility
- [ ] Both fields have proper labels
- [ ] Fields are disabled during loading

### Responsive Behavior
- [ ] Keyboard pushes content up (not covered)
- [ ] ScrollView works when keyboard is open
- [ ] Content scrolls smoothly
- [ ] Layout adapts to different screen sizes
- [ ] Safe area respected on notched devices
- [ ] Landscape mode works (if applicable)

## ✅ Functionality Testing

### Form Validation - Empty Fields
- [ ] Leave email empty, click Sign In
- [ ] "Email is required" error appears
- [ ] Leave password empty, click Sign In
- [ ] "Password is required" error appears
- [ ] Leave both empty, click Sign In
- [ ] Both error messages appear
- [ ] Error text is red
- [ ] Input fields have red border when error

### Form Validation - Invalid Email
- [ ] Enter "test" in email, click Sign In
- [ ] "Invalid email format" error appears
- [ ] Enter "test@" in email, click Sign In
- [ ] Error persists
- [ ] Enter "test@domain" in email, click Sign In
- [ ] Error persists
- [ ] Enter "test@domain.com" in email
- [ ] Error clears when typing valid email

### Form Validation - Password
- [ ] Enter "123" in password, click Sign In
- [ ] "Password must be at least 8 characters" error appears
- [ ] Enter "1234567" (7 chars), click Sign In
- [ ] Error persists
- [ ] Enter "12345678" (8 chars)
- [ ] Error clears

### Password Visibility Toggle
- [ ] Enter password, text is hidden (••••)
- [ ] Click eye icon
- [ ] Password becomes visible
- [ ] Click eye icon again
- [ ] Password becomes hidden again
- [ ] Toggle works multiple times
- [ ] Toggle state persists while typing

### Quick Login (Dev Mode)
- [ ] Click "🔧 Quick Login (Dev Only)" button
- [ ] Email field fills with "patient@test.com"
- [ ] Password field fills with "password123"
- [ ] Fields are pre-populated correctly
- [ ] Can modify pre-filled values
- [ ] Can proceed to login

### Successful Login
- [ ] Use test credentials:
  - Email: patient@test.com
  - Password: password123
- [ ] Click "Sign In"
- [ ] Button text changes to loading spinner
- [ ] Button becomes slightly transparent
- [ ] Input fields become disabled
- [ ] No console errors appear
- [ ] Wait ~800ms for mock API response
- [ ] Success alert appears
- [ ] Alert shows "Login successful!"
- [ ] No errors in console
- [ ] Redux state updated (check with DevTools)

### Failed Login - Wrong Credentials
- [ ] Enter email: "wrong@test.com"
- [ ] Enter password: "wrongpass"
- [ ] Click "Sign In"
- [ ] Loading state appears
- [ ] After delay, error message appears
- [ ] Error shows "Invalid email or password"
- [ ] Error is in red box with warning icon
- [ ] Button returns to normal state
- [ ] Can try logging in again

### Failed Login - Wrong Password
- [ ] Enter email: "patient@test.com"
- [ ] Enter password: "wrongpassword"
- [ ] Click "Sign In"
- [ ] Error appears: "Invalid email or password"
- [ ] User data NOT stored
- [ ] Can retry with correct password

### Forgot Password
- [ ] Click "Forgot Password?" link
- [ ] Alert appears asking to enter email first (if empty)
- [ ] Enter email: "patient@test.com"
- [ ] Click "Forgot Password?" again
- [ ] Alert shows "Password reset link would be sent to..."
- [ ] Displays entered email in alert
- [ ] Click OK to dismiss

### Sign Up Navigation
- [ ] Click "Sign Up" link
- [ ] Alert appears with "Navigate to registration screen"
- [ ] (Will navigate to register screen when implemented)

## 🔧 Technical Testing

### Redux State Management
- [ ] Install Redux DevTools (if available)
- [ ] Initial state is correct (not authenticated)
- [ ] Click Sign In
- [ ] `auth/login/pending` action dispatched
- [ ] State shows loading: true
- [ ] After success: `auth/login/fulfilled` dispatched
- [ ] State updated with user data
- [ ] State shows isAuthenticated: true
- [ ] State shows accessToken
- [ ] State shows refreshToken
- [ ] State shows loading: false
- [ ] State shows error: null

### AsyncStorage Persistence
- [ ] Login successfully
- [ ] Check AsyncStorage for:
  - [ ] "accessToken" key exists
  - [ ] "refreshToken" key exists
  - [ ] "user" key exists with JSON data
- [ ] Values are strings
- [ ] User data is valid JSON
- [ ] Tokens have correct format

### Mock API Testing
- [ ] Check console on app start
- [ ] See "🔧 Mock API Server initialized" log
- [ ] See "✅ Mock API routes configured" log
- [ ] See test credentials log
- [ ] Login triggers mock API
- [ ] Network tab shows POST request (if inspecting)
- [ ] Response has correct format
- [ ] Response delay is ~800ms

### API Mode Switching
- [ ] Config shows `API_MODE: 'dummy'`
- [ ] Mock API initializes
- [ ] Login uses mock endpoints
- [ ] Change to `API_MODE: 'production'`
- [ ] Restart app
- [ ] App uses production URL (will fail without backend)

### Error Handling
- [ ] Network errors handled gracefully
- [ ] Timeout errors show appropriate message
- [ ] Multiple rapid clicks don't break app
- [ ] Errors clear when retrying
- [ ] Console shows no uncaught errors

## 🎨 Styling Testing

### Light Mode
- [ ] All text is readable
- [ ] Colors contrast well
- [ ] Buttons have proper shadows
- [ ] Error messages are visible

### Dark Mode (if implemented)
- [ ] Toggle device to dark mode
- [ ] Colors adapt appropriately
- [ ] Text remains readable
- [ ] Shadows still visible

### Accessibility
- [ ] Text size is readable
- [ ] Touch targets are adequate (min 44x44)
- [ ] Color contrast is sufficient
- [ ] Error messages are clear

## 📊 Performance Testing

- [ ] App launches quickly
- [ ] Login screen renders instantly
- [ ] Typing in fields is responsive (no lag)
- [ ] Button presses respond immediately
- [ ] API calls complete in reasonable time
- [ ] No memory leaks (check with profiler)
- [ ] Smooth animations
- [ ] No jank or stutter

## 🔒 Security Testing

- [ ] Password is hidden by default
- [ ] Password not visible in console logs
- [ ] Tokens stored securely in AsyncStorage
- [ ] No sensitive data in Redux DevTools
- [ ] No credentials in error messages
- [ ] API requests use proper headers

## 📱 Platform-Specific Testing

### iOS
- [ ] Test on iPhone SE (small screen)
- [ ] Test on iPhone 14 Pro (notch)
- [ ] Test on iPad (if supported)
- [ ] Keyboard behavior correct
- [ ] Safe area insets respected
- [ ] Status bar style correct

### Android
- [ ] Test on small device
- [ ] Test on large device
- [ ] Test on tablet (if supported)
- [ ] Keyboard behavior correct
- [ ] Back button behavior (if applicable)
- [ ] Status bar style correct

## 🐛 Edge Cases

- [ ] Very long email address
- [ ] Very long password
- [ ] Special characters in email
- [ ] Special characters in password
- [ ] Emoji in fields
- [ ] Copy/paste in fields
- [ ] Rapid button clicking
- [ ] Switching apps mid-login
- [ ] Network loss during login
- [ ] App backgrounded during login

## 📋 Final Checks

- [ ] No TypeScript errors
- [ ] No ESLint warnings
- [ ] No console errors
- [ ] No console warnings
- [ ] Code is properly formatted
- [ ] All imports are used
- [ ] No commented-out code
- [ ] Documentation is complete

## ✅ Sign-Off

**Tested By:** ___________________  
**Date:** ___________________  
**Platform:** iOS / Android / Both  
**Device:** ___________________  
**Result:** Pass / Fail / Needs Work  

**Notes:**
```
_________________________________________________
_________________________________________________
_________________________________________________
```

---

## 🎯 Success Criteria

A successful test means:
- ✅ All critical functionality works
- ✅ No breaking bugs
- ✅ UX is smooth and intuitive
- ✅ Error handling is robust
- ✅ Performance is acceptable
- ✅ Code quality is high

## 📝 Bug Report Template

If you find issues, document them:

```
Bug #: ___
Title: ___________________
Severity: Critical / High / Medium / Low
Steps to Reproduce:
1. 
2. 
3. 

Expected Result:
___________________

Actual Result:
___________________

Screenshots/Logs:
___________________
```

---

**Happy Testing! 🧪✨**
