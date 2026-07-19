# Doctor Service - Comprehensive Search Update

## Overview
Updated the doctor search functionality to support multiple search criteria, allowing users to search by various parameters either individually or in combination.

## Changes Made

### 1. Validator Middleware (`src/middlewares/validator.middleware.js`)
**Updated `searchDoctorValidation`** to accept all search parameters:

#### Search Criteria (All Optional):
- `query` - Free text search across multiple fields
- `name` - Search by doctor's name (first/last name)
- `specialty` / `specialization` - Filter by medical specialty
- `location` - Filter by city/location
- `condition` - Filter by treated medical conditions
- `symptom` - Filter by treated symptoms
- `date` - Filter by availability on specific date
- `minRating` - Minimum rating filter (0-5)
- `maxFee` - Maximum consultation fee filter
- `acceptsInsurance` - Filter by insurance acceptance
- `isAvailable` - Filter by current availability

#### Pagination & Sorting:
- `page` - Page number (default: 1)
- `limit` - Results per page (1-100, default: 10)
- `sortBy` - Sort field (rating, experience, consultationFee, firstName)
- `sortOrder` - Sort direction (asc, desc)

### 2. Service Layer (`src/services/doctor.service.js`)
**Updated `searchDoctors` method** to:
- Accept all new search parameters
- Build filters dynamically (only include provided parameters)
- Handle both specialty and specialization parameters
- Support name-based searching
- Pass all filters to the model's search method

### 3. Model Layer (`src/models/Doctor.js`)
**Enhanced `search` static method** to:
- Support name-specific search using regex on firstName, lastName, and full name
- Add minRating filter with $gte operator
- Add maxFee filter with $lte operator
- Add acceptsInsurance filter
- Improve sorting logic (text score for text search, custom field otherwise)
- Handle all filter combinations properly

## Search Capabilities

### 1. Text Search
```javascript
GET /api/doctors/search?query=cardiology
```
Searches across: firstName, lastName, specializations, treatedConditions, treatedSymptoms

### 2. Name Search
```javascript
GET /api/doctors/search?name=John
GET /api/doctors/search?name=Dr. Smith
```
Searches: firstName, lastName, or full name combination

### 3. Specialty Filter
```javascript
GET /api/doctors/search?specialty=Cardiology
GET /api/doctors/search?specialization=Neurology
```

### 4. Location Filter
```javascript
GET /api/doctors/search?location=New York
GET /api/doctors/search?location=San Francisco
```

### 5. Condition Filter
```javascript
GET /api/doctors/search?condition=Diabetes
GET /api/doctors/search?condition=Hypertension
```

### 6. Symptom Filter
```javascript
GET /api/doctors/search?symptom=Chest Pain
GET /api/doctors/search?symptom=Headache
```

### 7. Combined Filters
```javascript
GET /api/doctors/search?specialty=Cardiology&location=Boston&minRating=4&maxFee=200
GET /api/doctors/search?name=John&condition=Diabetes&acceptsInsurance=true
GET /api/doctors/search?location=Chicago&isAvailable=true&date=2026-02-07
```

### 8. Pagination & Sorting
```javascript
GET /api/doctors/search?specialty=Cardiology&page=2&limit=20&sortBy=rating&sortOrder=desc
```

## API Response Format

```json
{
  "success": true,
  "data": [
    {
      "_id": "...",
      "firstName": "John",
      "lastName": "Doe",
      "specializations": ["Cardiology"],
      "rating": 4.5,
      "consultationFee": 150,
      "address": {
        "city": "New York",
        "state": "NY"
      },
      "treatedConditions": ["Hypertension", "Heart Disease"],
      "treatedSymptoms": ["Chest Pain", "Shortness of Breath"]
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 50,
    "pages": 5
  }
}
```

## Benefits

1. **Flexible Search**: Users can search using any combination of criteria
2. **No Required Parameters**: All search parameters are optional
3. **Performance**: Utilizes MongoDB text indexes for efficient searching
4. **User-Friendly**: Supports case-insensitive partial matching for names and locations
5. **Comprehensive**: Covers all relevant search criteria for finding doctors

## Testing Examples

### Mobile App Usage
```javascript
// Search by name
searchDoctors({ name: 'John' })

// Search by specialty and location
searchDoctors({ specialty: 'Cardiology', location: 'Boston' })

// Search with filters
searchDoctors({ 
  specialty: 'Neurology', 
  minRating: 4.0,
  maxFee: 250,
  acceptsInsurance: true
})

// Search with pagination
searchDoctors({ 
  condition: 'Diabetes',
  page: 1,
  limit: 50,
  sortBy: 'rating',
  sortOrder: 'desc'
})
```

## Implementation Status
✅ Backend validation updated  
✅ Service layer updated  
✅ Model layer updated  
✅ All search parameters supported  
✅ Doctor service restarted  
🔄 Mobile app ready to use all search features

## Next Steps
- Mobile app can now use any combination of these parameters
- Date filter works when combined with other filters
- All searches are case-insensitive and support partial matching
