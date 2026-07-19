# Doctor Service - Quick Start Guide

## 📋 Table of Contents
- [Getting Started](#getting-started)
- [Quick Commands](#quick-commands)
- [Common Use Cases](#common-use-cases)
- [Testing the Service](#testing-the-service)

---

## Getting Started

### Prerequisites
- Node.js v20+
- MongoDB running on `localhost:27017`
- Auth Service running on `localhost:4001`
- API Gateway running on `localhost:3000` (optional, for proxied access)

### Start the Doctor Service

```bash
# Navigate to doctor service
cd services/doctor-service

# Option 1: Production mode
npm start

# Option 2: Development mode (with hot reload)
npm run dev

# Option 3: Seed sample data
npm run seed
```

### Verify Service is Running

```bash
# Check health
curl http://localhost:4003/health

# Expected response:
# {"service":"doctor-service","status":"UP","database":"connected"}
```

---

## Quick Commands

### 🔍 Search Doctors

```bash
# Get all doctors (with pagination)
curl "http://localhost:3000/api/doctor/search?page=1&limit=10"

# Search by specialty
curl "http://localhost:3000/api/doctor/search?specialization=Cardiology"

# Search by location
curl "http://localhost:3000/api/doctor/search?location=Boston"

# Search by condition they treat
curl "http://localhost:3000/api/doctor/search?condition=Hypertension"

# Search by symptom they treat
curl "http://localhost:3000/api/doctor/search?symptom=Chest%20Pain"

# Combine multiple filters
curl "http://localhost:3000/api/doctor/search?specialization=Cardiology&location=Boston"

# Free text search
curl "http://localhost:3000/api/doctor/search?query=cardiology"
```

### 📋 Filter Options

```bash
# Get dropdown options
curl "http://localhost:3000/api/doctor/filters/options"

# Response includes:
# - specializations (Cardiology, Dermatology, etc.)
# - locations (Austin, Boston, Denver, etc.)
# - conditions (Heart Disease, Asthma, etc.)
```

### 👨‍⚕️ Get Doctor Details

```bash
# Get doctor by ID
curl "http://localhost:3000/api/doctor/69837b2355813aca43cdbc67"

# Get doctor statistics
curl "http://localhost:3000/api/doctor/69837b2355813aca43cdbc67/stats"

# Get all doctors with specialization
curl "http://localhost:3000/api/doctor/specialization/Cardiology"

# Get available doctors on specific date
curl "http://localhost:3000/api/doctor/available?date=2026-02-10"
```

---

## Common Use Cases

### Use Case 1: Patient Finds Doctor by Specialty

**Scenario:** Patient wants to find a cardiologist in Boston

```bash
curl "http://localhost:3000/api/doctor/search?specialization=Cardiology&location=Boston"
```

**Response:** List of cardiologists in Boston with full profiles

---

### Use Case 2: Patient Searches by Symptoms

**Scenario:** Patient has chest pain and wants to find appropriate doctor

```bash
curl "http://localhost:3000/api/doctor/search?symptom=Chest%20Pain"
```

**Response:** Doctors who treat chest pain

---

### Use Case 3: Patient Finds Pediatrician

**Scenario:** Parent needs a pediatrician in Austin

```bash
curl "http://localhost:3000/api/doctor/search?specialization=Pediatrics&location=Austin"
```

**Response:** Pediatricians in Austin area

---

### Use Case 4: Doctor Creates Profile (Protected)

**Scenario:** New doctor registers and creates their profile

```bash
# First, login to get JWT token
TOKEN=$(curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "doctor@healthcare.com",
    "password": "password123"
  }' | jq -r '.data.accessToken')

# Create doctor profile
curl -X POST "http://localhost:3000/api/doctor" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "firstName": "John",
    "lastName": "Smith",
    "email": "dr.john.smith@healthcare.com",
    "phone": "+1-555-0100",
    "specializations": ["Cardiology"],
    "treatedConditions": ["Heart Disease", "Hypertension"],
    "treatedSymptoms": ["Chest Pain"],
    "bio": "Experienced cardiologist",
    "address": {
      "street": "123 Medical Plaza",
      "city": "Boston",
      "state": "MA",
      "zipCode": "02115",
      "country": "USA"
    },
    "consultationFee": 200
  }'
```

---

### Use Case 5: Doctor Updates Their Profile

```bash
curl -X PUT "http://localhost:3000/api/doctor/69837b2355813aca43cdbc67" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "bio": "Updated bio - 20 years of experience",
    "consultationFee": 250
  }'
```

---

### Use Case 6: Doctor Adds Availability Slot

```bash
curl -X POST "http://localhost:3000/api/doctor/69837b2355813aca43cdbc67/slots" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "date": "2026-02-10T00:00:00Z",
    "startTime": "09:00",
    "endTime": "10:00",
    "status": "available"
  }'
```

---

### Use Case 7: Doctor Books an Appointment Slot

```bash
curl -X PATCH "http://localhost:3000/api/doctor/69837b2355813aca43cdbc67/slots/slot_id_123" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "status": "booked",
    "appointmentId": "appointment_id_456"
  }'
```

---

## Testing the Service

### 1. Using curl (Command Line)

**Health Check:**
```bash
curl http://localhost:4003/health
```

**Search Doctors:**
```bash
curl "http://localhost:3000/api/doctor/search?location=Boston" | python3 -m json.tool
```

**With Pretty JSON:**
```bash
curl "http://localhost:3000/api/doctor/filters/options" | python3 -m json.tool
```

---

### 2. Using Postman

1. Import the Swagger spec: `http://localhost:4003/api-docs`
2. Create a new request:
   - **Method:** GET
   - **URL:** `http://localhost:3000/api/doctor/search?specialization=Cardiology`
   - **Headers:** None needed for public endpoints
3. Click Send

---

### 3. Using Swagger UI

Open browser and navigate to:
```
http://localhost:4003/api-docs
```

All endpoints are documented and can be tested directly from the UI.

---

### 4. Using JavaScript/Node.js

```javascript
// Fetch doctors by specialization
fetch('http://localhost:3000/api/doctor/search?specialization=Cardiology')
  .then(res => res.json())
  .then(data => console.log(data))
  .catch(err => console.error('Error:', err));
```

---

### 5. Using Python

```python
import requests
import json

# Get filter options
response = requests.get('http://localhost:3000/api/doctor/filters/options')
data = response.json()
print(json.dumps(data, indent=2))

# Search doctors
response = requests.get('http://localhost:3000/api/doctor/search', params={
    'specialization': 'Cardiology',
    'location': 'Boston'
})
print(json.dumps(response.json(), indent=2))
```

---

## Sample Data

The service includes 5 sample doctors seeded by default:

| Name | Specialty | Location | Rating |
|------|-----------|----------|--------|
| Sarah Johnson | Cardiology | Boston | 4.8 |
| Michael Chen | Neurology | San Francisco | 4.9 |
| Emily Rodriguez | Pediatrics | Austin | 4.7 |
| David Williams | Orthopedics | Denver | 4.9 |
| Jessica Martinez | Dermatology | Miami | 4.6 |

**Seed data again:**
```bash
npm run seed
```

---

## Important Endpoints Summary

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/doctor/search` | No | Search doctors with filters |
| GET | `/api/doctor/available` | No | Get available doctors by date |
| GET | `/api/doctor/specialization/:specialty` | No | Get doctors by specialty |
| GET | `/api/doctor/filters/options` | No | Get filter dropdown options |
| GET | `/api/doctor/:id` | No | Get doctor by ID |
| GET | `/api/doctor/:id/stats` | No | Get doctor statistics |
| GET | `/api/doctor/me/profile` | Yes | Get own profile (doctor only) |
| POST | `/api/doctor` | Yes | Create doctor profile (doctor only) |
| PUT | `/api/doctor/:id` | Yes | Update doctor profile (doctor/admin) |
| DELETE | `/api/doctor/:id` | Yes | Delete doctor profile (doctor/admin) |
| POST | `/api/doctor/:id/slots` | Yes | Add availability slot (doctor/admin) |
| PATCH | `/api/doctor/:id/slots/:slotId` | Yes | Update slot status (doctor/admin) |

---

## Troubleshooting

### Issue: Service won't start
```bash
# Check Node.js version
node --version    # Should be v20+

# Check MongoDB is running
nc -zv localhost 27017

# Check port 4003 is available
lsof -i :4003
```

### Issue: Can't find doctors
```bash
# Seed sample data
npm run seed

# Verify data was inserted
# Search with no filters to see all doctors
curl "http://localhost:3000/api/doctor/search"
```

### Issue: Authentication error
```bash
# Get valid token from Auth Service
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password"
  }'

# Use the token in Authorization header
# Authorization: Bearer <your_token>
```

---

## Performance Tips

1. **Use specialization/location filters** - Leverages compound indexes
2. **Limit pagination** - Use `limit=20` to get fewer but complete results
3. **Cache filter options** - Call `/filters/options` once and cache results
4. **Use specific searches** - Narrower searches are faster

---

## Next Steps

- Review [DOCTOR_SERVICE_API.md](./DOCTOR_SERVICE_API.md) for detailed API documentation
- Check the [README.md](./README.md) for service architecture
- Explore Swagger UI at `http://localhost:4003/api-docs`
- Integrate with mobile app or frontend

---

**Quick Reference:**
- 🏥 Service: `http://localhost:4003`
- 🔗 Via API Gateway: `http://localhost:3000/api/doctor`
- 📚 API Docs: `http://localhost:4003/api-docs`
- 📦 Database: `mongodb://localhost:27017/doctor_db`

Happy doctoring! 👨‍⚕️👩‍⚕️
