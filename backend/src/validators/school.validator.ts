import { z } from 'zod';

export const createSchoolSchema = z.object({
  name: z
    .string({ required_error: 'School name is required' })
    .min(1, 'School name cannot be empty')
    .max(255, 'School name must be less than 255 characters')
    .trim(),
  slug: z
    .string({ required_error: 'School slug is required' })
    .min(1, 'School slug cannot be empty')
    .max(100, 'School slug must be less than 100 characters')
    .regex(/^[a-z0-9-]+$/, 'School slug must contain only lowercase letters, numbers, and hyphens')
    .trim(),
  email: z
    .string()
    .email('Invalid email format')
    .max(255, 'Email must be less than 255 characters')
    .optional(),
  phone: z
    .string()
    .max(50, 'Phone must be less than 50 characters')
    .regex(/^[0-9+\-() ]*$/, 'Phone must contain only numbers and valid phone characters')
    .optional(),
  address: z
    .string()
    .max(1000, 'Address must be less than 1000 characters')
    .optional(),
  logo_url: z
    .string()
    .url('Invalid URL format')
    .max(500, 'Logo URL must be less than 500 characters')
    .optional(),
  is_active: z
    .boolean()
    .optional()
    .default(true),
});

export const updateSchoolSchema = z.object({
  name: z
    .string()
    .min(1, 'School name cannot be empty')
    .max(255, 'School name must be less than 255 characters')
    .trim()
    .optional(),
  email: z
    .string()
    .email('Invalid email format')
    .max(255, 'Email must be less than 255 characters')
    .optional(),
  phone: z
    .string()
    .max(50, 'Phone must be less than 50 characters')
    .regex(/^[0-9+\-() ]*$/, 'Phone must contain only numbers and valid phone characters')
    .optional(),
  address: z
    .string()
    .max(1000, 'Address must be less than 1000 characters')
    .optional(),
  logo_url: z
    .string()
    .url('Invalid URL format')
    .max(500, 'Logo URL must be less than 500 characters')
    .optional(),
  is_active: z
    .boolean()
    .optional(),
});

export type CreateSchoolInput = z.infer<typeof createSchoolSchema>;
export type UpdateSchoolInput = z.infer<typeof updateSchoolSchema>;
