import { z } from 'zod';

export const createStudentSchema = z.object({
  school_id: z
    .number({ required_error: 'School ID is required' })
    .int('School ID must be an integer')
    .positive('School ID must be positive'),
  user_id: z
    .number({ required_error: 'User ID is required' })
    .int('User ID must be an integer')
    .positive('User ID must be positive'),
  admission_number: z
    .string()
    .max(100, 'Admission number must be less than 100 characters')
    .trim()
    .optional(),
  class_id: z
    .number()
    .int('Class ID must be an integer')
    .positive('Class ID must be positive')
    .optional(),
  section_id: z
    .number()
    .int('Section ID must be an integer')
    .positive('Section ID must be positive')
    .optional(),
  academic_year_id: z
    .number()
    .int('Academic year ID must be an integer')
    .positive('Academic year ID must be positive')
    .optional(),
  roll_number: z
    .string()
    .max(50, 'Roll number must be less than 50 characters')
    .trim()
    .optional(),
  date_of_birth: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), 'Invalid date of birth format')
    .optional(),
  gender: z
    .enum(['male', 'female', 'other'], {
      errorMap: () => ({ message: 'Gender must be male, female, or other' }),
    })
    .optional(),
  address: z
    .string()
    .max(1000, 'Address must be less than 1000 characters')
    .optional(),
  guardian_name: z
    .string()
    .max(255, 'Guardian name must be less than 255 characters')
    .trim()
    .optional(),
  guardian_phone: z
    .string()
    .max(50, 'Guardian phone must be less than 50 characters')
    .regex(/^[0-9+\-() ]*$/, 'Guardian phone must contain only numbers and valid phone characters')
    .optional(),
});

export const updateStudentSchema = z.object({
  admission_number: z
    .string()
    .max(100, 'Admission number must be less than 100 characters')
    .trim()
    .optional(),
  class_id: z
    .number()
    .int('Class ID must be an integer')
    .positive('Class ID must be positive')
    .nullable()
    .optional(),
  section_id: z
    .number()
    .int('Section ID must be an integer')
    .positive('Section ID must be positive')
    .nullable()
    .optional(),
  academic_year_id: z
    .number()
    .int('Academic year ID must be an integer')
    .positive('Academic year ID must be positive')
    .nullable()
    .optional(),
  roll_number: z
    .string()
    .max(50, 'Roll number must be less than 50 characters')
    .trim()
    .optional(),
  date_of_birth: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), 'Invalid date of birth format')
    .optional(),
  gender: z
    .enum(['male', 'female', 'other'], {
      errorMap: () => ({ message: 'Gender must be male, female, or other' }),
    })
    .optional(),
  address: z
    .string()
    .max(1000, 'Address must be less than 1000 characters')
    .optional(),
  guardian_name: z
    .string()
    .max(255, 'Guardian name must be less than 255 characters')
    .trim()
    .optional(),
  guardian_phone: z
    .string()
    .max(50, 'Guardian phone must be less than 50 characters')
    .regex(/^[0-9+\-() ]*$/, 'Guardian phone must contain only numbers and valid phone characters')
    .optional(),
});

export type CreateStudentInput = z.infer<typeof createStudentSchema>;
export type UpdateStudentInput = z.infer<typeof updateStudentSchema>;
