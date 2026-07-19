# Smart Appointment System - Setup Guide

**Last Updated**: February 3, 2026

This guide will help you set up the Smart Appointment System development environment from scratch.

---

## Prerequisites

### System Requirements

**For All Development**:
- macOS, Linux, or Windows 10/11
- Git 2.x or higher
- Node.js 18.x or 20.x LTS
- npm 9.x or yarn 1.22.x
- Code editor (VS Code recommended)

**For Mobile Development**:
- Node.js 18.x or 20.x
- React Native CLI
- Watchman (for macOS)

**For iOS Development**:
- macOS only
- Xcode 14.0 or higher
- CocoaPods 1.11.x or higher
- iOS Simulator or physical iOS device

**For Android Development**:
- Android Studio
- JDK 17
- Android SDK (API 31 or higher)
- Android Emulator or physical Android device

**For Backend Development**:
- Node.js 18.x or 20.x LTS
- MongoDB 6.0 or higher (local or Atlas)
- Docker (optional, for containerization)
- Postman or cURL (for API testing)

---

## 1. Repository Setup

### Clone the Repository

```bash
git clone <repository-url>
cd smart-appointment-system
```

### Verify Repository Structure

```bash
# Should see these folders
ls -la

# Expected output:
# mobile-app/
# services/
#   auth-service/
# docs/
# infrastructure/
# observability/
# ci-cd/
```

---

## 2. Mobile App Setup

### Navigate to Mobile App

```bash
cd mobile-app
```

### Install Dependencies

```bash
npm install
```

### iOS Setup (macOS only)

```bash
# Install CocoaPods dependencies
cd ios
pod install
cd ..
```

### Android Setup

1. Open Android Studio
2. Go to Settings → Appearance & Behavior → System Settings → Android SDK
3. Install required SDK platforms and tools
4. Configure `ANDROID_HOME` environment variable:

```bash
# Add to ~/.zshrc or ~/.bash_profile
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/platform-tools
```

### Start Metro Bundler

```bash
# In mobile-app directory
npm start
```

### Run on iOS

```bash
# In a new terminal, in mobile-app directory
npm run ios

# Or specify simulator
npx react-native run-ios --simulator="iPhone 15"
```

### Run on Android

```bash
# Start Android emulator first, then:
npm run android
```

### Common Mobile Issues

**Issue**: "Command PhaseScriptExecution failed"
```bash
cd ios
pod deintegrate
pod install
cd ..
```

**Issue**: Keychain not loading
- This is expected in development
- App uses AsyncStorage as fallback
- Production builds will use Keychain

**Issue**: Metro bundler cache issues
```bash
npm start -- --reset-cache
```

---

## 3. Auth Service Setup

### Navigate to Auth Service

```bash
cd services/auth-service
```

### Install Dependencies

```bash
npm install
```

### MongoDB Setup

**Option 1: Local MongoDB** (Recommended for Development)

```bash
# macOS with Homebrew
brew tap mongodb/brew
brew install mongodb-community@6.0
brew services start mongodb-community@6.0

# Verify MongoDB is running
mongosh
```

**Option 2: MongoDB Atlas** (Cloud)

1. Create account at [mongodb.com/cloud/atlas](https://mongodb.com/cloud/atlas)
2. Create a free cluster
3. Get connection string
4. Replace in `.env` file

**Option 3: Docker**

```bash
docker run -d -p 27017:27017 --name mongodb mongo:6.0
```

### Configure Environment Variables

```bash
# Copy example environment file
cp .env.example .env

# Edit .env file
nano .env
```

**Generate JWT Secrets**:
```bash
# Generate secure secrets
openssl rand -base64 32  # For JWT_ACCESS_SECRET
openssl rand -base64 32  # For JWT_REFRESH_SECRET
```

**Update .env**:
```env
NODE_ENV=development
PORT=4001

# MongoDB
MONGODB_URI=mongodb://localhost:27017/smart_appointment_system

# JWT Configuration - REPLACE WITH YOUR GENERATED SECRETS
JWT_ACCESS_SECRET=your_generated_access_secret_here
JWT_REFRESH_SECRET=your_generated_refresh_secret_here
JWT_ISSUER=auth-service
ACCESS_TOKEN_EXPIRY=15m
REFRESH_TOKEN_EXPIRY=7d

# CORS - Add mobile app URLs
CORS_ORIGIN=http://localhost:3000,http://localhost:19006
CORS_CREDENTIALS=true

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### Run Tests

```bash
node test.js
```

**Expected Output**:
```
🧪 Running Auth Service Tests...
✅ Password hashing works correctly
✅ JWT token generation works correctly
✅ MongoDB connection successful
✅ Environment configuration valid
✅ Logger works correctly
🎉 All tests passed! Service is ready to run.
```

### Start Auth Service

```bash
# Development mode (with nodemon)
npm run dev

# Production mode
npm start
```

### Verify Auth Service

```bash
# Health check
curl http://localhost:4001/health

# Should return:
# {
#   "success": true,
#   "message": "Auth service is running",
#   ...
# }
```

### Test Auth Endpoints

```bash
# Register user
curl -X POST http://localhost:4001/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPass123",
    "firstName": "Test",
    "lastName": "User"
  }'

# Login
curl -X POST http://localhost:4001/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPass123"
  }'
