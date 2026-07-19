# Doctor Search - Testing Guide

## Backend API Testing

### Prerequisites
- Doctor service running on port 4003
- MongoDB with sample doctor data

### Test Suite

#### 1. Search by Name
```bash
# Test: Find doctor by first name
curl -s "http://localhost:4003/api/doctors/search?name=Sarah" | jq '{success, count: (.data | length), doctors: [.data[] | .firstName]}'

# Expected Output:
# {
#   "success": true,
#   "count": 1,
#   "doctors": ["Sarah"]
# }

# Test: Find doctor by last name
curl -s "http://localhost:4003/api/doctors/search?name=Chen" | jq '{success, count: (.data | length)}'

# Test: Partial name search
curl -s "http://localhost:4003/api/doctors/search?name=Sar" | jq '.data[].firstName'
```

#### 2. Search by Specialty
```bash
# Test: Cardiology specialists
curl -s "http://localhost:4003/api/doctors/search?specialty=Cardiology" | jq '{success, count: (.data | length), doctors: [.data[] | {name: (.firstName + " " + .lastName), specialty: .specializations[0]}]}'

# Expected Output:
# {
#   "success": true,
#   "count": 1,
#   "doctors": [
#     {
#       "name": "Sarah Johnson",
#       "specialty": "Cardiology"
#     }
#   ]
# }

# Test: Neurology specialists
curl -s "http://localhost:4003/api/doctors/search?specialty=Neurology" | jq '.data[].firstName'

# Test: Case-insensitive specialty
curl -s "http://localhost:4003/api/doctors/search?specialty=cardiology" | jq '.data | length'
```

#### 3. Search by Location
```bash
# Test: Doctors in Boston
curl -s "http://localhost:4003/api/doctors/search?location=Boston" | jq '{success, count: (.data | length), doctors: [.data[] | {name: (.firstName + " " + .lastName), city: .address.city}]}'

# Expected Output:
# {
#   "success": true,
#   "count": 1,
#   "doctors": [
#     {
#       "name": "Sarah Johnson",
#       "city": "Boston"
#     }
#   ]
# }

# Test: Partial location match
curl -s "http://localhost:4003/api/doctors/search?location=Bos" | jq '.data | length'

# Test: Case-insensitive location
curl -s "http://localhost:4003/api/doctors/search?location=boston" | jq '.data | length'
```

#### 4. Search by Medical Condition
```bash
# Test: Doctors treating Migraine
curl -s "http://localhost:4003/api/doctors/search?condition=Migraine" | jq '{success, count: (.data | length), doctors: [.data[] | {name: (.firstName + " " + .lastName), specialty: .specializations[0], conditions: .treatedConditions}]}'

# Expected Output:
# {
#   "success": true,
#   "count": 1,
#   "doctors": [
#     {
#       "name": "Michael Chen",
#       "specialty": "Neurology",
#       "conditions": ["Migraine", "Epilepsy", "Neuropathy", "Multiple Sclerosis"]
#     }
#   ]
# }

# Test: Multiple doctors with same condition
curl -s "http://localhost:4003/api/doctors/search?condition=Hypertension" | jq '.data | length'

# Test: Exact condition match
curl -s "http://localhost:4003/api/doctors/search?condition=Multiple%20Sclerosis" | jq '.data[].treatedConditions'
```

#### 5. Search by Symptom
```bash
# Test: Doctors treating Headache
curl -s "http://localhost:4003/api/doctors/search?symptom=Headache" | jq '{success, count: (.data | length), doctors: [.data[] | {name: (.firstName + " " + .lastName), specialty: .specializations[0], symptoms: .treatedSymptoms}]}'

# Expected Output:
# {
#   "success": true,
#   "count": 1,
#   "doctors": [
#     {
#       "name": "Michael Chen",
#       "specialty": "Neurology",
#       "symptoms": ["Headache", "Dizziness", "Numbness", "Memory Problems"]
#     }
#   ]
# }

# Test: Chest Pain symptom
curl -s "http://localhost:4003/api/doctors/search?symptom=Chest%20Pain" | jq '.data[].firstName'

# Test: Dizziness symptom
curl -s "http://localhost:4003/api/doctors/search?symptom=Dizziness" | jq '.data | length'
```

