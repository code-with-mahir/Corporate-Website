# Backend Services

This directory contains all business logic services that interact with the PostgreSQL database using raw SQL queries with parameterized values for security.

## Overview

All services follow these patterns:
- ✅ Use parameterized queries for SQL injection prevention
- ✅ Return standardized responses with TypeScript typing
- ✅ Handle errors gracefully with transaction rollback
- ✅ Use the pool from `config/database.ts`
- ✅ Match database schema exactly (field names, types, constraints)
- ✅ Include proper transaction management (BEGIN/COMMIT/ROLLBACK)

## Services

### 1. auth.service.ts (255 lines)
Authentication and token management service.

**Functions:**
- `login(email, password, schoolSlug?)` - Authenticates users (school users or super admins)
  - School users require schoolSlug parameter
  - Super admins login without schoolSlug
  - Returns user object, access token, and refresh token
  
- `refreshToken(refreshToken)` - Generates new access token from refresh token
  - Validates refresh token in database
  - Checks if user is still active
  - Returns new access token
  
- `logout(userId)` - Invalidates all refresh tokens for a user
  - Marks all user's refresh tokens as revoked
  
- `hashPassword(password)` - Utility to hash passwords with bcrypt
  
- `verifyPassword(password, hashedPassword)` - Utility to verify passwords

**Database Tables Used:**
- `users` (password_hash, is_active)
- `schools` (is_active)
- `refresh_tokens`

**Token Configuration:**
- Access token expiry: 15 minutes
- Refresh token expiry: 7 days

---

### 2. school.service.ts (394 lines)
School management and CRUD operations.

**Functions:**
- `createSchool(data)` - Creates a new school with initial admin user
  - Creates school record
  - Creates admin user with hashed password
  - Uses transaction to ensure atomicity
  - Returns both school and admin user data
  
- `getSchools(page, limit)` - Paginated list of all schools
  - Includes user count and active subscription count
  - Default pagination: page 1, limit 10
  
- `getSchoolById(id)` - Get single school with detailed information
  - Includes user count and subscription history
  
- `updateSchool(id, data)` - Update school information
  - Dynamic query building based on provided fields
  - Only updates fields that are provided
  
- `activateSchool(id)` - Activate a school (sets is_active = true)
  
- `deactivateSchool(id)` - Deactivate a school and all its users
  - Sets school is_active = false
  - Deactivates all users in the school
  - Uses transaction

**Database Tables Used:**
- `schools` (is_active)
- `users` (password_hash, is_active)

---

### 3. subscription.service.ts (350 lines)
Subscription and payment plan management.

**Functions:**
- `createSubscription(schoolId, planData)` - Create new subscription for a school
  - Deactivates existing active subscriptions
  - Calculates end_date based on plan_name (monthly/quarterly/yearly)
  - Creates new active subscription
  - Uses transaction
  
- `getSubscriptionBySchool(schoolId)` - Get current subscription for a school
  - Returns most recent subscription
  
- `updateSubscriptionStatus(id, status)` - Update subscription status
  - Statuses: active, expired, cancelled, suspended
  - Deactivates school if subscription is cancelled/suspended
  
- `checkSubscriptionActive(schoolId)` - Boolean check if school has active subscription
  - Returns true if active subscription exists and not expired
  
- `handleSubscriptionExpiry()` - Cron job function to handle expired subscriptions
  - Finds all subscriptions where end_date <= NOW()
  - Updates status to 'expired'
  - Deactivates schools and their users
  - Returns count of processed subscriptions
  
- `getAllActiveSubscriptions()` - Get all active subscriptions
  
- `getExpiringSubscriptions(daysBeforeExpiry)` - Get subscriptions expiring soon
  - Useful for sending reminder emails

**Database Tables Used:**
- `subscriptions` (plan_name, amount, currency, status)
- `schools` (is_active)
- `users` (is_active)

**Plan Duration Logic:**
- Plan names containing "yearly" → 1 year
- Plan names containing "quarterly" → 3 months
- Default → 1 month

---

### 4. razorpay.service.ts (434 lines)
Razorpay payment gateway integration.

**Functions:**
- `createOrder(orderData)` - Create Razorpay order
  - Creates order in Razorpay
  - Stores payment record in database with status 'created'
  - Returns Razorpay order and database payment record
  
- `verifyPayment(razorpayOrderId, razorpayPaymentId, razorpaySignature)` - Verify payment signature
  - Verifies HMAC SHA256 signature
  - Updates payment status to 'completed'
  - Fetches and stores payment details from Razorpay
  - Uses transaction
  
- `createSubscription(planId, schoolId)` - Create Razorpay subscription
  - Creates subscription in Razorpay
  - Stores in razorpay_subscriptions table
  
- `cancelSubscription(subscriptionId)` - Cancel Razorpay subscription
  - Cancels in Razorpay (at cycle end)
  - Updates database status
  
- `getPaymentById(paymentId)` - Get payment details by ID
  
- `getPaymentsBySchool(schoolId)` - Get all payments for a school
  
- `refundPayment(paymentId, amount?)` - Process payment refund
  - Creates refund in Razorpay
  - Updates payment status to 'refunded'

**Database Tables Used:**
- `payments` (razorpay_order_id, razorpay_payment_id, razorpay_signature, status)
- `razorpay_subscriptions`
- `schools`

