# Login Flow Architecture

## 🔄 Complete Login Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         USER INTERACTION                             │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  │ User enters email & password
                                  │ Clicks "Sign In"
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      LoginScreen.tsx                                 │
│  • Validates form fields                                             │
│  • Dispatches loginUser() thunk                                      │
│  • Shows loading state                                               │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  │ dispatch(loginUser({email, password}))
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    Redux Store (authSlice.ts)                        │
│  • State: loading = true                                             │
│  • Clear previous errors                                             │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  │ Async thunk execution
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     authThunks.ts                                    │
│  • loginUser thunk executes                                          │
│  • Calls loginApi(payload)                                           │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  │ API call
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      auth.api.ts                                     │
│  • loginApi() function                                               │
│  • POST /auth/login                                                  │
│  • Uses httpClient                                                   │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  │ HTTP request via Axios
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     httpClient.ts                                    │
│  • Axios instance                                                    │
│  • Request interceptor (adds JWT if exists)                          │
│  • Determines baseURL from config                                    │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                    ┌─────────────┴─────────────┐
                    │                           │
        API_MODE = 'dummy'         API_MODE = 'production'
                    │                           │
                    ▼                           ▼
    ┌───────────────────────────┐   ┌─────────────────────────┐
    │    mockApi.ts             │   │   Real Backend API      │
    │  • Mock Adapter           │   │  • Node.js/Express      │
    │  • Simulates 800ms delay  │   │  • DynamoDB/OpenSearch  │
    │  • Returns mock data      │   │  • JWT authentication   │
    │  • Test users database    │   │  • Real validation      │
    └───────────────────────────┘   └─────────────────────────┘
                    │                           │
                    └─────────────┬─────────────┘
                                  │
                                  │ Response
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                  Response Processing                                 │
│  SUCCESS:                          ERROR:                            │
│  • Returns user data              • Returns error message            │
│  • Returns JWT tokens             • Status code 401/400/500          │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     authThunks.ts                                    │
│  SUCCESS:                          ERROR:                            │
│  • Store tokens in AsyncStorage   • Catch error                     │
│  • Store user data                • Return rejectWithValue()         │
│  • Return response data           • Clean up                         │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                Redux Store Update (authSlice.ts)                     │
│  SUCCESS (fulfilled):              ERROR (rejected):                 │
│  • loading = false                • loading = false                  │
│  • user = payload.user            • error = error message            │
│  • accessToken = payload.token    • isAuthenticated = false          │
│  • refreshToken = payload.refresh • user = null                      │
│  • isAuthenticated = true                                            │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  │ State updated, UI re-renders
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      LoginScreen.tsx                                 │
│  SUCCESS:                          ERROR:                            │
│  • Hide loading spinner           • Hide loading spinner             │
│  • Show success alert             • Display error message            │
│  • Navigate to home (future)      • Highlight error fields           │
│  • User sees confirmation         • User can retry                   │
└─────────────────────────────────────────────────────────────────────┘
```

## 📦 Component Breakdown

### 1. UI Layer (LoginScreen.tsx)
```
┌─────────────────────────────┐
│     LoginScreen             │
│  ┌─────────────────────┐    │
│  │  Email Input        │    │
│  └─────────────────────┘    │
│  ┌─────────────────────┐    │
│  │  Password Input     │    │
│  └─────────────────────┘    │
│  ┌─────────────────────┐    │
│  │  Sign In Button     │    │
│  └─────────────────────┘    │
│  • Form validation          │
│  • Error display            │
│  • Loading state            │
└─────────────────────────────┘
```

### 2. State Management Layer (Redux)
```
┌─────────────────────────────────────┐
│          Redux Store                │
│  ┌─────────────────────────────┐    │
│  │     authSlice               │    │
│  │  • user                     │    │
│  │  • accessToken              │    │
│  │  • refreshToken             │    │
│  │  • loading                  │    │
│  │  • error                    │    │
│  │  • isAuthenticated          │    │
│  └─────────────────────────────┘    │
│  ┌─────────────────────────────┐    │
│  │     authThunks              │    │
│  │  • loginUser()              │    │
│  │  • registerUser()           │    │
│  │  • logoutUser()             │    │
│  │  • checkAuthStatus()        │    │
│  └─────────────────────────────┘    │
└─────────────────────────────────────┘
```

### 3. API Layer
```
┌─────────────────────────────────────┐
│         API Layer                   │
│  ┌─────────────────────────────┐    │
│  │   httpClient.ts             │    │
│  │  • Axios instance           │    │
│  │  • Request interceptor      │    │
│  │  • Response interceptor     │    │
│  │  • Token refresh logic      │    │
│  └─────────────────────────────┘    │
│  ┌─────────────────────────────┐    │
│  │   auth.api.ts               │    │
│  │  • loginApi()               │    │
│  │  • registerApi()            │    │
│  │  • logoutApi()              │    │
│  │  • forgotPasswordApi()      │    │
│  └─────────────────────────────┘    │
│  ┌─────────────────────────────┐    │
│  │   mockApi.ts                │    │
│  │  • Mock adapter             │    │
│  │  • Test data                │    │
│  │  • Endpoint simulation      │    │
│  └─────────────────────────────┘    │
└─────────────────────────────────────┘
```

### 4. Configuration Layer
```
┌─────────────────────────────────────┐
│      Configuration                  │
│  ┌─────────────────────────────┐    │
│  │   config.ts                 │    │
│  │  • API_MODE toggle          │    │
│  │  • API URLs                 │    │
│  │  • Feature flags            │    │
│  └─────────────────────────────┘    │
│  ┌─────────────────────────────┐    │
│  │   apiEndpoints.ts           │    │
│  │  • Centralized endpoints    │    │
│  │  • Route definitions        │    │
│  └─────────────────────────────┘    │
└─────────────────────────────────────┘
```

### 5. Utilities Layer
```
┌─────────────────────────────────────┐
│         Utilities                   │
│  ┌─────────────────────────────┐    │
│  │   validation.ts             │    │
│  │  • Email validation         │    │
│  │  • Password validation      │    │
│  │  • Form validation          │    │
│  └─────────────────────────────┘    │
└─────────────────────────────────────┘
```

## 🔐 Token Management Flow

```
┌──────────────┐     Login Success     ┌──────────────────┐
│   Backend    │ ──────────────────▶  │  AsyncStorage    │
│              │  accessToken          │                  │
│              │  refreshToken         │  • accessToken   │
│              │  user data            │  • refreshToken  │
└──────────────┘                       │  • user          │
                                       └──────────────────┘
                                              │
                                              │ Retrieved on
                                              │ subsequent requests
                                              ▼
                                       ┌──────────────────┐
                                       │  httpClient      │
                                       │  Interceptor     │
                                       │                  │
                                       │  Adds to header: │
                                       │  Authorization:  │
                                       │  Bearer {token}  │
                                       └──────────────────┘
                                              │
                                              │ If 401 response
                                              ▼
                                       ┌──────────────────┐
                                       │  Token Refresh   │
                                       │                  │
                                       │  1. Get refresh  │
                                       │  2. Call refresh │
                                       │  3. Get new token│
                                       │  4. Retry request│
                                       └──────────────────┘
```

## 🎯 Data Flow Summary

1. **User Action** → Component dispatches Redux action
2. **Redux Thunk** → Executes async logic
3. **API Call** → Through httpClient with interceptors
4. **Mock/Real API** → Based on configuration
5. **Response** → Processed by thunk
6. **AsyncStorage** → Tokens and user data saved
7. **Redux State** → Updated with response
8. **UI Update** → Component re-renders with new state

## 🔄 Error Flow

```
API Error
   │
   ▼
httpClient catches error
   │
   ▼
authThunks rejectWithValue()
   │
   ▼
Redux state.error updated
   │
   ▼
LoginScreen displays error
   │
   ▼
User sees error message
```

## 🚀 Success Flow

```
API Success
   │
   ▼
Tokens stored in AsyncStorage
   │
   ▼
authThunks returns data
   │
   ▼
Redux state updated
   │
   ▼
isAuthenticated = true
   │
   ▼
UI shows success
   │
   ▼
Navigate to home (future)
```

---

This architecture ensures:
- ✅ Clean separation of concerns
- ✅ Easy testing with mock API
- ✅ Seamless production transition
- ✅ Type safety with TypeScript
- ✅ Proper error handling
- ✅ Token management
- ✅ State persistence