#### 6. Combined Search Filters
```bash
# Test: Specialty + Location
curl -s "http://localhost:4003/api/doctors/search?specialty=Cardiology&location=Boston" | jq '{success, count: (.data | length), doctors: [.data[] | {name: (.firstName + " " + .lastName), specialty: .specializations[0], city: .address.city}]}'

# Expected Output:
# {
#   "success": true,
#   "count": 1,
#   "doctors": [
#     {
#       "name": "Sarah Johnson",
#       "specialty": "Cardiology",
#       "city": "Boston"
#     }
#   ]
# }

# Test: Name + Specialty
curl -s "http://localhost:4003/api/doctors/search?name=Michael&specialty=Neurology" | jq '.data | length'

# Test: Location + Condition
curl -s "http://localhost:4003/api/doctors/search?location=Chicago&condition=Migraine" | jq '.data[].address.city'

# Test: Specialty + Symptom
curl -s "http://localhost:4003/api/doctors/search?specialty=Neurology&symptom=Headache" | jq '.data | length'
```

#### 7. Pagination
```bash
# Test: First page
curl -s "http://localhost:4003/api/doctors/search?page=1&limit=2" | jq '{page: .pagination.page, limit: .pagination.limit, total: .pagination.total, count: (.data | length)}'

# Test: Second page
curl -s "http://localhost:4003/api/doctors/search?page=2&limit=2" | jq '.data | length'

# Test: Custom limit
curl -s "http://localhost:4003/api/doctors/search?limit=50" | jq '.pagination'
```

#### 8. Sorting
```bash
# Test: Sort by rating descending
curl -s "http://localhost:4003/api/doctors/search?sortBy=rating&sortOrder=desc" | jq '[.data[] | {name: .firstName, rating}]'

# Test: Sort by name ascending
curl -s "http://localhost:4003/api/doctors/search?sortBy=firstName&sortOrder=asc" | jq '[.data[] | .firstName]'

# Test: Sort by fee ascending
curl -s "http://localhost:4003/api/doctors/search?sortBy=consultationFee&sortOrder=asc" | jq '[.data[] | {name: .firstName, fee: .consultationFee}]'
```

#### 9. No Results
```bash
# Test: Non-existent name
curl -s "http://localhost:4003/api/doctors/search?name=NonExistent" | jq '{success, count: (.data | length)}'

# Expected Output:
# {
#   "success": true,
#   "count": 0
# }

# Test: Non-existent specialty
curl -s "http://localhost:4003/api/doctors/search?specialty=Astrology" | jq '.data | length'

# Test: Non-existent location
curl -s "http://localhost:4003/api/doctors/search?location=Mars" | jq '.data | length'
```

#### 10. Error Handling
```bash
# Test: Invalid page number
curl -s "http://localhost:4003/api/doctors/search?page=-1" | jq '{success, error, message}'

# Test: Invalid limit
curl -s "http://localhost:4003/api/doctors/search?limit=500" | jq '{success, error}'

# Test: Invalid sort field
curl -s "http://localhost:4003/api/doctors/search?sortBy=invalid" | jq '{success, error}'
```

## Mobile App Testing

### Prerequisites
- Mobile app running on simulator/device
- Doctor service accessible from mobile app
- Test data seeded in database

### Manual Test Cases

#### Test Case 1: Initial Load
**Steps:**
1. Launch the app
2. Login with valid credentials
3. Observe Doctor List screen loads

**Expected Results:**
- ✅ Loading indicator appears briefly
- ✅ 50 doctors loaded (or all if less than 50)
- ✅ Doctors sorted by rating (highest first)
- ✅ Filter tabs visible: Speciality, Location, Condition, Symptom
- ✅ Search bar with "Search by name" placeholder

