# Doctor Service - Mobile App Integration Guide

## 📱 Integrating Doctor Service with Your Mobile App

This guide helps mobile app developers (React Native, Flutter, iOS, Android) integrate the Doctor Service into their applications.

---

## Table of Contents

1. [Overview](#overview)
2. [Setup](#setup)
3. [Authentication](#authentication)
4. [Loading Doctor Lists](#loading-doctor-lists)
5. [Search Implementation](#search-implementation)
6. [Filter Dropdowns](#filter-dropdowns)
7. [Doctor Profile Display](#doctor-profile-display)
8. [Booking Integration](#booking-integration)
9. [Error Handling](#error-handling)
10. [Code Examples](#code-examples)
11. [Best Practices](#best-practices)

---

## Overview

The Doctor Service provides REST APIs to:
- 🔍 Search doctors with flexible filtering
- 👨‍⚕️ Get doctor profiles and details
- 📋 Retrieve filter options for dropdowns
- 📊 Get doctor statistics and ratings
- 📅 Check availability and manage slots

**Service Endpoints:**
```
Direct: http://localhost:4003/api/doctors/...
Via API Gateway: http://localhost:3000/api/doctor/...
```

---

## Setup

### 1. Install HTTP Client

#### React Native (Axios)
```bash
npm install axios
```

#### React Native (Fetch - Built-in)
```javascript
// No installation needed, use built-in fetch
```

#### Flutter (http)
```bash
flutter pub add http
```

### 2. Configure API Base URL

#### React Native (Axios)
```javascript
// src/api/doctorClient.js
import axios from 'axios';

const API_BASE_URL = 'http://localhost:3000/api/doctor';
// Or for production: 'https://api.example.com/api/doctor'

const doctorClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export default doctorClient;
```

#### React Native (Fetch)
```javascript
// src/api/doctorClient.js
export const API_BASE_URL = 'http://localhost:3000/api/doctor';

export const fetchDoctors = async (endpoint, options = {}) => {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      timeout: 10000,
      ...options,
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Fetch error:', error);
    throw error;
  }
};
```

#### Flutter
```dart
// lib/services/doctor_service.dart
import 'package:http/http.dart' as http;
import 'dart:convert';

class DoctorService {
  static const String API_BASE_URL = 'http://10.0.2.2:3000/api/doctor';
  // Use 10.0.2.2 for Android emulator, localhost for iOS
  
  static Future<Map<String, dynamic>> fetchDoctors(String endpoint) async {
    try {
      final response = await http.get(
        Uri.parse('$API_BASE_URL$endpoint'),
      ).timeout(Duration(seconds: 10));
      
      if (response.statusCode == 200) {
        return jsonDecode(response.body);
      } else {
        throw Exception('Failed to load doctors');
      }
    } catch (e) {
      print('Error: $e');
      rethrow;
    }
  }
}
```

---

## Authentication

### Getting Auth Token

1. **Register/Login** (handled by Auth Service)
```javascript
// Get token from auth service
const response = await fetch('http://localhost:3000/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'password123'
  })
});

const { data } = await response.json();
const token = data.accessToken;
```

2. **Store Token** (securely)
```javascript
// React Native - AsyncStorage
import AsyncStorage from '@react-native-async-storage/async-storage';

await AsyncStorage.setItem('authToken', token);

// Flutter - flutter_secure_storage
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

const storage = FlutterSecureStorage();
await storage.write(key: 'authToken', value: token);
```

3. **Use Token in Requests**
```javascript
// React Native - Axios interceptor
doctorClient.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// React Native - Fetch
const token = await AsyncStorage.getItem('authToken');
const response = await fetch(url, {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});
```

---

## Loading Doctor Lists

### Get All Doctors (Public)

**React Native:**
```javascript
import doctorClient from './api/doctorClient';

async function loadDoctors() {
  try {
    const response = await doctorClient.get('/search?page=1&limit=20');
    console.log('Doctors:', response.data.data);
    return response.data.data;
  } catch (error) {
    console.error('Error loading doctors:', error);
  }
}
```

**Flutter:**
```dart
Future<List<Doctor>> loadDoctors() async {
  try {
    final response = await DoctorService.fetchDoctors('/search?page=1&limit=20');
    List<dynamic> doctorList = response['data'];
    return doctorList.map((doc) => Doctor.fromJson(doc)).toList();
  } catch (e) {
    print('Error: $e');
    rethrow;
  }
}
```

---

## Search Implementation

### Search Features

The Doctor Service supports:
- ✅ Free text search (name, bio, specialty)
- ✅ Filter by specialization
- ✅ Filter by location (city)
- ✅ Filter by treated conditions
- ✅ Filter by treated symptoms
- ✅ Filter by availability date
- ✅ Pagination

### Search Examples

#### Search by Specialization

**React Native:**
```javascript
async function searchBySpecialty(specialty) {
  try {
    const response = await doctorClient.get('/search', {
      params: {
        specialization: specialty,
        page: 1,
        limit: 20
      }
    });
    return response.data.data;
  } catch (error) {
    console.error('Search error:', error);
  }
}

// Usage
const cardiologists = await searchBySpecialty('Cardiology');
```

#### Search by Location

**React Native:**
```javascript
async function searchByLocation(city) {
  try {
    const response = await doctorClient.get('/search', {
      params: {
        location: city,
        page: 1,
        limit: 20
      }
    });
    return response.data.data;
  } catch (error) {
    console.error('Search error:', error);
  }
}

// Usage
const bostonDoctors = await searchByLocation('Boston');
```

#### Search by Condition

**React Native:**
```javascript
async function searchByCondition(condition) {
  try {
    const response = await doctorClient.get('/search', {
      params: {
        condition: condition,
        page: 1,
        limit: 20
      }
    });
    return response.data.data;
  } catch (error) {
    console.error('Search error:', error);
  }
}

// Usage
const doctors = await searchByCondition('Heart Disease');
```

#### Advanced Search (Multiple Filters)

**React Native:**
```javascript
async function advancedSearch(filters) {
  try {
    const response = await doctorClient.get('/search', {
      params: {
        specialization: filters.specialty,
        location: filters.location,
        condition: filters.condition,
        symptom: filters.symptom,
        page: filters.page || 1,
        limit: filters.limit || 20
      }
    });
    return response.data.data;
  } catch (error) {
    console.error('Search error:', error);
  }
}

// Usage
const doctors = await advancedSearch({
  specialty: 'Cardiology',
  location: 'Boston',
  condition: 'Heart Disease',
  page: 1,
  limit: 20
});
```

---

## Filter Dropdowns

### Load Filter Options

Load filter options once when app starts, then cache them.

**React Native:**
```javascript
import { useEffect, useState } from 'react';
import doctorClient from './api/doctorClient';

function FilterDropdowns() {
  const [filters, setFilters] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFilters();
  }, []);

  async function loadFilters() {
    try {
      const response = await doctorClient.get('/filters/options');
      setFilters(response.data.data);
      setLoading(false);
    } catch (error) {
      console.error('Error loading filters:', error);
      setLoading(false);
    }
  }

  if (loading) return <Text>Loading...</Text>;

  return (
    <View>
      <Picker>
        {filters.specializations.map(spec => (
          <Picker.Item label={spec} value={spec} key={spec} />
        ))}
      </Picker>

      <Picker>
        {filters.locations.map(loc => (
          <Picker.Item label={loc} value={loc} key={loc} />
        ))}
      </Picker>

      <Picker>
        {filters.conditions.map(cond => (
          <Picker.Item label={cond} value={cond} key={cond} />
        ))}
      </Picker>
    </View>
  );
}

export default FilterDropdowns;
```

**Flutter:**
```dart
class DoctorFilters {
  List<String> specializations = [];
  List<String> locations = [];
  List<String> conditions = [];

  Future<void> loadFilters() async {
    try {
      final response = await DoctorService.fetchDoctors('/filters/options');
      specializations = List<String>.from(response['data']['specializations']);
      locations = List<String>.from(response['data']['locations']);
      conditions = List<String>.from(response['data']['conditions']);
    } catch (e) {
      print('Error loading filters: $e');
    }
  }
}
```

**Response Format:**
```json
{
  "success": true,
  "data": {
    "specializations": [
      "Cardiology",
      "Dermatology",
      "Pediatrics",
      "Orthopedics",
      ...
    ],
    "locations": [
      "Austin",
      "Boston",
      "Denver",
      "Miami",
      "San Francisco"
    ],
    "conditions": [
      "Acne",
      "Asthma",
      "Heart Disease",
      "Hypertension",
      ...
    ]
  }
}
```

---

## Doctor Profile Display

### Get Doctor Details

**React Native:**
```javascript
async function getDoctorDetails(doctorId) {
  try {
    const response = await doctorClient.get(`/${doctorId}`);
    return response.data.data;
  } catch (error) {
    console.error('Error fetching doctor:', error);
  }
}
```

### Doctor Profile Data Structure

```javascript
{
  _id: "69837b2355813aca43cdbc67",
  firstName: "Sarah",
  lastName: "Johnson",
  email: "dr.sarah.johnson@healthcare.com",
  phone: "+1-555-0101",
  specializations: ["Cardiology", "Internal Medicine"],
  treatedConditions: ["Hypertension", "Heart Disease"],
  treatedSymptoms: ["Chest Pain", "Shortness of Breath"],
  bio: "Board-certified cardiologist with 15 years of experience",
  rating: 4.8,
  reviewCount: 127,
  consultationFee: 200,
  address: {
    street: "123 Medical Center Dr",
    city: "Boston",
    state: "MA",
    zipCode: "02115",
    country: "USA"
  },
  qualifications: [
    {
      degree: "MD",
      institution: "Harvard Medical School",
      year: 2008
    }
  ],
  weeklySchedule: [
    {
      dayOfWeek: 1,
      isAvailable: true,
      startTime: "09:00",
      endTime: "17:00"
    }
  ],
  status: "active",
  isAvailable: true
}
```

### Display Example

**React Native Component:**
```javascript
import React, { useState, useEffect } from 'react';
import { View, Text, Image, ScrollView, Rating } from 'react-native';
import doctorClient from './api/doctorClient';

function DoctorProfile({ doctorId }) {
  const [doctor, setDoctor] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDoctor();
  }, [doctorId]);

  async function loadDoctor() {
    try {
      const response = await doctorClient.get(`/${doctorId}`);
      setDoctor(response.data.data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <Text>Loading...</Text>;
  if (!doctor) return <Text>Doctor not found</Text>;

  return (
    <ScrollView>
      <View style={styles.header}>
        <Text style={styles.name}>
          Dr. {doctor.firstName} {doctor.lastName}
        </Text>
        <Text style={styles.specialty}>
          {doctor.specializations.join(', ')}
        </Text>
      </View>

      <View style={styles.rating}>
        <Text>{doctor.rating} ⭐</Text>
        <Text>({doctor.reviewCount} reviews)</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        <Text>{doctor.bio}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Treats</Text>
        <Text>Conditions: {doctor.treatedConditions.join(', ')}</Text>
        <Text>Symptoms: {doctor.treatedSymptoms.join(', ')}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Contact</Text>
        <Text>📧 {doctor.email}</Text>
        <Text>📱 {doctor.phone}</Text>
        <Text>📍 {doctor.address.city}, {doctor.address.state}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Fee</Text>
        <Text>${doctor.consultationFee}</Text>
      </View>
    </ScrollView>
  );
}

export default DoctorProfile;
```

---

## Booking Integration

### Check Doctor Availability

**React Native:**
```javascript
async function getAvailableDoctors(date) {
  try {
    const response = await doctorClient.get('/available', {
      params: {
        date: date.toISOString().split('T')[0], // YYYY-MM-DD
        page: 1,
        limit: 50
      }
    });
    return response.data.data;
  } catch (error) {
    console.error('Error checking availability:', error);
  }
}

// Usage
const availableDoctors = await getAvailableDoctors(new Date('2026-02-10'));
```

### Get Doctor Statistics

**React Native:**
```javascript
async function getDoctorStats(doctorId) {
  try {
    const response = await doctorClient.get(`/${doctorId}/stats`);
    return response.data.data;
  } catch (error) {
    console.error('Error fetching stats:', error);
  }
}

// Returns:
// {
//   totalAppointments: 450,
//   completedAppointments: 435,
//   averageRating: 4.8,
//   totalReviews: 127,
//   availableSlots: 25,
//   upcomingAppointments: 12,
//   yearsActive: 15
// }
```

---

## Error Handling

### Handle API Errors

**React Native:**
```javascript
async function searchDoctors(filters) {
  try {
    const response = await doctorClient.get('/search', {
      params: filters
    });
    return response.data.data;
  } catch (error) {
    if (error.response) {
      // Server responded with error
      const status = error.response.status;
      const errorData = error.response.data;

      switch (status) {
        case 400:
          console.error('Bad request:', errorData.details);
          // Show validation error to user
          break;
        case 401:
          console.error('Unauthorized');
          // Redirect to login
          break;
        case 404:
          console.error('Doctor not found');
          break;
        case 500:
          console.error('Server error');
          // Show "try again later" message
          break;
        default:
          console.error('Error:', status);
      }
    } else if (error.request) {
      // Request made but no response
      console.error('No response from server');
      // Show offline message
    } else {
      // Error in request setup
      console.error('Error:', error.message);
    }
  }
}
```

### Error Response Format

```json
{
  "success": false,
  "error": "Validation Error",
  "message": "Validation failed",
  "details": [
    {
      "field": "specialization",
      "message": "Invalid specialization"
    }
  ]
}
```

---

## Code Examples

### Complete Example: Doctor Search Screen

**React Native (Functional Component):**
```javascript
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import doctorClient from '../api/doctorClient';

export default function DoctorSearchScreen() {
  const [doctors, setDoctors] = useState([]);
  const [filters, setFilters] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');

  // Load filter options
  useEffect(() => {
    loadFilters();
  }, []);

  async function loadFilters() {
    try {
      const response = await doctorClient.get('/filters/options');
      setFilters(response.data.data);
    } catch (error) {
      console.error('Error loading filters:', error);
    } finally {
      setLoading(false);
    }
  }

  // Search doctors
  async function handleSearch() {
    setSearching(true);
    try {
      const params = {
        page: 1,
        limit: 20,
      };

      if (searchQuery) params.query = searchQuery;
      if (selectedSpecialty) params.specialization = selectedSpecialty;
      if (selectedLocation) params.location = selectedLocation;

      const response = await doctorClient.get('/search', { params });
      setDoctors(response.data.data);
    } catch (error) {
      console.error('Search error:', error);
      alert('Error searching doctors');
    } finally {
      setSearching(false);
    }
  }

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1, padding: 20 }}>
      <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 20 }}>
        Find a Doctor
      </Text>

      {/* Search Query */}
      <TextInput
        placeholder="Search by name or specialty"
        value={searchQuery}
        onChangeText={setSearchQuery}
        style={{
          borderWidth: 1,
          borderColor: '#ddd',
          borderRadius: 8,
          padding: 10,
          marginBottom: 15,
        }}
      />

      {/* Specialty Filter */}
      <Text style={{ marginBottom: 5, fontWeight: '600' }}>Specialty</Text>
      <Picker
        selectedValue={selectedSpecialty}
        onValueChange={setSelectedSpecialty}
        style={{ marginBottom: 15 }}
      >
        <Picker.Item label="All Specialties" value="" />
        {filters?.specializations?.map((spec) => (
          <Picker.Item key={spec} label={spec} value={spec} />
        ))}
      </Picker>

      {/* Location Filter */}
      <Text style={{ marginBottom: 5, fontWeight: '600' }}>Location</Text>
      <Picker
        selectedValue={selectedLocation}
        onValueChange={setSelectedLocation}
        style={{ marginBottom: 15 }}
      >
        <Picker.Item label="All Locations" value="" />
        {filters?.locations?.map((loc) => (
          <Picker.Item key={loc} label={loc} value={loc} />
        ))}
      </Picker>

      {/* Search Button */}
      <TouchableOpacity
        onPress={handleSearch}
        style={{
          backgroundColor: '#007AFF',
          padding: 12,
          borderRadius: 8,
          marginBottom: 20,
        }}
        disabled={searching}
      >
        <Text style={{ color: 'white', textAlign: 'center', fontWeight: '600' }}>
          {searching ? 'Searching...' : 'Search'}
        </Text>
      </TouchableOpacity>

      {/* Results */}
      <FlatList
        data={doctors}
        keyExtractor={(item) => item._id}
        scrollEnabled={false}
        renderItem={({ item }) => (
          <View
            style={{
              borderWidth: 1,
              borderColor: '#ddd',
              borderRadius: 8,
              padding: 15,
              marginBottom: 10,
            }}
          >
            <Text style={{ fontSize: 16, fontWeight: 'bold' }}>
              Dr. {item.firstName} {item.lastName}
            </Text>
            <Text style={{ color: '#666' }}>
              {item.specializations.join(', ')}
            </Text>
            <Text style={{ marginTop: 5 }}>
              ⭐ {item.rating} ({item.reviewCount} reviews)
            </Text>
            <Text style={{ marginTop: 5, color: '#007AFF' }}>
              ${item.consultationFee}/consultation
            </Text>
            <TouchableOpacity
              style={{
                backgroundColor: '#34C759',
                padding: 10,
                borderRadius: 8,
                marginTop: 10,
              }}
            >
              <Text style={{ color: 'white', textAlign: 'center' }}>
                View Profile
              </Text>
            </TouchableOpacity>
          </View>
        )}
      />
    </ScrollView>
  );
}
```

---

## Best Practices

### 1. Caching

Cache filter options and doctor lists to reduce API calls:

```javascript
import AsyncStorage from '@react-native-async-storage/async-storage';

async function getCachedOrFetch(key, fetchFunction, cacheTime = 3600000) {
  // Try to get from cache
  const cached = await AsyncStorage.getItem(key);
  if (cached) {
    const { data, timestamp } = JSON.parse(cached);
    if (Date.now() - timestamp < cacheTime) {
      return data;
    }
  }

  // Fetch fresh data
  const data = await fetchFunction();

  // Cache it
  await AsyncStorage.setItem(key, JSON.stringify({
    data,
    timestamp: Date.now(),
  }));

  return data;
}

// Usage
const filters = await getCachedOrFetch(
  'doctor_filters',
  () => doctorClient.get('/filters/options'),
  3600000 // 1 hour
);
```

### 2. Pagination

Implement infinite scroll/lazy loading:

```javascript
const [page, setPage] = useState(1);
const [doctors, setDoctors] = useState([]);
const [hasMore, setHasMore] = useState(true);

async function loadMore() {
  if (!hasMore) return;

  try {
    const response = await doctorClient.get('/search', {
      params: {
        page: page + 1,
        limit: 20,
      }
    });

    setDoctors([...doctors, ...response.data.data]);
    setPage(page + 1);
    setHasMore(response.data.pagination.pages > page + 1);
  } catch (error) {
    console.error('Error loading more:', error);
  }
}
```

### 3. Debouncing Search

Avoid excessive API calls while typing:

```javascript
import { useCallback, useRef } from 'react';

function DoctorSearch() {
  const debounceTimer = useRef(null);

  const handleSearchChange = useCallback((text) => {
    clearTimeout(debounceTimer.current);

    debounceTimer.current = setTimeout(() => {
      performSearch(text);
    }, 500); // Wait 500ms after user stops typing
  }, []);

  return <TextInput onChangeText={handleSearchChange} />;
}
```

### 4. Offline Support

Cache search results for offline viewing:

```javascript
async function searchWithOfflineSupport(filters) {
  try {
    // Try online first
    const response = await doctorClient.get('/search', { params: filters });
    const data = response.data.data;

    // Cache for offline
    await AsyncStorage.setItem('last_search', JSON.stringify(data));

    return data;
  } catch (error) {
    // Fall back to cached data
    const cached = await AsyncStorage.getItem('last_search');
    if (cached) {
      console.log('Using cached data (offline)');
      return JSON.parse(cached);
    }

    throw error;
  }
}
```

### 5. Retry Logic

Implement retry with exponential backoff:

```javascript
async function fetchWithRetry(fn, maxRetries = 3, delay = 1000) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries - 1) throw error;

      // Wait before retrying (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, attempt)));
    }
  }
}

// Usage
const doctors = await fetchWithRetry(() =>
  doctorClient.get('/search?specialization=Cardiology')
);
```

### 6. Error User Messages

Show user-friendly error messages:

```javascript
function getErrorMessage(error) {
  if (error.response?.status === 400) {
    return 'Invalid search. Please check your input.';
  } else if (error.response?.status === 401) {
    return 'Please login to continue.';
  } else if (error.response?.status === 404) {
    return 'Doctor not found.';
  } else if (error.request) {
    return 'No internet connection. Please check your network.';
  } else {
    return 'Something went wrong. Please try again.';
  }
}
```

---

## Testing Checklist

- [ ] Load filter dropdowns successfully
- [ ] Search by specialization returns correct results
- [ ] Search by location returns doctors in that city
- [ ] Search by condition shows relevant doctors
- [ ] Pagination works (page 2, page 3, etc.)
- [ ] Doctor profile displays all information correctly
- [ ] Rating and review count display accurately
- [ ] Offline mode shows cached data
- [ ] Error messages display appropriately
- [ ] Authentication token is included in protected requests
- [ ] Token refresh on expiration
- [ ] Performance is acceptable (< 2s load time)

---

## Troubleshooting

### Service Not Responding
- Verify API Gateway is running: `curl http://localhost:3000/health`
- Check API base URL in your app configuration
- Ensure device/emulator can reach the API (use 10.0.2.2 for Android emulator)

### No Results Found
- Check that sample data is seeded: `npm run seed` in doctor-service
- Verify specializations are spelled correctly
- Use filter options endpoint to get valid values

### Authentication Issues
- Verify token is being sent in Authorization header
- Check token hasn't expired (tokens expire in 1 hour)
- Ensure Bearer format: `Authorization: Bearer <token>`

### Slow Performance
- Implement pagination (don't load all 1000+ doctors)
- Cache filter options and search results
- Use pagination with `limit=20` or less
- Debounce search input

---

## Support Resources

- 📚 API Documentation: [DOCTOR_SERVICE_API.md](./DOCTOR_SERVICE_API.md)
- 🚀 Quick Start: [QUICK_START.md](./QUICK_START.md)
- 👨‍💻 Developer Guide: [DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md)
- 🎯 Documentation Index: [DOCUMENTATION_INDEX.md](./DOCUMENTATION_INDEX.md)

---

**Last Updated:** February 5, 2026  
**Tested Platforms:** React Native, Flutter  
**API Version:** 1.0.0
