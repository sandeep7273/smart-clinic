# Auth Service Tests

Unit and integration tests for the authentication service.

## Directory Structure

```
tests/
├── setup.js                          # Global test configuration
└── unit/                             # Unit tests
    ├── controllers/
    │   └── auth.controller.test.js   # HTTP endpoint tests
    ├── services/
    │   └── auth.service.test.js      # Business logic tests
    ├── models/
    │   └── user.model.test.js        # Database model tests
    └── utils/
        ├── password.util.test.js     # Password utility tests ✓
        └── jwt.util.test.js          # JWT utility tests ✓
```

## Running Tests

```bash
# All tests with coverage
npm test

# Watch mode (auto-rerun on changes)
npm run test:watch

# Specific test file
npx jest tests/unit/utils/password.util.test.js

# By pattern
npm test -- --testPathPattern="password"
```

## Test Results

**Current Status: 33/33 utility tests passing ✓**

### Passing Tests (33)
- ✅ JWT Utility (16 tests)
- ✅ Password Utility (17 tests)

### Test Files (85+ total tests)
- Auth Service (20+ tests)
- Auth Controller (15+ tests)
- User Model (25+ tests)
- Password Utility (17 tests) ✓
- JWT Utility (16 tests) ✓

## Writing New Tests

### Test Template
```javascript
describe('[Component] - Unit Tests', () => {
  beforeEach(() => {
    // Setup
  });

  afterEach(() => {
    // Cleanup
  });

  describe('[method/function]', () => {
    it('should [expected behavior]', async () => {
      // Arrange
      const input = /* ... */;
      
      // Act
      const result = await functionUnderTest(input);
      
      // Assert
      expect(result).toBe(expected);
    });
  });
});
```

### Best Practices
1. Test one thing per test
2. Use descriptive test names
3. Follow AAA pattern (Arrange, Act, Assert)
4. Clean up after tests
5. Mock external dependencies
6. Use beforeEach/afterEach for setup/cleanup

## Test Utilities

### Global Test Data
```javascript
// Available in all tests
const { mockUser, mockDoctor, mockAdmin } = global.testUtils;
```

### Mock Users
```javascript
// Patient user
global.testUtils.mockUser = {
  email: 'test@example.com',
  password: 'Test@123456',
  firstName: 'Test',
  lastName: 'User',
  role: 'patient',
};

// Doctor user
global.testUtils.mockDoctor = {
  email: 'doctor@example.com',
  password: 'Doctor@123456',
  firstName: 'Dr. John',
  lastName: 'Doe',
  role: 'doctor',
};

// Admin user
global.testUtils.mockAdmin = {
  email: 'admin@example.com',
  password: 'Admin@123456',
  firstName: 'Admin',
  lastName: 'User',
  role: 'admin',
};
```

## Coverage

### Current Coverage
- Utilities: 90%+ ✓
- Models: Tests created
- Services: Tests created
- Controllers: Tests created

### Coverage Thresholds
- Branches: 70%
- Functions: 70%
- Lines: 70%
- Statements: 70%

View detailed coverage:
```bash
npm test
open coverage/index.html
```

## Documentation

- [TESTING.md](../TESTING.md) - Comprehensive testing guide
- [TEST_SETUP_SUMMARY.md](../TEST_SETUP_SUMMARY.md) - Setup summary
- [jest.config.js](../jest.config.js) - Jest configuration

---

**Happy Testing! 🧪**
