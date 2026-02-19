# Auth Service - Testing Guide

Comprehensive testing documentation for the auth-service.

## 📋 Test Coverage

### Test Structure
```
tests/
├── setup.js                          # Global test configuration
├── unit/                              # Unit tests
│   ├── controllers/
│   │   └── auth.controller.test.js   # Controller tests
│   ├── services/
│   │   └── auth.service.test.js      # Service tests
│   ├── models/
│   │   └── user.model.test.js        # Model tests
│   └── utils/
│       ├── password.util.test.js     # Password utility tests
│       └── jwt.util.test.js          # JWT utility tests
└── integration/                       # Integration tests (TBD)
```

### Coverage Summary

| Component | Tests | Coverage |
|-----------|-------|----------|
| **Auth Controller** | 15+ tests | Controllers, HTTP responses, validation |
| **Auth Service** | 20+ tests | Business logic, error handling |
| **User Model** | 25+ tests | Schema validation, methods, indexes |
| **Password Util** | 12+ tests | Hashing, verification, validation |
| **JWT Util** | 15+ tests | Token generation, verification |
| **Total** | **85+ tests** | Comprehensive coverage |

## 🚀 Running Tests

### Install Dependencies
```bash
cd services/auth-service

# Install test dependencies
npm install
```

### Run All Tests
```bash
# Run all tests with coverage
npm test

# Output:
# - Test results
# - Coverage report in terminal
# - HTML coverage report in coverage/index.html
```

### Run Specific Test Suites
```bash
# Unit tests only
npm run test:unit

# Integration tests only
npm run test:integration

# Watch mode (auto-rerun on changes)
npm run test:watch

# CI mode (for pipelines)
npm run test:ci
```

### Run Individual Test Files
```bash
# Specific file
npx jest tests/unit/services/auth.service.test.js

# Specific test suite
npx jest tests/unit/services/auth.service.test.js -t "register"

# With coverage for specific file
npx jest tests/unit/services/auth.service.test.js --coverage
```

## 📊 Coverage Reports

### View Coverage
```bash
# Run tests with coverage
npm test

# Open HTML coverage report
open coverage/index.html  # macOS
xdg-open coverage/index.html  # Linux
start coverage/index.html  # Windows
```

### Coverage Thresholds
Current thresholds (configured in `jest.config.js`):
- **Branches**: 70%
- **Functions**: 70%
- **Lines**: 70%
- **Statements**: 70%

## 🧪 Test Examples

### 1. Auth Service Tests

**Test: User Registration**
```javascript
it('should successfully register a new user', async () => {
  const userData = {
    email: 'newuser@example.com',
    password: 'Password@123',
    firstName: 'New',
    lastName: 'User',
  };

  const result = await authService.register(userData);

  expect(result).toHaveProperty('user');
  expect(result).toHaveProperty('accessToken');
  expect(result).toHaveProperty('refreshToken');
});
```

**Test: Duplicate Email**
```javascript
it('should throw error if email already exists', async () => {
  const userData = { /* ... */ };
  
  await authService.register(userData);
  
  await expect(authService.register(userData))
    .rejects
    .toThrow('Email already registered');
});
```

### 2. Controller Tests

**Test: Login Endpoint**
```javascript
it('should login successfully with valid credentials', async () => {
  const response = await request(app)
    .post('/auth/login')
    .send({
      email: 'test@example.com',
      password: 'Password@123',
    })
    .expect(200);

  expect(response.body.success).toBe(true);
  expect(response.body.data).toHaveProperty('accessToken');
});
```

### 3. Model Tests

**Test: Email Validation**
```javascript
it('should validate email format', async () => {
  const userData = {
    email: 'invalid-email',
    password: 'password123',
    firstName: 'Test',
    lastName: 'User',
  };

  await expect(User.create(userData))
    .rejects
    .toThrow();
});
```

### 4. Utility Tests

**Test: Password Hashing**
```javascript
it('should hash a password', async () => {
  const password = 'TestPassword@123';
  const hashedPassword = await hashPassword(password);

  expect(hashedPassword).not.toBe(password);
  expect(hashedPassword).toMatch(/^\$2[ayb]\$.{56}$/);
});
```

## 🔍 Test Patterns

