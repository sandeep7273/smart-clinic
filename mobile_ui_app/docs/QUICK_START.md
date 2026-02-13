# 🚀 Quick Start Guide - Smart Appointment System

**Last Updated:** February 2, 2026  
**Status:** ✅ Ready for Testing

## ⚡ 5-Minute Setup

### 1. Install Dependencies
```bash
cd mobile_ui_app
npm install
```

### 2. iOS Setup (Mac only)
```bash
cd ios
bundle install
bundle exec pod install
cd ..
```

### 3. Run the App
**Android:**
```bash
npm run android
```

**iOS:**
```bash
npm run ios
```

### 4. Test the Complete Authentication Flow
- The app will open to the **Login screen**
- **Option 1 - Quick Login:**
  - Click **"🔧 Quick Login (Dev Only)"** button
  - This auto-fills the form and you can click Sign In
- **Option 2 - Manual Login:**
  - Email: `patient@test.com`
  - Password: `password123`
  - Click **"Sign In"**
- **Option 3 - Register New Account:**
  - Click **"Sign Up"** link
  - Fill the registration form
  - Submit to auto-login
- After successful login, you'll be navigated to the **Dashboard** ✅

## 📱 What You'll See

### 1. **Login Screen**
- Email input field with validation
- Password input field with show/hide toggle
- Sign In button with loading state
- Forgot Password link
- Sign Up link
- Quick Login button (dev only)

### 2. **Register Screen**
- First Name and Last Name
- Email with format validation
- Phone number
- Date of Birth (optional)
- Password with strength indicator
- Confirm Password with matching check
- Sign Up button
- Back to Login link

### 3. **Forgot Password Screen**
- Email input
- Submit button
- Success confirmation
- Help text
- Back to Login link

### 4. **Dashboard Screen (After Login)**
- Welcome message with your name
- Quick stats cards:
  - Upcoming Appointments
  - Completed Appointments
  - Cancelled Appointments
- Feature cards:
  - Find Doctor (coming soon)
  - AI Search (coming soon)
  - My Appointments (coming soon)
  - My Profile (coming soon)
- User information display
- Logout button

### 5. **Navigation Flow:**
   - Loading spinner appears
   - Mock API responds after 800ms
   - Success alert shows
   - Token stored in AsyncStorage

3. **Error Scenarios:**
   - Empty fields → Validation errors
   - Invalid email → "Invalid email format"
   - Wrong password → "Invalid email or password"
   - Short password → "Password must be at least 8 characters"

## 🔑 Test Credentials

```
Email: patient@test.com
Password: password123
```

```
Email: doctor@test.com
Password: password123
```

## 🎯 Key Features to Test

### ✅ Form Validation
1. Leave email empty and click Sign In
2. Enter invalid email (e.g., "test")
3. Enter short password (e.g., "123")
4. Watch field-level errors appear

### ✅ Password Toggle
1. Enter password
2. Click the eye icon
3. Password becomes visible/hidden

### ✅ Loading State
1. Click Sign In
2. Button shows loading spinner
3. Fields become disabled
4. Wait for response

### ✅ Error Handling
1. Enter wrong credentials
2. Watch error message appear
3. Error is highlighted in red box

### ✅ Forgot Password
1. Enter email
2. Click "Forgot Password?"
3. Alert shows password reset message

## 🔧 Configuration

All configuration is in `src/constants/config.ts`:

```typescript
export const APP_CONFIG = {
  API_MODE: 'dummy',  // ← Change to 'production' when ready
  DUMMY_API_URL: 'http://localhost:3001/api',
  PRODUCTION_API_URL: 'https://api.smartappointment.com/api',
  API_TIMEOUT: 10000,
};
```

## 📂 Main Files to Review

1. **Login Screen**
   - `src/screens/Login/LoginScreen.tsx`
   - `src/screens/Login/Login.styles.ts`

2. **State Management**
   - `src/store/auth/authSlice.ts`
   - `src/store/auth/authThunks.ts`

3. **API Layer**
   - `src/api/httpClient.ts`
   - `src/api/auth.api.ts`
   - `src/api/mockApi.ts`

4. **Configuration**
   - `src/constants/config.ts`
   - `src/constants/apiEndpoints.ts`

5. **Utilities**
   - `src/utils/validation.ts`

## 🐛 Troubleshooting

### Issue: Metro bundler not starting
```bash
npm start -- --reset-cache
```

### Issue: Pods not installing (iOS)
```bash
cd ios
rm -rf Pods Podfile.lock
bundle exec pod install --repo-update
cd ..
```

### Issue: Module not found
```bash
npm install
cd ios && pod install && cd ..
```

### Issue: Mock API not working
1. Check console for initialization logs
2. Verify `API_MODE: 'dummy'` in config.ts
3. Ensure axios-mock-adapter is installed

### Issue: Redux state not updating
1. Check Redux Provider in App.tsx
2. Verify store is imported correctly
3. Use Redux DevTools to inspect actions

## 📱 Development Tips

### Hot Reload
- Save any file to trigger hot reload
- Changes reflect immediately
- State is preserved

### Fast Refresh
- Works for most React components
- Preserves component state
- Instant feedback

### Debug Menu
- **Android:** Shake device or press Ctrl+M
- **iOS:** Shake device or press Cmd+D
- Enable Remote JS Debugging for breakpoints

### Console Logs
Check console for helpful logs:
```
🔧 Mock API Server initialized
✅ Mock API routes configured
📧 Test credentials: patient@test.com / password123
```

## 🎨 UI Customization

Want to change colors? Edit `src/screens/Login/Login.styles.ts`:

```typescript
const COLORS = {
  primary: '#0066FF',      // ← Change this!
  error: '#FF3B30',
  // ... more colors
};
```

## 📚 Documentation

- [LOGIN_SCREEN.md](./LOGIN_SCREEN.md) - Detailed feature documentation
- [MOCK_API_REFERENCE.md](./MOCK_API_REFERENCE.md) - API endpoints reference
- [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md) - Complete implementation details

## ✅ Success Checklist

- [ ] App builds successfully
- [ ] Login screen displays correctly
- [ ] Quick Login button works
- [ ] Manual login works
- [ ] Form validation shows errors
- [ ] Password toggle works
- [ ] Loading state displays
- [ ] Success alert appears
- [ ] Token stored in AsyncStorage

## 🎉 Next Steps

Once login is working:

1. **Test on both platforms** (iOS and Android)
2. **Review the code** to understand the patterns
3. **Check AsyncStorage** to see stored tokens
4. **Test error scenarios** thoroughly
5. **Ready for Register Screen** implementation

---

**Need Help?** Check the detailed documentation in the `docs/` folder!

**Happy Coding! 🚀**
