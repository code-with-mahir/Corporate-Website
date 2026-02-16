import { z } from 'zod';

export const createTeacherSchema = z.object({
  school_id: z
    .number({ required_error: 'School ID is required' })
    .int('School ID must be an integer')
    .positive('School ID must be positive'),
  user_id: z
    .number({ required_error: 'User ID is required' })
    .int('User ID must be an integer')
    .positive('User ID must be positive'),
  employee_id: z
    .string()
    .max(100, 'Employee ID must be less than 100 characters')
    .trim()
    .optional(),
  qualification: z
    .string()
    .max(255, 'Qualification must be less than 255 characters')
    .trim()
    .optional(),
  joining_date: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), 'Invalid joining date format')
    .optional(),
});

export const updateTeacherSchema = z.object({
  employee_id: z
    .string()
    .max(100, 'Employee ID must be less than 100 characters')
    .trim()
    .optional(),
  qualification: z
    .string()
    .max(255, 'Qualification must be less than 255 characters')
    .trim()
    .optional(),
  joining_date: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), 'Invalid joining date format')
    .optional(),
});

export type CreateTeacherInput = z.infer<typeof createTeacherSchema>;
export type UpdateTeacherInput = z.infer<typeof updateTeacherSchema>;
