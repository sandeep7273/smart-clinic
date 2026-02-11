# Mobile App GraphQL Migration

## Overview
Successfully migrated the mobile app (`mobile_ui_app`) to consume the doctor service **exclusively through API Gateway using GraphQL** instead of direct REST API calls.

## Changes Made

### 1. Updated Doctor API Service
**File:** [mobile_ui_app/src/api/doctor.api.ts](mobile_ui_app/src/api/doctor.api.ts)

**Before:** Direct REST calls to doctor-service (http://localhost:4003/api)
```typescript
// OLD - Direct REST
const response = await doctorClient.get('/doctors', { params });
```

**After:** GraphQL queries through API Gateway (http://localhost:3000/graphql)
```typescript
// NEW - GraphQL through API Gateway
import { searchDoctors as graphqlSearchDoctors } from './graphql.client';
const result = await graphqlSearchDoctors({ page, limit, sortBy, sortOrder });
```

**Migrated Functions:**
- ✅ `getDoctors()` → Uses GraphQL `searchDoctors` with no filters
- ✅ `searchDoctors()` → Uses GraphQL `searchDoctors` with filters
- ✅ `getDoctorById()` → Uses GraphQL `getDoctor` query
- ✅ `getAvailableDoctors()` → Uses GraphQL `searchDoctors` with `isAvailable: true`
- ✅ `getDoctorsBySpecialization()` → Uses GraphQL `getDoctorsBySpecialization`
- ✅ `getFilterOptions()` → Uses GraphQL `getPopularSpecializations`
- ✅ `getDoctorStats()` → Uses GraphQL `getDoctor` query for basic stats

### 2. Deprecated Direct Service URLs
**File:** [mobile_ui_app/src/constants/config.ts](mobile_ui_app/src/constants/config.ts)

Marked `getDoctorServiceUrl()` as deprecated:
```typescript
/**
 * @deprecated Use GraphQL through API Gateway instead (getApiGraphQLUrl)
 * This function is kept for backward compatibility only
 */
export const getDoctorServiceUrl = (): string => {
  // Still available but deprecated
}
```

### 3. GraphQL Client (Already Created)
**File:** [mobile_ui_app/src/api/graphql.client.ts](mobile_ui_app/src/api/graphql.client.ts)

Provides type-safe GraphQL operations:
- `searchDoctors()` - Search with filters
- `getDoctorById()` - Get doctor details
- `getDoctorAvailability()` - Get time slots
- `getDoctorsBySpecialization()` - Filter by specialization
- `getPopularSpecializations()` - Get specializations list
- `reserveSlot()` - Reserve time slot (mutation)
- `releaseSlot()` - Release time slot (mutation)

## Architecture Flow

### Before (Direct REST)
```
Mobile App → Doctor Service REST API (Port 4003)
     ↓
  /api/doctors
  /api/doctors/search
  /api/doctors/:id
```

### After (GraphQL via API Gateway)
```
Mobile App → API Gateway GraphQL (Port 3000)
     ↓
  /graphql
     ↓
  Doctor Service GraphQL (Port 4003)
     ↓
  Doctor Service Business Logic
```

## Benefits

1. **Single Entry Point**: All requests go through API Gateway
2. **Type Safety**: GraphQL provides strong typing
3. **Flexible Queries**: Request only the fields you need
4. **Better Performance**: Reduced over-fetching/under-fetching
5. **Centralized Auth**: Token validation at API Gateway level
6. **Schema Federation**: Can combine multiple services
7. **Real-time Support**: WebSocket subscriptions possible in future

## Testing

### 1. Start Required Services

**Terminal 1 - Doctor Service:**
```bash
cd services/doctor-service
npm run dev
```
Wait for: `🚀 Doctor Service running on port 4003`

**Terminal 2 - API Gateway:**
```bash
cd api-gateway
npm run dev
```
Wait for: `✅ GraphQL endpoint available at /graphql`

**Terminal 3 - Mobile App:**
```bash
cd mobile_ui_app
npm start
# or
npx expo start
```

### 2. Verify GraphQL Endpoints

**Test Doctor Service GraphQL directly:**
```bash
curl -X POST http://localhost:4003/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "{ searchDoctors(limit: 5) { doctors { id firstName lastName specializations rating } pagination { total } } }"
  }'
```

**Test API Gateway GraphQL (federated):**
```bash
curl -X POST http://localhost:3000/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "{ searchDoctors(limit: 5) { doctors { id firstName lastName specializations rating } pagination { total } } }"
  }'
```

### 3. Test Mobile App Features

Open the mobile app and test:
1. ✅ **Doctor List Screen** - Should load doctors via GraphQL
2. ✅ **Search Doctors** - Should search via GraphQL
3. ✅ **Filter by Specialization** - Should use GraphQL filters
4. ✅ **Doctor Details** - Should fetch via GraphQL getDoctorById
5. ✅ **Available Doctors** - Should filter via GraphQL

### 4. Monitor Console Logs

**Mobile App Console:**
```
[GraphQL Client] Initializing with endpoint: http://localhost:3000/graphql
📤 POST http://localhost:3000/graphql
📥 Response: 200
```

**API Gateway Console:**
```
[info]: Starting GraphQL schema stitching...
[info]: ✅ GraphQL endpoint available at /graphql
[info]: Executing GraphQL query on doctor-service
```

**Doctor Service Console:**
```
[info]: 🚀 GraphQL Server ready at http://localhost:4003/graphql
[info]: GraphQL request received
```

## Network Monitoring

Use React Native Debugger or Flipper to verify:
- All doctor-related requests go to `http://localhost:3000/graphql` (API Gateway)
- No direct requests to `http://localhost:4003` (Doctor Service)
- GraphQL queries include proper auth tokens
- Response data structure matches GraphQL schema

## Troubleshooting

### Issue: Mobile app still using REST endpoints

**Solution:** Clear Metro bundler cache
```bash
cd mobile_ui_app
npm start -- --reset-cache
# or
npx expo start -c
```

### Issue: GraphQL endpoint returns 404

**Solution:** Check middleware ordering in API Gateway
- Error handlers must be registered AFTER Apollo Server initialization
- See: [api-gateway/src/index.js](api-gateway/src/index.js) lines 155-165

### Issue: Cannot reach API Gateway from Android emulator

**Solution:** Use correct IP address
- Android Emulator: `http://10.0.2.2:3000/graphql`
- Update in [mobile_ui_app/src/constants/config.ts](mobile_ui_app/src/constants/config.ts)

### Issue: Authentication errors

**Solution:** Ensure auth token is being passed
- Check GraphQL client interceptor in [graphql.client.ts](mobile_ui_app/src/api/graphql.client.ts)
- Token should be in `Authorization: Bearer <token>` header

## Migration Checklist

- ✅ Updated `doctor.api.ts` to use GraphQL
- ✅ All doctor operations use GraphQL client
- ✅ Deprecated direct service URL function
- ✅ GraphQL client properly configured
- ✅ Auth token forwarding implemented
- ✅ Error handling for 401 responses
- ✅ Backward compatible response format
- ✅ Console logging for debugging
- ✅ Documentation created

## Future Enhancements

1. **Add Subscriptions**: Real-time updates for appointment slots
2. **Batch Requests**: Combine multiple queries in one request
3. **Caching**: Implement Apollo Client for smart caching
4. **Offline Support**: Queue mutations when offline
5. **Optimistic Updates**: Update UI before server response
6. **Error Boundary**: Better GraphQL error handling
7. **Query Fragments**: Reusable query fragments

## Related Files

- [mobile_ui_app/src/api/doctor.api.ts](mobile_ui_app/src/api/doctor.api.ts) - Doctor API wrapper (now uses GraphQL)
- [mobile_ui_app/src/api/graphql.client.ts](mobile_ui_app/src/api/graphql.client.ts) - GraphQL client
- [mobile_ui_app/src/constants/config.ts](mobile_ui_app/src/constants/config.ts) - API configuration
- [api-gateway/src/index.js](api-gateway/src/index.js) - API Gateway with GraphQL
- [api-gateway/src/graphql/doctorServiceProxy.js](api-gateway/src/graphql/doctorServiceProxy.js) - GraphQL proxy
- [services/doctor-service/src/graphql/](services/doctor-service/src/graphql/) - Doctor service GraphQL schema

## Success Criteria

- ✅ Mobile app loads doctor list via GraphQL
- ✅ Search functionality works via GraphQL
- ✅ Doctor details load via GraphQL
- ✅ Filters work via GraphQL
- ✅ No direct calls to doctor-service (port 4003)
- ✅ All traffic goes through API Gateway (port 3000)
- ✅ Auth tokens properly forwarded
- ✅ Error handling works correctly

## Notes

- The `doctor.api.ts` file maintains the same interface (function signatures) for backward compatibility
- Existing screens don't need to be updated - they continue to import from `doctor.api.ts`
- The migration is transparent to UI components
- REST API endpoints in doctor-service still work (for backward compatibility)
- GraphQL is now the primary communication method
