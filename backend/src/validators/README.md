# Validators

This directory contains comprehensive Zod validation schemas for all entities in the school management system.

## Features

- **Type-safe validation** using Zod
- **Automatic TypeScript type inference** with `z.infer<>`
- **Comprehensive field validation** (min/max, patterns, custom rules)
- **Meaningful error messages** for better debugging
- **Cross-field validation** (e.g., date ranges, amount calculations)

## Available Validators

### 1. Authentication (`auth.validator.ts`)
- `loginSchema` - Email, password, and optional school slug
- `refreshTokenSchema` - Token refresh validation

### 2. School (`school.validator.ts`)
- `createSchoolSchema` - Create new school with name, slug, contact info
- `updateSchoolSchema` - Update school details

### 3. Academic Year (`academicYear.validator.ts`)
- `createAcademicYearSchema` - Create academic year with date validation
- `updateAcademicYearSchema` - Update academic year details
- Validates that end_date > start_date

### 4. Class (`class.validator.ts`)
- `createClassSchema` - Create class with sort order
- `updateClassSchema` - Update class details

### 5. Student (`student.validator.ts`)
- `createStudentSchema` - Create student with guardian info
- `updateStudentSchema` - Update student details
- Gender enum validation (male, female, other)

### 6. Teacher (`teacher.validator.ts`)
- `createTeacherSchema` - Create teacher profile
- `updateTeacherSchema` - Update teacher details

### 7. Fee (`fee.validator.ts`)
- `createFeeStructureSchema` - Define fee structure with late fees
- `createFeePaymentSchema` - Record fee payment with validation
- Validates total_amount = amount_paid + late_fee_paid
- Frequency enum: monthly, quarterly, half-yearly, yearly, one-time
- Payment method enum: cash, card, bank_transfer, upi, cheque, online

### 8. Attendance (`attendance.validator.ts`)
- `markAttendanceSchema` - Single student attendance
- `bulkMarkAttendanceSchema` - Multiple students at once
- Status enum: present, absent, late, half-day, excused

### 9. Marks (`marks.validator.ts`)
- `createMarkSchema` - Single mark entry
- `updateMarkSchema` - Update marks
- `bulkCreateMarkSchema` - Bulk mark entry
- Validates marks_obtained <= total_marks

### 10. Promotion (`promotion.validator.ts`)
- `runPromotionSchema` - Bulk student promotion
- `singlePromotionSchema` - Single student promotion
- Validates from and to academic years are different
- Status enum: promoted, detained, failed

### 11. Announcement (`announcement.validator.ts`)
- `createAnnouncementSchema` - Create announcement
- `updateAnnouncementSchema` - Update announcement
- Priority enum: low, normal, high, urgent
- Target audience: all, students, teachers, parents, staff
- Validates expiry_date > published_date

## Usage Example

```typescript
import { loginSchema, createStudentSchema } from './validators';

// Validate login data
try {
  const validData = loginSchema.parse({
    email: 'user@example.com',
    password: 'password123',
    schoolSlug: 'my-school'
  });
  // validData is now type-safe
} catch (error) {
  // Zod validation error with detailed messages
  console.error(error.errors);
}

// Use with Express middleware
import { Request, Response, NextFunction } from 'express';

const validateRequest = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          errors: error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message
          }))
        });
      }
      next(error);
    }
  };
};

// Apply to routes
app.post('/api/students', 
  validateRequest(createStudentSchema),
  studentController.create
);
```

## TypeScript Types

All validators export TypeScript types using `z.infer<>`:

```typescript
import { 
  LoginInput, 
  CreateStudentInput,
  UpdateStudentInput 
} from './validators';

function loginUser(data: LoginInput) {
  // data is fully typed
}
```

## Validation Rules

### Common Patterns

- **IDs**: Positive integers
- **Strings**: Min 1, max specified length, trimmed
- **Emails**: Valid email format, max 255 chars
- **Phone**: Numbers and valid phone characters, max 50 chars
- **Dates**: ISO 8601 string format
- **URLs**: Valid URL format
- **Enums**: Predefined set of values

### Custom Validations

- Date ranges (start < end)
- Amount calculations (total = parts)
- Cross-field dependencies
- Regex patterns for slugs, phones
- Array length constraints

## Error Messages

All validators provide meaningful error messages:

```javascript
{
  "errors": [
    {
      "field": "email",
      "message": "Invalid email format"
    },
    {
      "field": "end_date",
      "message": "End date must be after start date"
    }
  ]
}
```