#### Test Case 2: Search by Name
**Steps:**
1. Tap search input field
2. Type "Sarah"
3. Tap Search button

**Expected Results:**
- ✅ Loading indicator appears
- ✅ Doctor list updates to show "Sarah Johnson"
- ✅ Only 1 result shown
- ✅ Doctor card shows correct information

#### Test Case 3: Filter by Specialty
**Steps:**
1. Tap "Speciality" tab (should be active by default)
2. Scroll through specialty options
3. Tap "Cardiology"

**Expected Results:**
- ✅ "Cardiology" option highlighted in blue
- ✅ Doctor list updates automatically
- ✅ Only cardiologists shown
- ✅ "Sarah Johnson" appears in results

#### Test Case 4: Filter by Location
**Steps:**
1. Tap "Location" tab
2. Tap "Boston"

**Expected Results:**
- ✅ Tab switches to "Location"
- ✅ "Boston" option highlighted
- ✅ Only doctors in Boston shown
- ✅ Results update automatically

#### Test Case 5: Filter by Condition
**Steps:**
1. Tap "Condition" tab
2. Scroll through conditions
3. Tap "Migraine"

**Expected Results:**
- ✅ Tab switches to "Condition"
- ✅ "Migraine" option highlighted
- ✅ Only doctors treating migraine shown
- ✅ "Michael Chen" appears in results

#### Test Case 6: Filter by Symptom
**Steps:**
1. Tap "Symptom" tab
2. Tap "Headache"

**Expected Results:**
- ✅ Tab switches to "Symptom"
- ✅ "Headache" option highlighted
- ✅ Only doctors treating headache shown
- ✅ Relevant doctors displayed

#### Test Case 7: Combined Filters
**Steps:**
1. Tap "Speciality" tab
2. Select "Cardiology"
3. Tap "Location" tab
4. Select "Boston"

**Expected Results:**
- ✅ Previous specialty filter maintained
- ✅ Both filters applied
- ✅ Only cardiologists in Boston shown
- ✅ Results accurately filtered

#### Test Case 8: Clear Filter
**Steps:**
1. Select a filter (e.g., "Cardiology")
2. Tap the same filter again

**Expected Results:**
- ✅ Filter is cleared
- ✅ All doctors shown again
- ✅ Filter option no longer highlighted

#### Test Case 9: Search + Filter
**Steps:**
1. Type "Johnson" in search box
2. Tap Search
3. Select "Cardiology" specialty

**Expected Results:**
- ✅ Both search and filter applied
- ✅ Shows cardiologists with "Johnson" in name
- ✅ Results narrowed correctly

#### Test Case 10: Empty Results
**Steps:**
1. Search for "XYZ" (non-existent name)
2. Tap Search

**Expected Results:**
- ✅ Loading indicator appears and disappears
- ✅ Empty state shown with magnifying glass icon
- ✅ "No doctors found" message displayed
- ✅ "Try adjusting your search filters" subtext shown

#### Test Case 11: Pull to Refresh
**Steps:**
1. Pull down on doctor list
2. Release

**Expected Results:**
- ✅ Refresh indicator appears
- ✅ Doctor list reloads
- ✅ Filters maintained
- ✅ Fresh data loaded

#### Test Case 12: Pagination (Infinite Scroll)
**Steps:**
1. Scroll down to bottom of list
2. Continue scrolling

**Expected Results:**
- ✅ "Loading more..." indicator at bottom
- ✅ Next page of results appended
- ✅ Smooth scrolling experience
- ✅ No duplicate entries

#### Test Case 13: Back Button (Logout)
**Steps:**
1. Tap back arrow in header
2. Observe confirmation dialog
3. Tap "Logout"

**Expected Results:**
- ✅ Confirmation alert shown
- ✅ "Are you sure you want to logout?" message
- ✅ Cancel and Logout buttons visible
- ✅ Tapping Logout returns to login screen
- ✅ Tapping Cancel closes dialog

