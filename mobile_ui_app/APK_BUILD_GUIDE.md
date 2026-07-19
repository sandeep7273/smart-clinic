# Building Android APK - Quick Guide

## Prerequisites

1. **Install Android SDK** (if not already installed)
2. **Enable USB Debugging** on your Android device (Settings → Developer Options → USB Debugging)
3. **Connect your device** via USB (optional, for direct installation)

## Option 1: Using the Build Script (Recommended)

### Build Debug APK (Faster - for testing)
```bash
chmod +x build-apk.sh
./build-apk.sh debug
```

### Build Release APK (Optimized - smaller size)
```bash
chmod +x build-apk.sh
./build-apk.sh release
```

The script will:
- Clean previous builds
- Install dependencies
- Build the APK
- Show the APK location
- Optionally install it on a connected device

## Option 2: Manual Build (Alternative)

### Debug APK
```bash
# Navigate to mobile app directory
cd mobile_ui_app

# Clean and build
cd android
./gradlew clean
./gradlew assembleDebug
cd ..

# APK location:
# android/app/build/outputs/apk/debug/app-debug.apk
```

### Release APK
```bash
# Navigate to mobile app directory
cd mobile_ui_app

# Clean and build
cd android
./gradlew clean
./gradlew assembleRelease
cd ..

# APK location:
# android/app/build/outputs/apk/release/app-release.apk
```

## Installing the APK

### Method 1: ADB Install (Device via USB)
```bash
# Install debug APK
adb install android/app/build/outputs/apk/debug/app-debug.apk

# OR install release APK
adb install android/app/build/outputs/apk/release/app-release.apk

# If app is already installed, use -r flag to reinstall
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

### Method 2: Manual Transfer
1. Copy the APK file to your Android device (via USB, email, cloud storage, etc.)
2. On your device, go to **Settings → Security**
3. Enable **"Install from Unknown Sources"** or **"Allow from this source"**
4. Use a file manager to locate the APK file
5. Tap the APK file and follow the installation prompts

### Method 3: Wireless ADB (Same WiFi network)
```bash
# On device: Enable wireless debugging in Developer Options
# Get device IP address from Settings → About → Status

# On computer:
adb tcpip 5555
adb connect YOUR_DEVICE_IP:5555
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

## Troubleshooting

### "Permission denied" error
```bash
chmod +x build-apk.sh
```

### Gradle build fails
```bash
# Clear gradle cache
cd android
./gradlew clean
rm -rf ~/.gradle/caches/
cd ..

# Try building again
./build-apk.sh debug
```

### "INSTALL_FAILED_UPDATE_INCOMPATIBLE" error
This happens when trying to install over an existing app with a different signature.
```bash
# Uninstall the existing app first
adb uninstall com.mobile_ui_app

# Then install the new APK
adb install android/app/build/outputs/apk/debug/app-debug.apk
```

### Metro bundler not starting
```bash
# Start metro manually in a separate terminal
npm start

# Then build and install APK in another terminal
./build-apk.sh debug
```

## APK Variants

| Variant | Size | Speed | Use Case |
|---------|------|-------|----------|
| **Debug** | Larger (~50-80MB) | Faster build | Development, Testing |
| **Release** | Smaller (~20-40MB) | Slower build | Production, Distribution |

## Important Notes

1. **Debug APKs** are signed with a debug keystore automatically
2. **Release APKs** currently use debug signing (fine for testing, but for production distribution you need a proper signed keystore)
3. The app requires **Android 6.0 (API 23)** or higher
4. For biometric features to work, your device must have **fingerprint or face unlock** enabled

## API Configuration

Before building, ensure your API endpoint is correctly configured:

**File:** `mobile_ui_app/.env` or `mobile_ui_app/src/config/api.ts`

```
API_URL=http://YOUR_API_GATEWAY_IP:3000
```

For local testing with API:
- Use your computer's IP address (not localhost)
- Example: `http://192.168.1.100:3000`
- Make sure your phone and computer are on the same WiFi network

## Next Steps

After installing the APK:
1. Open the app on your device
2. Enable biometric authentication (Settings → Fingerprint/Face unlock)
3. Test the complete flow:
   - Registration
   - Login with password
   - Enable biometric login (when prompted)
   - Logout
   - Login with biometric
   - Search for doctors
   - Book appointments

## Distribution (Future)

For proper app distribution:
1. Generate a production keystore
2. Configure signing in `android/app/build.gradle`
3. Build a signed release APK
4. Upload to Google Play Store or distribute via Firebase App Distribution
