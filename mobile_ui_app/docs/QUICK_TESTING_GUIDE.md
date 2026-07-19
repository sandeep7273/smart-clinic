# 🧪 Quick Testing Guide

## 🚀 Run the App

```bash
cd mobile_ui_app
npm start
```

In another terminal:
```bash
npm run android  # or npm run ios
```

---

## 🔄 Test Flow 1: New User Registration

### Step 1: Register Screen
```
1. App opens at Login Screen
2. Click "Sign Up" link at bottom
3. Fill the registration form:
   ✏️ First Name: Test
   ✏️ Last Name: User
   ✏️ Email: testuser@example.com
   ✏️ Phone: +1234567890
   ✏️ Date of Birth: 1995-05-15 (optional)
   ✏️ Password: password123
   ✏️ Confirm: password123
4. Click "Sign Up" button
```

### Expected Result:
✅ Loading spinner appears  
✅ Success - Auto-navigates to Dashboard  
✅ Shows "Welcome back, Test User"  
✅ Dashboard displays all sections  

---

## 🔄 Test Flow 2: Existing User Login

### Step 1: Login Screen
```
1. If on Register screen, click "Already have an account? Sign In"
2. Or click logout from Dashboard
3. On Login Screen:
   ✏️ Email: patient@test.com
   ✏️ Password: password123
4. Click "Sign In" button
```

### Expected Result:
✅ Loading spinner appears  
✅ Auto-navigates to Dashboard  
✅ Shows "Welcome back, John Doe"  
✅ User info shows correct email  

### Quick Test Shortcut:
Click "🔧 Quick Login (Dev Only)" button - instant fill!

---

## 🔄 Test Flow 3: Forgot Password

### Step 1: Navigate to Forgot Password
```
1. On Login Screen
2. Click "Forgot Password?" link
3. See Forgot Password Screen with 🔐 icon
```

### Step 2: Request Reset
```
1. Enter email: patient@test.com
2. Click "Send Reset Link"
```

### Expected Result:
✅ Success message appears  
✅ Shows "Check Your Email"  
✅ Email displayed in message  
✅ Can click "Back to Sign In"  

---

## 🔄 Test Flow 4: Dashboard Features

### After Login, Dashboard Shows:

#### Header Section
```
✅ "Welcome back, [First Name] [Last Name]"
✅ Logout icon (🚪) in top right
```

#### Quick Stats Cards
```
┌─────────┬─────────┬─────────┐
│    0    │    0    │    0    │
│ Upcoming│Completed│Cancelled│
└─────────┴─────────┴─────────┘
```

#### Features Grid (4 Cards)
```
┌────────────────┬────────────────┐
│ 🔍 Find Doctor │ 🤖 AI Search   │
│  Coming Soon   │  Coming Soon   │
├────────────────┼────────────────┤
│ 📅 Appointments│ 👤 My Profile  │
│  Coming Soon   │  Coming Soon   │
└────────────────┴────────────────┘
```

#### User Info Card
```
Email: [user email]
Phone: [user phone or "Not provided"]
Account Type: PATIENT
```

#### Footer
```
Smart Appointment System v1.0.0
Your health, simplified
```

---

## 🔄 Test Flow 5: Logout

### Step 1: Click Logout
```
1. On Dashboard
2. Click 🚪 icon in top right
3. Confirmation alert appears:
   "Are you sure you want to logout?"
```

### Step 2: Confirm
```
1. Click "Logout" (red option)
```

### Expected Result:
✅ User logged out  
✅ Auto-navigates to Login Screen  
✅ AsyncStorage cleared  
✅ Can't go back to Dashboard  

---

## 🔄 Test Flow 6: Navigation Back Button

### From Register Screen
```
1. On Register Screen
2. Click "Already have an account? Sign In"
```
**Expected:** Returns to Login ✅

### From Forgot Password Screen
```
1. On Forgot Password Screen
2. Click "← Back to Sign In"
```
**Expected:** Returns to Login ✅

---

## 🧪 Validation Tests

### Test Invalid Email
```
1. On any form with email
2. Enter: "notanemail"
3. Click submit
```
**Expected:** "Invalid email format" error ✅

### Test Short Password
```
1. On Register/Login
2. Enter password: "123"
3. Click submit
```
**Expected:** "Password must be at least 8 characters" ✅

### Test Password Mismatch
```
1. On Register Screen
2. Password: "password123"
3. Confirm: "password456"
4. Click Sign Up
```
**Expected:** "Passwords do not match" error ✅