#### Test Case 14: Doctor Card Press
**Steps:**
1. Tap on any doctor card
2. Read the alert

**Expected Results:**
- ✅ Alert shows doctor details
- ✅ Bio displayed
- ✅ Qualifications shown
- ✅ Rating and review count displayed

#### Test Case 15: Book Button
**Steps:**
1. Tap "Book" button on any doctor card
2. Confirm booking in alert

**Expected Results:**
- ✅ Booking confirmation alert shown
- ✅ Doctor name in alert
- ✅ "Coming Soon" message (if not implemented)

### Automated Test Scenarios

```typescript
describe('DoctorListScreen', () => {
  it('should load initial 50 doctors', async () => {
    // Test implementation
  });

  it('should search by name', async () => {
    // Test implementation
  });

  it('should filter by specialty', async () => {
    // Test implementation
  });

  it('should filter by location', async () => {
    // Test implementation
  });

  it('should filter by condition', async () => {
    // Test implementation
  });

  it('should filter by symptom', async () => {
    // Test implementation
  });

  it('should handle combined filters', async () => {
    // Test implementation
  });

  it('should show empty state when no results', async () => {
    // Test implementation
  });

  it('should handle API errors gracefully', async () => {
    // Test implementation
  });
});
```

## Performance Testing

### Load Testing
```bash
# Test: Concurrent search requests
for i in {1..10}; do
  curl -s "http://localhost:4003/api/doctors/search?specialty=Cardiology" &
done
wait

# Test: Large result set pagination
curl -s "http://localhost:4003/api/doctors/search?page=1&limit=100"
```

### Response Time Testing
```bash
# Test: Measure search response time
time curl -s "http://localhost:4003/api/doctors/search?name=Sarah&specialty=Cardiology&location=Boston" > /dev/null

# Expected: < 500ms for simple queries
```

## Test Data Requirements

Ensure the following test data exists:

### Doctors
- At least 5 doctors with different specialties
- Doctors in multiple locations
- Various conditions and symptoms covered
- Different rating levels
- Range of consultation fees

### Sample Data
```javascript
{
  firstName: "Sarah",
  lastName: "Johnson",
  specializations: ["Cardiology"],
  address: { city: "Boston", state: "MA" },
  treatedConditions: ["Hypertension", "Heart Disease"],
  treatedSymptoms: ["Chest Pain", "Shortness of Breath"],
  rating: 4.8
}

{
  firstName: "Michael",
  lastName: "Chen",
  specializations: ["Neurology"],
  address: { city: "Chicago", state: "IL" },
  treatedConditions: ["Migraine", "Epilepsy"],
  treatedSymptoms: ["Headache", "Dizziness"],
  rating: 4.7
}
```

## Test Execution Summary

### Backend API Tests: ✅ All Passed
- Search by Name: ✅
- Search by Specialty: ✅
- Search by Location: ✅
- Search by Condition: ✅
- Search by Symptom: ✅
- Combined Filters: ✅
- Pagination: ✅
- Sorting: ✅

### Mobile App Tests: 🔄 Ready for Testing
- UI properly updated with new filter tabs
- Search parameters correctly passed to API
- All filter options available
- Combined search functional

## Troubleshooting

### Issue: No results returned
**Solution:** Check if test data exists in database
```bash
curl http://localhost:4003/api/doctors | jq '.data | length'
```

### Issue: API not accessible from mobile
**Solution:** Check network configuration
```bash
# iOS Simulator: Use localhost
# Android Emulator: Use 10.0.2.2
# Physical Device: Use computer's IP address
```

### Issue: Filters not working
**Solution:** Check backend logs
```bash
tail -f /tmp/doctor-service.log
```

## Next Steps

1. ✅ Backend API fully tested and working
2. ✅ Mobile UI updated with comprehensive filters
3. 🔄 Manual testing on mobile app required
4. 📝 Collect user feedback
5. 🎯 Implement advanced features based on usage