```

See [API_EXAMPLES.md](../services/auth-service/API_EXAMPLES.md) for more examples.

---

## 4. Development Workflow

### Running Both Mobile App and Backend

**Terminal 1** - Auth Service:
```bash
cd services/auth-service
npm run dev
```

**Terminal 2** - Mobile Metro Bundler:
```bash
cd mobile-app
npm start
```

**Terminal 3** - Run Mobile App:
```bash
cd mobile-app
npm run ios  # or npm run android
```

### Development Tips

1. **Mobile App Development**:
   - Keep Metro bundler running
   - Use `r` in Metro terminal to reload
   - Use `d` in Metro terminal for debug menu
   - Use React DevTools for debugging

2. **Backend Development**:
   - Nodemon auto-restarts on file changes
   - Check logs in `services/auth-service/logs/`
   - Use Postman for API testing
   - Monitor MongoDB with MongoDB Compass

3. **Git Workflow**:
   ```bash
   # Create feature branch
   git checkout -b feature/your-feature
   
   # Commit changes
   git add .
   git commit -m "description"
   
   # Push to remote
   git push origin feature/your-feature
   ```

---

## 5. Troubleshooting

### Mobile App Issues

**Metro Bundler Port Conflict**:
```bash
# Kill process on port 8081
lsof -ti:8081 | xargs kill -9
npm start
```

**Build Errors**:
```bash
# Clean build
cd android
./gradlew clean
cd ..

# Or for iOS
cd ios
xcodebuild clean
cd ..
```

**Package Installation Issues**:
```bash
# Clear npm cache
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

### Backend Issues

**MongoDB Connection Error**:
```bash
# Check if MongoDB is running
mongosh

# If not, start MongoDB
brew services start mongodb-community@6.0  # macOS
# or
sudo systemctl start mongod  # Linux
```

**Port Already in Use**:
```bash
# Find process on port 4001
lsof -ti:4001 | xargs kill -9
```

**Environment Variables Not Loading**:
```bash
# Verify .env file exists
ls -la .env

# Check syntax
cat .env

# Restart service
npm run dev
```

### Common Errors

**Error**: "Cannot find module"
```bash
npm install
```

**Error**: "EADDRINUSE: address already in use"
```bash
# Kill process on that port
lsof -ti:PORT | xargs kill -9
```

**Error**: "Permission denied"
```bash
# Don't use sudo with npm
# Fix npm permissions:
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
export PATH=~/.npm-global/bin:$PATH
```

---

## 6. IDE Setup (VS Code)

### Recommended Extensions

**For Mobile Development**:
- React Native Tools
- ESLint
- Prettier
- React-Native/React/Redux snippets

**For Backend Development**:
- ESLint
- Prettier
- MongoDB for VS Code
- REST Client
- Docker

### VS Code Settings

Create `.vscode/settings.json`:

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "eslint.validate": [
    "javascript",
    "javascriptreact",
    "typescript",
    "typescriptreact"
  ],
  "[javascript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "[typescript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  }
}
```

### VS Code Tasks

Create `.vscode/tasks.json`:

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Start Auth Service",
      "type": "shell",
      "command": "cd services/auth-service && npm run dev",
      "isBackground": true
    },
    {
      "label": "Start Mobile App",
      "type": "shell",
      "command": "cd mobile-app && npm start",
      "isBackground": true
    }
  ]
}
```

---

## 7. Testing Setup

### Mobile App Testing

```bash
cd mobile-app

# Run tests
npm test

# Run tests with coverage
npm test -- --coverage
```

### Backend Testing

```bash
cd services/auth-service

# Run basic tests
node test.js

# Run full test suite (when implemented)
npm test
```

---

## 8. Docker Setup (Optional)

### Auth Service Docker

```bash
cd services/auth-service

# Build image
docker build -t auth-service .

# Run container
docker run -p 4001:4001 --env-file .env auth-service
```

### Docker Compose (Future)

```bash
# Start all services
docker-compose up

# Stop all services
docker-compose down
```

---

## 9. Next Steps

After setup is complete:

1. **Verify Everything Works**:
   - ✅ Mobile app runs on iOS/Android
   - ✅ Auth service responds to health check
   - ✅ Can register and login from mobile app
   - ✅ Tokens are stored securely

2. **Start Development**:
   - Review [IMPLEMENTATION_STATUS.md](./IMPLEMENTATION_STATUS.md)
   - Check pending tasks
   - Pick a feature to implement

3. **Learn the Codebase**:
   - Read service README files
   - Review architecture decisions in [adr/README.md](./adr/README.md)
   - Understand API contracts in [api-contracts/](./api-contracts/)

---

## 10. Getting Help

### Documentation
- [Implementation Status](./IMPLEMENTATION_STATUS.md)
- [Auth Service API](./api-contracts/AUTH_SERVICE.md)
- [Architecture Decisions](./adr/README.md)

### Resources
- React Native: [reactnative.dev](https://reactnative.dev)
- Express.js: [expressjs.com](https://expressjs.com)
- MongoDB: [docs.mongodb.com](https://docs.mongodb.com)
- Redux Toolkit: [redux-toolkit.js.org](https://redux-toolkit.js.org)

### Community
- Stack Overflow
- React Native Community
- MongoDB Community Forums

---

## Appendix: Version Information

### Mobile App
- React Native: 0.83.1
- TypeScript: 5.x
- Redux Toolkit: Latest

### Auth Service
- Node.js: 20.x LTS
- Express: 4.19.2
- MongoDB: 6.0+
- Mongoose: 8.3.0

---

**Last Updated**: February 3, 2026

**Next Review**: When new services are added
