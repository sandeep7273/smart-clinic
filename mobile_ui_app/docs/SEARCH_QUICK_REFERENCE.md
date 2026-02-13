# Doctor Search - Quick Reference

## Backend API Endpoints

### Search Doctors
```
GET /api/doctors/search
```

**Query Parameters (All Optional):**
| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `name` | string | Doctor's name (first, last, or full) | `Sarah`, `Johnson`, `Dr. Sarah` |
| `specialty` | string | Medical specialty | `Cardiology`, `Neurology` |
| `location` | string | City/location | `Boston`, `New York` |
| `condition` | string | Medical condition treated | `Migraine`, `Hypertension` |
| `symptom` | string | Symptom treated | `Headache`, `Chest Pain` |
| `minRating` | number | Minimum rating (0-5) | `4.0` |
| `maxFee` | number | Maximum consultation fee | `200` |
| `acceptsInsurance` | boolean | Insurance acceptance | `true`, `false` |
| `isAvailable` | boolean | Current availability | `true`, `false` |
| `page` | number | Page number (default: 1) | `1`, `2`, `3` |
| `limit` | number | Results per page (1-100, default: 10) | `10`, `50`, `100` |
| `sortBy` | string | Sort field | `rating`, `consultationFee`, `firstName` |
| `sortOrder` | string | Sort direction | `asc`, `desc` |

### Get Filter Options
```
GET /api/doctors/filter-options
```

**Response:**
```json
{
  "success": true,
  "data": {
    "specializations": ["Cardiology", "Neurology", ...],
    "locations": ["Boston", "New York", ...],
    "conditions": ["Migraine", "Hypertension", ...],
    "symptoms": ["Headache", "Chest Pain", ...],
    "languages": ["English", "Spanish", ...]
  }
}
```

## Mobile App Usage

### Import Required Types
```typescript
import { Doctor, DoctorSearchParams } from '../../types/doctor.types';
import { getDoctors, searchDoctors, getFilterOptions } from '../../api/doctor.api';
```

### Basic Search
```typescript
// Search by name
const results = await searchDoctors({ name: 'Sarah' });

// Filter by specialty
const results = await searchDoctors({ specialty: 'Cardiology' });

// Filter by location
const results = await searchDoctors({ location: 'Boston' });

// Filter by condition
const results = await searchDoctors({ condition: 'Migraine' });

// Filter by symptom
const results = await searchDoctors({ symptom: 'Headache' });
```

### Combined Search
```typescript
const results = await searchDoctors({
  name: 'Johnson',
  specialty: 'Cardiology',
  location: 'Boston',
  minRating: 4.0,
  maxFee: 250,
  page: 1,
  limit: 50
});
```

### Get Filter Options
```typescript
const options = await getFilterOptions();
// Access: options.data.specializations, options.data.conditions, etc.
```

## curl Examples

### Basic Searches
```bash
# By name
curl "http://localhost:4003/api/doctors/search?name=Sarah"

# By specialty
curl "http://localhost:4003/api/doctors/search?specialty=Cardiology"

# By location
curl "http://localhost:4003/api/doctors/search?location=Boston"

# By condition
curl "http://localhost:4003/api/doctors/search?condition=Migraine"

# By symptom
curl "http://localhost:4003/api/doctors/search?symptom=Headache"
```

### Combined Searches
```bash
# Specialty + Location
curl "http://localhost:4003/api/doctors/search?specialty=Cardiology&location=Boston"

# Name + Specialty + Location
curl "http://localhost:4003/api/doctors/search?name=Sarah&specialty=Cardiology&location=Boston"

# Condition + Location
curl "http://localhost:4003/api/doctors/search?condition=Migraine&location=Chicago"
```

### With Pagination
```bash
# First page, 50 results
curl "http://localhost:4003/api/doctors/search?specialty=Cardiology&page=1&limit=50"

# Second page
curl "http://localhost:4003/api/doctors/search?specialty=Cardiology&page=2&limit=50"
```

### With Sorting
```bash
# By rating (descending)
curl "http://localhost:4003/api/doctors/search?sortBy=rating&sortOrder=desc"

# By fee (ascending)
curl "http://localhost:4003/api/doctors/search?sortBy=consultationFee&sortOrder=asc"
```

## Response Format

```json
{
  "success": true,
  "data": [
    {
      "_id": "65f8d1a2b4c5d6e7f8g9h0i1",
      "userId": "65f8d1a2b4c5d6e7f8g9h0i0",
      "firstName": "Sarah",
      "lastName": "Johnson",
      "email": "sarah.johnson@example.com",
      "phone": "+1-555-0101",
      "specializations": ["Cardiology"],
      "subSpecialties": ["Interventional Cardiology"],
      "licenseNumber": "MD123456",
      "treatedConditions": ["Hypertension", "Heart Disease", "Arrhythmia"],
      "treatedSymptoms": ["Chest Pain", "Shortness of Breath", "Palpitations"],
      "bio": "Board-certified cardiologist with 15+ years of experience...",
      "languages": ["English", "Spanish"],
      "address": {
        "street": "123 Medical Center Drive",
        "city": "Boston",
        "state": "MA",
        "zipCode": "02101",
        "country": "USA"
      },
      "qualifications": [
        {
          "degree": "Doctor of Medicine (MD)",
          "institution": "Harvard Medical School",
          "year": 2005
        }
      ],
      "consultationFee": 200,
      "rating": 4.8,
      "reviewCount": 150,
      "yearsOfExperience": 15,
      "acceptsInsurance": true,
      "status": "active",
      "createdAt": "2024-03-18T10:30:00.000Z",
      "updatedAt": "2024-03-18T10:30:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 15,
    "pages": 1
  }
}
```

