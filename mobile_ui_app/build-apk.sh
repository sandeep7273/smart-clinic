#!/bin/bash

# Smart Appointment System - APK Build Script
# This script builds an APK for local testing on Android devices

set -e  # Exit on any error

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}📱 Smart Appointment APK Builder${NC}"
echo -e "${BLUE}================================${NC}\n"

# Get build type (debug or release)
BUILD_TYPE=${1:-debug}

if [ "$BUILD_TYPE" != "debug" ] && [ "$BUILD_TYPE" != "release" ]; then
    echo -e "${RED}❌ Invalid build type. Use 'debug' or 'release'${NC}"
    echo "Usage: ./build-apk.sh [debug|release]"
    exit 1
fi

echo -e "${YELLOW}🔨 Build Type: ${BUILD_TYPE}${NC}\n"

# Step 1: Clean previous builds
echo -e "${BLUE}🧹 Cleaning previous builds...${NC}"
cd android
./gradlew clean
cd ..
echo -e "${GREEN}✅ Clean complete${NC}\n"

# Step 2: Install dependencies
echo -e "${BLUE}📦 Installing dependencies...${NC}"
npm install
echo -e "${GREEN}✅ Dependencies installed${NC}\n"

# Step 3: Build the APK
echo -e "${BLUE}🏗️  Building ${BUILD_TYPE} APK...${NC}"
echo -e "${YELLOW}⏳ This may take a few minutes...${NC}\n"

cd android
if [ "$BUILD_TYPE" = "debug" ]; then
    ./gradlew assembleDebug
else
    ./gradlew assembleRelease
fi
cd ..

echo -e "${GREEN}✅ APK build complete!${NC}\n"

# Step 4: Locate and display APK info
echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}📍 APK Location:${NC}"
echo -e "${BLUE}================================${NC}\n"

if [ "$BUILD_TYPE" = "debug" ]; then
    APK_PATH="android/app/build/outputs/apk/debug/app-debug.apk"
else
    APK_PATH="android/app/build/outputs/apk/release/app-release.apk"
fi

if [ -f "$APK_PATH" ]; then
    FULL_PATH="$(pwd)/$APK_PATH"
    FILE_SIZE=$(du -h "$APK_PATH" | cut -f1)
    
    echo -e "${GREEN}✅ APK successfully built!${NC}"
    echo -e "${YELLOW}📂 Path: ${FULL_PATH}${NC}"
    echo -e "${YELLOW}📊 Size: ${FILE_SIZE}${NC}\n"
    
    echo -e "${BLUE}================================${NC}"
    echo -e "${BLUE}📲 Installation Instructions:${NC}"
    echo -e "${BLUE}================================${NC}\n"
    
    echo "Method 1: ADB Install (Device connected via USB)"
    echo -e "  ${GREEN}adb install \"$APK_PATH\"${NC}\n"
    
    echo "Method 2: Manual Transfer"
    echo "  1. Copy the APK to your Android device"
    echo "  2. Open the file on your device"
    echo "  3. Allow installation from unknown sources if prompted"
    echo "  4. Tap 'Install'\n"
    
    echo "Method 3: Open in Finder"
    echo -e "  ${GREEN}open android/app/build/outputs/apk/$BUILD_TYPE/${NC}\n"
    
    # Offer to install directly if device is connected
    if command -v adb &> /dev/null; then
        DEVICE_COUNT=$(adb devices | grep -w "device" | wc -l)
        if [ "$DEVICE_COUNT" -gt 0 ]; then
            echo -e "${YELLOW}📱 Android device detected!${NC}"
            read -p "Would you like to install the APK now? (y/n) " -n 1 -r
            echo
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                echo -e "${BLUE}📲 Installing APK...${NC}"
                adb install -r "$APK_PATH"
                echo -e "${GREEN}✅ APK installed successfully!${NC}"
                
                # Offer to launch the app
                read -p "Would you like to launch the app? (y/n) " -n 1 -r
                echo
                if [[ $REPLY =~ ^[Yy]$ ]]; then
                    echo -e "${BLUE}🚀 Launching app...${NC}"
                    adb shell am start -n com.mobile_ui_app/.MainActivity
                    echo -e "${GREEN}✅ App launched!${NC}"
                fi
            fi
        fi
    fi
else
    echo -e "${RED}❌ APK not found at expected location: $APK_PATH${NC}"
    exit 1
fi

echo -e "\n${GREEN}🎉 Build process complete!${NC}"
