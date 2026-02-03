# Auth Service API Examples

## Using cURL

### 1. Health Check
```bash
curl -X GET http://localhost:4001/health
```

### 2. Register User (Patient)
```bash
curl -X POST http://localhost:4001/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "patient@example.com",
    "password": "SecurePass123",
    "firstName": "John",
    "lastName": "Doe",
    "phoneNumber": "+1234567890",
    "dateOfBirth": "1990-01-01",
    "role": "patient"
  }'
```

### 3. Register User (Doctor)
```bash
curl -X POST http://localhost:4001/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "doctor@example.com",
    "password": "SecurePass123",
    "firstName": "Jane",
    "lastName": "Smith",
    "phoneNumber": "+1234567891",
    "dateOfBirth": "1985-05-15",
    "role": "doctor"
  }'
```

### 4. Login
```bash
curl -X POST http://localhost:4001/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "patient@example.com",
    "password": "SecurePass123"
  }'
```

**Save the tokens from the response:**
```bash
# Extract tokens (requires jq)
export ACCESS_TOKEN=$(curl -X POST http://localhost:4001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "patient@example.com", "password": "SecurePass123"}' \
  | jq -r '.data.accessToken')

export REFRESH_TOKEN=$(curl -X POST http://localhost:4001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "patient@example.com", "password": "SecurePass123"}' \
  | jq -r '.data.refreshToken')
```

### 5. Get Current User Profile (Protected)
```bash
curl -X GET http://localhost:4001/auth/me \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

### 6. Refresh Token
```bash
curl -X POST http://localhost:4001/auth/refresh \
  -H "Content-Type: application/json" \
  -d "{
    \"refreshToken\": \"$REFRESH_TOKEN\"
  }"
```

### 7. Logout
```bash
curl -X POST http://localhost:4001/auth/logout \
  -H "Content-Type: application/json" \
  -d "{
    \"refreshToken\": \"$REFRESH_TOKEN\"
  }"
```

---

## Using HTTPie (more readable)

### 1. Health Check
```bash
http GET http://localhost:4001/health
```

### 2. Register User
```bash
http POST http://localhost:4001/auth/register \
  email=patient@example.com \
  password=SecurePass123 \
  firstName=John \
  lastName=Doe \
  phoneNumber=+1234567890 \
  dateOfBirth=1990-01-01 \
  role=patient
```

### 3. Login
```bash
http POST http://localhost:4001/auth/login \
  email=patient@example.com \
  password=SecurePass123
```

### 4. Get Profile (Protected)
```bash
http GET http://localhost:4001/auth/me \
  "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### 5. Refresh Token
```bash
http POST http://localhost:4001/auth/refresh \
  refreshToken=YOUR_REFRESH_TOKEN
```

### 6. Logout
```bash
http POST http://localhost:4001/auth/logout \
  refreshToken=YOUR_REFRESH_TOKEN
```

---

## Testing Scenarios

### Test Rate Limiting (Login)
Try logging in more than 5 times in 15 minutes with wrong password:
```bash
for i in {1..6}; do
  echo "Attempt $i:"
  curl -X POST http://localhost:4001/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email": "patient@example.com", "password": "wrong"}' \
    -w "\nStatus: %{http_code}\n\n"
  sleep 1
done
```

### Test Rate Limiting (Registration)
Try registering more than 3 accounts in 1 hour:
```bash
for i in {1..4}; do
  echo "Registration attempt $i:"
  curl -X POST http://localhost:4001/auth/register \
    -H "Content-Type: application/json" \
    -d "{
      \"email\": \"user$i@example.com\",
      \"password\": \"SecurePass123\",
      \"firstName\": \"User\",
      \"lastName\": \"$i\",
      \"phoneNumber\": \"+123456789$i\",
      \"dateOfBirth\": \"1990-01-01\"
    }" \
    -w "\nStatus: %{http_code}\n\n"
  sleep 1
done
```

### Test Token Expiration
1. Login and get tokens
2. Wait 15+ minutes for access token to expire
3. Try to access protected endpoint
4. Should get 401 error
5. Use refresh token to get new access token

### Test Invalid Token
```bash
curl -X GET http://localhost:4001/auth/me \
  -H "Authorization: Bearer invalid_token_here"
```

### Test Missing Authorization Header
```bash
curl -X GET http://localhost:4001/auth/me
```

### Test Password Validation
```bash
# Too short password
curl -X POST http://localhost:4001/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "short",
    "firstName": "Test",
    "lastName": "User",
    "phoneNumber": "+1234567890",
    "dateOfBirth": "1990-01-01"
  }'

# No uppercase letter
curl -X POST http://localhost:4001/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "lowercase123",
    "firstName": "Test",
    "lastName": "User",
    "phoneNumber": "+1234567890",
    "dateOfBirth": "1990-01-01"
  }'

# No lowercase letter
curl -X POST http://localhost:4001/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "UPPERCASE123",
    "firstName": "Test",
    "lastName": "User",
    "phoneNumber": "+1234567890",
    "dateOfBirth": "1990-01-01"
  }'

# No number
curl -X POST http://localhost:4001/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "NoNumbers",
    "firstName": "Test",
    "lastName": "User",
    "phoneNumber": "+1234567890",
    "dateOfBirth": "1990-01-01"
  }'
```

### Test Email Validation
```bash
# Invalid email format
curl -X POST http://localhost:4001/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "not-an-email",
    "password": "SecurePass123",
    "firstName": "Test",
    "lastName": "User",
    "phoneNumber": "+1234567890",
    "dateOfBirth": "1990-01-01"
  }'
```

### Test Duplicate Registration
```bash
# Register once
curl -X POST http://localhost:4001/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "duplicate@example.com",
    "password": "SecurePass123",
    "firstName": "Test",
    "lastName": "User",
    "phoneNumber": "+1234567890",
    "dateOfBirth": "1990-01-01"
  }'

# Try to register with same email again
curl -X POST http://localhost:4001/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "duplicate@example.com",
    "password": "DifferentPass123",
    "firstName": "Another",
    "lastName": "User",
    "phoneNumber": "+9876543210",
    "dateOfBirth": "1995-06-20"
  }'
```

---

## Expected Response Formats

### Success Response (2xx)
```json
{
  "success": true,
  "message": "Operation successful",
  "data": {
    // Response data
  }
}
```

### Error Response (4xx, 5xx)
```json
{
  "success": false,
  "error": {
    "message": "Error description",
    "statusCode": 400
  }
}
```

### Rate Limit Response (429)
```json
{
  "success": false,
  "error": {
    "message": "Too many requests, please try again later.",
    "statusCode": 429
  }
}
```

---

## Postman Collection

You can import this into Postman:

1. Create a new collection "Auth Service"
2. Add these requests:
   - GET Health Check
   - POST Register
   - POST Login
   - POST Refresh
   - POST Logout
   - GET Profile (with Bearer token)

3. Set up environment variables:
   - `baseUrl`: http://localhost:4001
   - `accessToken`: (set after login)
   - `refreshToken`: (set after login)

4. Add test scripts to automatically save tokens after login:
```javascript
// In Login request's Tests tab
const response = pm.response.json();
if (response.success) {
    pm.environment.set("accessToken", response.data.accessToken);
    pm.environment.set("refreshToken", response.data.refreshToken);
}
```
