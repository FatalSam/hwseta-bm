# Authentication Flow Documentation

## Overview

This application implements a complete authentication flow using Zustand for state management, React Query for API calls, and localStorage for persistence.

## Components

### 1. Auth Store (`store/authStore.ts`)

The central state management for authentication using Zustand:

- **State**: `user`, `token`, `refreshToken`, `isAuthenticated`
- **Actions**: `login()`, `logout()`
- **Persistence**: Automatically saves/loads from localStorage

```typescript
const { user, token, isAuthenticated, login, logout } = useAuthStore();
```

### 2. Auth Hook (`hooks/useAuth.ts`)

Provides authentication-related functions and mutations:

- **Functions**: `login()`, `register()`, `logout()`, `refreshToken()`
- **Loading States**: `isLoggingIn`, `isRegistering`, etc.
- **Error Handling**: Built-in error handling for API calls

```typescript
const { login, logout, isLoggingIn } = useAuth();
```

### 3. Login Component (`components/login.tsx`)

Handles user login with:

- Form validation
- Error display
- Loading states
- Automatic redirect after successful login
- Redirect if already authenticated

### 4. Auth Guard (`components/auth-guard.tsx`)

Protects routes requiring authentication:

- Checks authentication status
- Redirects to login if not authenticated
- Shows loading state during check

### 5. Redirect Hook (`hooks/useRedirectIfAuthenticated.ts`)

Redirects authenticated users away from login/signup pages:

```typescript
const { isAuthenticated } = useRedirectIfAuthenticated();
```

## Usage Examples

### Login Flow

```typescript
import { useAuth } from '@/hooks/useAuth';

const { login, isLoggingIn } = useAuth();

const handleLogin = async (credentials) => {
  try {
    await login(credentials);
    // User is automatically redirected to dashboard
  } catch (error) {
    // Handle error
  }
};
```

### Accessing User Data

```typescript
import { useAuthStore } from '@/store/authStore';

const { user, isAuthenticated } = useAuthStore();

if (isAuthenticated && user) {
  console.log(`Welcome ${user.firstName} ${user.lastName}!`);
}
```

### Protected Routes

```typescript
import AuthGuard from '@/components/auth-guard';

export default function ProtectedPage() {
  return (
    <AuthGuard>
      <div>This content is only visible to authenticated users</div>
    </AuthGuard>
  );
}
```

### Logout

```typescript
import { useAuth } from '@/hooks/useAuth';

const { logout } = useAuth();

const handleLogout = () => {
  logout();
  // User is automatically redirected to login page
};
```

## API Integration

The authentication system integrates with the following API endpoints:

- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `POST /api/auth/refresh-token` - Token refresh
- `POST /api/auth/forget-password` - Password reset request
- `POST /api/auth/reset-password` - Password reset
- `POST /api/auth/verify-email` - Email verification

## Data Flow

1. **Login**: User submits credentials → API call → Store updated → localStorage saved → Redirect to dashboard
2. **Page Load**: Check localStorage → Restore state → Show appropriate content
3. **Logout**: Clear store → Clear localStorage → Redirect to login
4. **Route Protection**: Check authentication → Redirect if needed → Show loading state

## Security Features

- Token-based authentication
- Automatic token refresh
- Secure localStorage usage
- Route protection
- Automatic redirects
- Error handling

## File Structure

```
├── store/
│   └── authStore.ts          # Zustand store
├── hooks/
│   ├── useAuth.ts            # Authentication hook
│   └── useRedirectIfAuthenticated.ts  # Redirect hook
├── components/
│   ├── login.tsx             # Login form
│   ├── auth-guard.tsx        # Route protection
│   ├── user-info.tsx         # User info display
│   └── dashboard-header.tsx  # Header with user info
├── api/
│   └── auth.ts               # API functions
└── types/
    └── auth.ts               # TypeScript interfaces
``` 