### Test Empty Fields
```
1. On any form
2. Leave fields empty
3. Click submit
```
**Expected:** Field-specific errors appear ✅

---

## 📱 UI Tests

### Test Password Toggle
```
1. On any password field
2. Enter password (should show •••)
3. Click eye icon 👁️
```
**Expected:** Password becomes visible ✅

### Test Loading State
```
1. Submit any form
2. Observe button during API call
```
**Expected:** 
- Button shows spinner ✅
- Fields become disabled ✅
- Button slightly transparent ✅

### Test Keyboard Behavior
```
1. Focus any input field
2. Keyboard appears
```
**Expected:**
- Content scrolls up ✅
- Input visible above keyboard ✅
- Can scroll if needed ✅

---

## 🎯 Persistence Tests

### Test 1: App Restart with Login
```
1. Login to app
2. Close app completely
3. Reopen app
```
**Expected:** Still logged in, shows Dashboard ✅

### Test 2: App Restart without Login
```
1. Logout from app
2. Close app completely
3. Reopen app
```
**Expected:** Shows Login Screen ✅

---

## ⚡ Quick Testing Checklist

### Login Screen
- [ ] Email validation works
- [ ] Password validation works
- [ ] Show/hide password toggle
- [ ] Quick Login button (dev mode)
- [ ] "Forgot Password?" navigates correctly
- [ ] "Sign Up" navigates to Register
- [ ] Successful login goes to Dashboard
- [ ] Error messages display correctly

### Register Screen
- [ ] All fields validate correctly
- [ ] Password matching works
- [ ] Email format validation
- [ ] Phone format validation
- [ ] Show/hide password toggles
- [ ] "Already have account" goes to Login
- [ ] Successful registration goes to Dashboard
- [ ] Error messages display correctly

### Forgot Password Screen
- [ ] Email validation works
- [ ] Success message appears
- [ ] "Back to Sign In" works
- [ ] "try again" link works

### Dashboard Screen
- [ ] User name displays correctly
- [ ] Stats cards show zeros
- [ ] All 4 feature cards display
- [ ] "Coming Soon" badges visible
- [ ] User info displays correctly
- [ ] Logout button works
- [ ] Logout confirmation appears
- [ ] After logout, goes to Login

### Navigation
- [ ] Login → Register → Login
- [ ] Login → Forgot Password → Login
- [ ] After Login → Dashboard automatically
- [ ] After Logout → Login automatically
- [ ] App restart maintains auth state

---

## 🐛 Known Expected Behavior

### Features Show "Coming Soon"
- ✅ This is correct!
- ✅ Find Doctor, AI Search, Appointments, Profile not implemented yet
- ✅ Dashboard is the only working screen after login

### Stats Show Zero
- ✅ This is correct!
- ✅ No appointments created yet
- ✅ Will update when appointment booking is implemented

### Mock API Delay
- ✅ ~800ms delay is intentional
- ✅ Simulates real network latency
- ✅ Shows loading states properly

---

## ✅ Success Criteria

All tests pass if:
- ✅ No crashes
- ✅ No TypeScript errors
- ✅ Navigation flows smoothly
- ✅ Forms validate correctly
- ✅ Login/logout works
- ✅ Auth state persists
- ✅ UI is responsive
- ✅ Loading states appear
- ✅ Error messages are clear

---

## 📸 Screenshot Checklist

Take screenshots of:
1. ✅ Login Screen
2. ✅ Register Screen (full form)
3. ✅ Forgot Password Screen
4. ✅ Dashboard Screen
5. ✅ Validation errors
6. ✅ Loading states
7. ✅ Logout confirmation

---

## 🎉 If All Tests Pass

**Congratulations!** 🎊

Your Smart Appointment System authentication flow is:
- ✅ Fully functional
- ✅ Production-ready
- ✅ User-friendly
- ✅ Well-architected

**Next:** Start building the doctor search and booking features!

---

## 🆘 Troubleshooting

### App Won't Start
```bash
# Clear cache
npm start -- --reset-cache

# Reinstall
rm -rf node_modules
npm install
```

### Pods Issues (iOS)
```bash
cd ios
rm -rf Pods Podfile.lock
pod install
cd ..
```

### Navigation Not Working
- Check if NavigationContainer is in App.tsx
- Verify all screens are exported correctly
- Check console for errors

### Login Not Working
- Verify API_MODE is 'dummy' in config.ts
- Check console for mock API logs
- Ensure axios-mock-adapter is installed

---

**Happy Testing!** 🧪✨
