import { z } from 'zod';

export const createClassSchema = z.object({
  school_id: z
    .number({ required_error: 'School ID is required' })
    .int('School ID must be an integer')
    .positive('School ID must be positive'),
  academic_year_id: z
    .number({ required_error: 'Academic year ID is required' })
    .int('Academic year ID must be an integer')
    .positive('Academic year ID must be positive'),
  name: z
    .string({ required_error: 'Class name is required' })
    .min(1, 'Class name cannot be empty')
    .max(100, 'Class name must be less than 100 characters')
    .trim(),
  sort_order: z
    .number()
    .int('Sort order must be an integer')
    .nonnegative('Sort order must be non-negative')
    .optional(),
});

export const updateClassSchema = z.object({
  name: z
    .string()
    .min(1, 'Class name cannot be empty')
    .max(100, 'Class name must be less than 100 characters')
    .trim()
    .optional(),
  academic_year_id: z
    .number()
    .int('Academic year ID must be an integer')
    .positive('Academic year ID must be positive')
    .optional(),
  sort_order: z
    .number()
    .int('Sort order must be an integer')
    .nonnegative('Sort order must be non-negative')
    .optional(),
});

export type CreateClassInput = z.infer<typeof createClassSchema>;
export type UpdateClassInput = z.infer<typeof updateClassSchema>;