**Environment Variables Required:**
- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`

**Payment Verification:**
Uses HMAC SHA256 to verify: `razorpay_order_id|razorpay_payment_id`

---

### 5. academicYear.service.ts (503 lines)
Academic year management with validation.

**Functions:**
- `createAcademicYear(schoolId, data)` - Create new academic year
  - Validates dates (end_date > start_date)
  - Prevents overlapping years
  - First year is automatically set as current
  - Uses transaction
  
- `getAcademicYears(schoolId, page, limit)` - Paginated list of academic years
  - Ordered by start_date descending
  
- `getCurrentAcademicYear(schoolId)` - Get the current academic year
  - Returns year where is_current = true
  
- `setCurrentAcademicYear(schoolId, yearId)` - Set a year as current
  - Only one year can be current at a time
  - Cannot set closed years as current
  - Uses transaction
  
- `closeAcademicYear(schoolId, yearId)` - Close an academic year
  - Sets is_closed = true, is_current = false
  - Prevents future edits
  - Automatically sets next available year as current
  - Uses transaction
  
- `getAcademicYearById(schoolId, yearId)` - Get single academic year
  
- `updateAcademicYear(schoolId, yearId, data)` - Update academic year
  - Cannot update closed years
  - Dynamic query building

**Database Tables Used:**
- `academic_years` (is_current, is_closed)
- `schools` (is_active)

**Validation Rules:**
- ✅ Only one current year per school
- ✅ No overlapping date ranges (for non-closed years)
- ✅ End date must be after start date
- ✅ Closed years cannot be edited
- ✅ Closed years cannot be set as current

---

## Database Schema Alignment

All services are aligned with the actual database schema:

### Users Table
- `password_hash` (not `password`)
- `is_active` (not `status`)

### Schools Table
- `is_active` (not `status`)
- Fields: id, name, slug, email, phone, address, logo_url, is_active

### Academic Years Table
- `is_closed` (not `status`)
- `is_current` (boolean)

### Subscriptions Table
- `plan_name` (not `plan_type`)
- Fields: id, school_id, plan_name, amount, currency, status, start_date, end_date, razorpay_subscription_id

---

## Usage Examples

### Authentication
```typescript
import { login, refreshToken, logout } from './services/auth.service';

// School user login
const result = await login('user@school.com', 'password', 'school-slug');

// Super admin login
const adminResult = await login('admin@system.com', 'password');

// Refresh access token
const newToken = await refreshToken('refresh_token_here');

// Logout
await logout(userId);
```

### School Management
```typescript
import { createSchool, getSchools, activateSchool } from './services/school.service';

// Create school with admin
const school = await createSchool({
  name: 'ABC School',
  slug: 'abc-school',
  email: 'contact@abcschool.com',
  phone: '1234567890',
  address: '123 Main St',
  admin_email: 'admin@abcschool.com',
  admin_password: 'securePassword123',
  admin_name: 'John Admin'
});

// Get all schools
const schools = await getSchools(1, 20);

// Activate school
await activateSchool(schoolId);
```

### Subscription Management
```typescript
import { createSubscription, handleSubscriptionExpiry } from './services/subscription.service';

// Create subscription
const subscription = await createSubscription(schoolId, {
  plan_name: 'Yearly Premium',
  amount: 10000,
  currency: 'INR',
  razorpay_subscription_id: 'sub_123'
});

// Cron job: Handle expiry (run daily)
await handleSubscriptionExpiry();
```

### Payment Processing
```typescript
import { createOrder, verifyPayment } from './services/razorpay.service';

// Create order
const order = await createOrder({
  amount: 10000,
  currency: 'INR',
  schoolId: 1
});

// Verify payment after Razorpay callback
const verified = await verifyPayment({
  razorpay_order_id: 'order_123',
  razorpay_payment_id: 'pay_123',
  razorpay_signature: 'signature_here'
});
```

### Academic Year Management
```typescript
import { createAcademicYear, setCurrentAcademicYear, closeAcademicYear } from './services/academicYear.service';

// Create academic year
const year = await createAcademicYear(schoolId, {
  name: '2024-2025',
  start_date: new Date('2024-04-01'),
  end_date: new Date('2025-03-31')
});

// Set as current
await setCurrentAcademicYear(schoolId, yearId);

// Close year (end of academic session)
await closeAcademicYear(schoolId, yearId);
```

---

## Error Handling

All services return standardized response objects:

### Success Response
```typescript
{
  success: true,
  data: { /* result data */ },
  message?: 'Optional success message'
}
```

### Error Response
```typescript
{
  success: false,
  error: 'Error message describing what went wrong'
}
```

### Pagination Response
```typescript
{
  success: true,
  data: {
    items: [ /* array of items */ ],
    pagination: {
      page: 1,
      limit: 10,
      total: 100,
      totalPages: 10
    }
  }
}
```

---

## Security Features

1. **SQL Injection Prevention**: All queries use parameterized values
2. **Password Hashing**: bcrypt with 10 salt rounds
3. **Token Security**: JWT with configurable expiry
4. **Payment Verification**: HMAC SHA256 signature verification
5. **Transaction Safety**: All multi-step operations use transactions
6. **Input Validation**: Type checking with TypeScript interfaces

---

## Cron Jobs

### Subscription Expiry Handler
Run daily to handle expired subscriptions:

```typescript
import { handleSubscriptionExpiry } from './services/subscription.service';

// In your cron job scheduler
cron.schedule('0 0 * * *', async () => {
  const result = await handleSubscriptionExpiry();
  console.log(`Processed ${result.data.expiredCount} expired subscriptions`);
});
```

---

## Dependencies

- `pg` - PostgreSQL client
- `bcrypt` - Password hashing
- `jsonwebtoken` - JWT token generation/verification
- `razorpay` - Razorpay SDK
- `crypto` - For HMAC signature verification

---

## Notes

- All services use the connection pool from `config/database.ts`
- Transactions are properly handled with BEGIN/COMMIT/ROLLBACK
- All date/time operations use PostgreSQL's NOW() function
- Soft deletes are not implemented (use is_active flags instead)
- All monetary amounts should be in smallest currency unit (paise for INR)