## Common Use Cases

### 1. "Find me a cardiologist in Boston"
```typescript
searchDoctors({ 
  specialty: 'Cardiology', 
  location: 'Boston' 
});
```

### 2. "Find doctors who treat migraines"
```typescript
searchDoctors({ 
  condition: 'Migraine' 
});
```

### 3. "Find doctors for my headache"
```typescript
searchDoctors({ 
  symptom: 'Headache' 
});
```

### 4. "Find Dr. Sarah Johnson"
```typescript
searchDoctors({ 
  name: 'Sarah Johnson' 
});
```

### 5. "Find affordable cardiologists with good ratings"
```typescript
searchDoctors({ 
  specialty: 'Cardiology',
  minRating: 4.5,
  maxFee: 200,
  sortBy: 'consultationFee',
  sortOrder: 'asc'
});
```

### 6. "Find neurologists in my area who treat epilepsy"
```typescript
searchDoctors({ 
  specialty: 'Neurology',
  location: 'Boston',
  condition: 'Epilepsy'
});
```

## Filter Tab Options (Mobile UI)

| Tab | Options Loaded From |
|-----|---------------------|
| **Speciality** | `filterOptions.specializations` |
| **Location** | `filterOptions.locations` |
| **Condition** | `filterOptions.conditions` |
| **Symptom** | `filterOptions.symptoms` |

## State Management

```typescript
// Selected Filters
const [selectedSpecialty, setSelectedSpecialty] = useState<string>('');
const [selectedLocation, setSelectedLocation] = useState<string>('');
const [selectedCondition, setSelectedCondition] = useState<string>('');
const [selectedSymptom, setSelectedSymptom] = useState<string>('');

// Search Query
const [searchQuery, setSearchQuery] = useState('');

// Active Tab
const [activeTab, setActiveTab] = useState<'Speciality' | 'Location' | 'Condition' | 'Symptom'>('Speciality');
```

## Error Handling

### Backend Errors
```json
{
  "success": false,
  "error": "Internal Server Error",
  "message": "Detailed error message"
}
```

### Mobile App Error Handling
```typescript
try {
  const response = await searchDoctors(params);
  if (response.success) {
    setDoctors(response.data);
  }
} catch (error: any) {
  Alert.alert(
    'Error',
    error.response?.data?.message || 'Failed to load doctors'
  );
}
```

## Performance Tips

1. **Use Pagination**: Don't load all results at once
   ```typescript
   searchDoctors({ limit: 50, page: 1 });
   ```

2. **Debounce Search**: Wait for user to stop typing
   ```typescript
   const debouncedSearch = useDebouncedCallback(
     (query) => searchDoctors({ name: query }),
     500
   );
   ```

3. **Cache Filter Options**: Load once and reuse
   ```typescript
   useEffect(() => {
     fetchFilterOptions(); // Only called once
   }, []);
   ```

4. **Progressive Loading**: Load more on scroll
   ```typescript
   onEndReached={() => {
     if (hasMore && !loading) {
       fetchDoctors(currentPage + 1, true);
     }
   }}
   ```

## Troubleshooting

### Issue: No results returned
**Check:** Test data exists
```bash
curl http://localhost:4003/api/doctors | jq '.data | length'
```

### Issue: Empty filter options
**Check:** Database has diverse data
```bash
curl http://localhost:4003/api/doctors/filter-options | jq .
```

### Issue: Slow search
**Check:** Database indexes
```javascript
// Ensure text index exists
db.doctors.getIndexes()
```

### Issue: Mobile can't reach API
**Check:** Network configuration
```typescript
// iOS: localhost:4003
// Android Emulator: 10.0.2.2:4003
// Physical Device: <your-computer-ip>:4003
```

## Quick Start

### 1. Start Backend
```bash
cd services/doctor-service
node src/server.js
```

### 2. Test API
```bash
curl http://localhost:4003/api/doctors/search?name=Sarah
```

### 3. Run Mobile App
```bash
cd mobile_ui_app
npm run ios  # or npm run android
```

### 4. Test in App
1. Login
2. See doctor list
3. Try different filter tabs
4. Search by name
5. Combine filters

## Documentation Files

- **COMPREHENSIVE_DOCTOR_SEARCH.md** - Full implementation details
- **SEARCH_TESTING_GUIDE.md** - Complete testing procedures
- **SEARCH_UPDATE.md** - Backend changes documentation (in doctor-service)
- **QUICK_REFERENCE.md** - This file

## Support

For issues:
1. Check backend logs: `/tmp/doctor-service.log`
2. Check mobile logs: React Native debugger
3. Verify service status: `curl http://localhost:4003/health`
4. Check database: `mongo doctor_db`
