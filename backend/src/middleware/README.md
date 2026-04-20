# Middleware Documentation

Production-ready middleware for the School Management SaaS platform.

## Table of Contents

1. [Authentication Middleware](#authentication-middleware)
2. [School Context Middleware](#school-context-middleware)
3. [Subscription Check Middleware](#subscription-check-middleware)
4. [Role Guard Middleware](#role-guard-middleware)
5. [Rate Limiter Middleware](#rate-limiter-middleware)
6. [Validation Middleware](#validation-middleware)
7. [Error Handler Middleware](#error-handler-middleware)

---

## Authentication Middleware

**File:** `auth.ts`

### `authenticate`

Verifies JWT tokens and attaches user data to the request object.

**Features:**
- Extracts Bearer token from Authorization header
- Verifies token using `verifyToken` utility
- Queries user from database (supports both regular users and super admins)
- Checks if user account is active
- Attaches user data to `req.user`

**Response Codes:**
- `401` - Missing, invalid, or expired token
- `401` - User not found or account inactive

**Usage:**
```typescript
import { authenticate } from './middleware';

app.get('/api/profile', authenticate, (req, res) => {
  res.json({ user: req.user });
});
```

**Request Object Extensions:**
```typescript
req.user = {
  id: string;
  email: string;
  role: string;
  school_id?: string;
}
```

---

## School Context Middleware

**File:** `schoolContext.ts`

### `extractSchool`

Extracts school information from subdomain or custom header.

**Features:**
- Extracts subdomain from `req.headers.host` OR `req.headers['x-school-slug']`
- Queries school from database by code/slug
- Validates school exists and is active
- Attaches school data to `req.school` and `req.schoolId`

**Response Codes:**
- `400` - School identifier not provided
- `404` - School not found
- `403` - School is inactive

**Usage:**
```typescript
import { extractSchool } from './middleware';

app.get('/api/students', extractSchool, (req, res) => {
  const schoolId = req.schoolId;
  // Query students for this school
});
```

**Request Object Extensions:**
```typescript
req.school = {
  id: string;
  name: string;
  code: string;
}
req.schoolId = string;
```

---

## Subscription Check Middleware

**File:** `subscriptionCheck.ts`

### `checkSubscription`

Validates that the school has an active subscription.

**Features:**
- Checks for active subscription in payments/subscriptions table
- Validates subscription end date is in the future
- Returns 402 Payment Required if no active subscription

**Response Codes:**
- `400` - School context not found (requires `extractSchool` middleware first)
- `402` - No active subscription found

**Usage:**
```typescript
import { authenticate, extractSchool, checkSubscription } from './middleware';

app.post('/api/students', 
  authenticate, 
  extractSchool, 
  checkSubscription, 
  (req, res) => {
    // Only executes if school has active subscription
  }
);
```

**Dependencies:**
- Requires `req.schoolId` to be set (use `extractSchool` middleware first)

---

## Role Guard Middleware

**File:** `roleGuard.ts`

### `requireRole(...allowedRoles)`

Restricts access based on user roles.

**Features:**
- Checks if `req.user.role` is in the allowed roles list
- Case-insensitive role comparison
- Returns 403 if user doesn't have required role

**Response Codes:**
- `401` - User not authenticated (requires `authenticate` middleware first)
- `403` - Insufficient permissions

**Usage:**
```typescript
import { authenticate, requireRole } from './middleware';

// Single role
app.delete('/api/students/:id', 
  authenticate, 
  requireRole('admin'),
  (req, res) => {
    // Only admins can access
  }
);

// Multiple roles
app.get('/api/reports', 
  authenticate, 
  requireRole('admin', 'teacher', 'principal'),
  (req, res) => {
    // Admins, teachers, or principals can access
  }
);
```

**Dependencies:**
- Requires `req.user` to be set (use `authenticate` middleware first)

---

## Rate Limiter Middleware

**File:** `rateLimiter.ts`

Uses `express-rate-limit` to prevent abuse.

### `authLimiter`

Strict rate limiting for authentication endpoints.

**Configuration:**
- Window: 15 minutes
- Max requests: 10 per window
- Use on: Login, register, password reset endpoints

### `apiLimiter`

Standard rate limiting for general API endpoints.

**Configuration:**
- Window: 15 minutes
- Max requests: 100 per window
- Skips successful requests (only counts on errors)

**Usage:**
```typescript
import { authLimiter, apiLimiter } from './middleware';

// Apply to auth routes
app.post('/auth/login', authLimiter, loginController);
app.post('/auth/register', authLimiter, registerController);

// Apply to all API routes
app.use('/api', apiLimiter);
```

---

## Validation Middleware

**File:** `validate.ts`

### `validate(schema)`

Validates request body against Zod schema.

**Features:**
- Validates `req.body` using provided Zod schema
- Returns formatted validation errors
- Returns 400 on validation failure

**Response Codes:**
- `400` - Validation failed with error details

**Usage:**
```typescript
import { validate } from './middleware';
import { z } from 'zod';

const createStudentSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email().optional(),
  dateOfBirth: z.string().datetime(),
});

app.post('/api/students', 
  validate(createStudentSchema),
  (req, res) => {
    // req.body is validated
  }
);
```

**Error Response Format:**
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "email",
      "message": "Invalid email"
    }
  ]
}
```

---

## Error Handler Middleware

**File:** `errorHandler.ts`

Global error handling middleware - must be registered last.

**Features:**
- Catches all errors from routes and middleware
- Logs error details to console
- Returns standardized error responses
- Handles specific error types:
  - Zod validation errors
  - JWT errors (invalid/expired tokens)
  - Database constraint violations
  - Custom application errors
- Prevents sensitive information leaks in production

**Response Codes:**
- `400` - Validation or constraint errors
- `401` - Authentication errors
- `409` - Duplicate entry errors
- `500` - Internal server errors

**Usage:**
```typescript
import express from 'express';
import { errorHandler } from './middleware';

const app = express();

// Define all routes first
app.get('/api/users', getUsersController);
app.post('/api/users', createUserController);

// Error handler must be last
app.use(errorHandler);
```

**Error Response Format:**
```json
{
  "success": false,
  "message": "Error description",
  "errors": [],
  "stack": "..." // Only in development mode
}
```

**Handled Database Errors:**
- `23505` - Duplicate entry
- `23503` - Foreign key violation
- `23502` - Not null violation
- Other `23xxx` - General constraint violations

---

## Complete Example

```typescript
import express from 'express';
import {
  authenticate,
  extractSchool,
  checkSubscription,
  requireRole,
  authLimiter,
  apiLimiter,
  validate,
  errorHandler
} from './middleware';
import { z } from 'zod';

const app = express();
app.use(express.json());

// Auth routes with strict rate limiting
app.post('/auth/login', authLimiter, validate(loginSchema), loginController);
app.post('/auth/register', authLimiter, validate(registerSchema), registerController);

// Public API with general rate limiting
app.use('/api', apiLimiter);

// Protected routes requiring authentication only
app.get('/api/profile', authenticate, getProfileController);

// School-scoped routes requiring active subscription
app.get('/api/students', 
  authenticate,
  extractSchool,
  checkSubscription,
  requireRole('admin', 'teacher'),
  getStudentsController
);

// Super admin routes
app.get('/api/super/schools',
  authenticate,
  requireRole('super_admin'),
  getAllSchoolsController
);

// Global error handler (must be last)
app.use(errorHandler);

app.listen(3000);
```

---

## Middleware Chain Order

For proper functionality, use middleware in this order:

1. **Rate Limiting** (`authLimiter` or `apiLimiter`) - First line of defense
2. **Validation** (`validate`) - Validate input before processing
3. **Authentication** (`authenticate`) - Verify user identity
4. **School Context** (`extractSchool`) - Extract school information
5. **Subscription Check** (`checkSubscription`) - Verify active subscription
6. **Role Guard** (`requireRole`) - Check permissions
7. **Error Handler** (`errorHandler`) - Must be registered last

---

## Type Safety

All middleware is fully typed with TypeScript. Custom properties added to the Express Request object are defined in `src/types/express.d.ts`:

```typescript
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: string;
        school_id?: string;
      };
      school?: {
        id: string;
        name: string;
        code: string;
      };
      schoolId?: string;
    }
  }
}
```