### Testing Async Functions
```javascript
it('should handle async operations', async () => {
  const result = await someAsyncFunction();
  expect(result).toBe(expectedValue);
});
```

### Testing Errors
```javascript
it('should throw specific error', async () => {
  await expect(functionThatThrows())
    .rejects
    .toThrow('Expected error message');
});
```

### Testing with Database
```javascript
beforeEach(async () => {
  // Clean database before each test
  await User.deleteMany({});
});

it('should create user in database', async () => {
  const user = await User.create({ /* ... */ });
  expect(user.id).toBeDefined();
});
```

### Testing HTTP Endpoints
```javascript
it('should return 404 for invalid route', async () => {
  const response = await request(app)
    .get('/invalid-route')
    .expect(404);
});
```

## 🛠️ Test Utilities

### Global Test Data
Available in all tests via `global.testUtils`:

```javascript
// Mock user data
const { mockUser, mockDoctor, mockAdmin } = global.testUtils;

// Use in tests
it('should create patient user', async () => {
  const result = await authService.register(mockUser);
  expect(result.user.role).toBe('patient');
});
```

### MongoDB Memory Server
Automatically configured for fast, isolated database tests:
- In-memory MongoDB instance
- Clean database for each test
- No external dependencies
- Fast test execution

## 📝 Writing New Tests

### Test File Template
```javascript
/**
 * Unit Tests for [Component Name]
 */

const componentToTest = require('../../src/path/to/component');

describe('[Component Name] - Unit Tests', () => {
  beforeEach(() => {
    // Setup before each test
  });

  afterEach(() => {
    // Cleanup after each test
  });

  describe('[Function/Method Name]', () => {
    it('should [expected behavior]', () => {
      // Arrange
      const input = /* ... */;
      
      // Act
      const result = componentToTest.method(input);
      
      // Assert
      expect(result).toBe(expected);
    });
  });
});
```

### Best Practices

**1. Test Organization**
- Group related tests using `describe`
- Use clear, descriptive test names
- Follow AAA pattern: Arrange, Act, Assert

**2. Test Independence**
- Each test should be independent
- Use `beforeEach` for setup
- Clean up resources in `afterEach`

**3. Test Coverage**
- Test happy paths
- Test error cases
- Test edge cases
- Test validation

**4. Assertions**
- Use specific assertions
- Test one thing per test
- Avoid over-asserting

**5. Mocking**
- Mock external dependencies
- Don't mock what you're testing
- Use `jest.fn()` for function mocks

## 🐛 Debugging Tests

### Run Single Test
```bash
npx jest -t "test name"
```

### Debug in VS Code
```json
// .vscode/launch.json
{
  "type": "node",
  "request": "launch",
  "name": "Jest Debug",
  "program": "${workspaceFolder}/node_modules/.bin/jest",
  "args": ["--runInBand"],
  "console": "integratedTerminal"
}
```

### Verbose Output
```bash
npm test -- --verbose
```

### Only Failed Tests
```bash
npm test -- --onlyFailures
```

## 📈 CI/CD Integration

### GitLab CI
```yaml
test:
  stage: test
  script:
    - cd services/auth-service
    - npm ci
    - npm run test:ci
  artifacts:
    reports:
      coverage_report:
        coverage_format: cobertura
        path: coverage/cobertura-coverage.xml
```

### GitHub Actions
```yaml
- name: Run tests
  run: |
    cd services/auth-service
    npm ci
    npm run test:ci
```

## 🎯 Next Steps

1. **Increase Coverage**: Add more tests to reach 80%+ coverage
2. **Integration Tests**: Add end-to-end integration tests
3. **Performance Tests**: Add performance benchmarks
4. **Security Tests**: Add security-specific tests
5. **Load Tests**: Add load testing with k6 or Artillery

## 📚 Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [MongoDB Memory Server](https://github.com/nodkz/mongodb-memory-server)
- [Testing Best Practices](https://testingjavascript.com/)

## ✅ Test Checklist

Before committing code, ensure:

- [ ] All tests pass: `npm test`
- [ ] Coverage meets thresholds (70%+)
- [ ] New features have tests
- [ ] Bug fixes have regression tests
- [ ] No console errors in test output
- [ ] Tests run in CI pipeline

---

**Happy Testing! 🧪**
