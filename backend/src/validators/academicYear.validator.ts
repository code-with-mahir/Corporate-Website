import { z } from 'zod';

export const createAcademicYearSchema = z.object({
  school_id: z
    .number({ required_error: 'School ID is required' })
    .int('School ID must be an integer')
    .positive('School ID must be positive'),
  name: z
    .string({ required_error: 'Academic year name is required' })
    .min(1, 'Academic year name cannot be empty')
    .max(100, 'Academic year name must be less than 100 characters')
    .trim(),
  start_date: z
    .string({ required_error: 'Start date is required' })
    .refine((val) => !isNaN(Date.parse(val)), 'Invalid start date format'),
  end_date: z
    .string({ required_error: 'End date is required' })
    .refine((val) => !isNaN(Date.parse(val)), 'Invalid end date format'),
  is_current: z
    .boolean()
    .optional()
    .default(false),
  is_closed: z
    .boolean()
    .optional()
    .default(false),
}).refine((data) => {
  const startDate = new Date(data.start_date);
  const endDate = new Date(data.end_date);
  return startDate < endDate;
}, {
  message: 'End date must be after start date',
  path: ['end_date'],
});

export const updateAcademicYearSchema = z.object({
  name: z
    .string()
    .min(1, 'Academic year name cannot be empty')
    .max(100, 'Academic year name must be less than 100 characters')
    .trim()
    .optional(),
  start_date: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), 'Invalid start date format')
    .optional(),
  end_date: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), 'Invalid end date format')
    .optional(),
  is_current: z
    .boolean()
    .optional(),
  is_closed: z
    .boolean()
    .optional(),
}).refine((data) => {
  if (data.start_date && data.end_date) {
    const startDate = new Date(data.start_date);
    const endDate = new Date(data.end_date);
    return startDate < endDate;
  }
  return true;
}, {
  message: 'End date must be after start date',
  path: ['end_date'],
});

export type CreateAcademicYearInput = z.infer<typeof createAcademicYearSchema>;
export type UpdateAcademicYearInput = z.infer<typeof updateAcademicYearSchema>;
