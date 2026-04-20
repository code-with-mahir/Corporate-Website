import { z } from 'zod';

export const createAnnouncementSchema = z.object({
  school_id: z
    .number({ required_error: 'School ID is required' })
    .int('School ID must be an integer')
    .positive('School ID must be positive'),
  title: z
    .string({ required_error: 'Title is required' })
    .min(1, 'Title cannot be empty')
    .max(255, 'Title must be less than 255 characters')
    .trim(),
  content: z
    .string({ required_error: 'Content is required' })
    .min(1, 'Content cannot be empty')
    .max(10000, 'Content must be less than 10000 characters'),
  priority: z
    .enum(['low', 'normal', 'high', 'urgent'], {
      errorMap: () => ({ message: 'Priority must be low, normal, high, or urgent' }),
    })
    .optional()
    .default('normal'),
  target_audience: z
    .array(
      z.enum(['all', 'students', 'teachers', 'parents', 'staff'], {
        errorMap: () => ({ message: 'Target audience must be all, students, teachers, parents, or staff' }),
      })
    )
    .optional(),
  class_ids: z
    .array(
      z.number()
        .int('Class ID must be an integer')
        .positive('Class ID must be positive')
    )
    .optional(),
  section_ids: z
    .array(
      z.number()
        .int('Section ID must be an integer')
        .positive('Section ID must be positive')
    )
    .optional(),
  published_date: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), 'Invalid published date format')
    .optional(),
  expiry_date: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), 'Invalid expiry date format')
    .optional(),
  is_active: z
    .boolean()
    .optional()
    .default(true),
  created_by: z
    .number()
    .int('Created by must be an integer')
    .positive('Created by must be positive')
    .optional(),
}).refine((data) => {
  if (data.published_date && data.expiry_date) {
    const publishedDate = new Date(data.published_date);
    const expiryDate = new Date(data.expiry_date);
    return publishedDate < expiryDate;
  }
  return true;
}, {
  message: 'Expiry date must be after published date',
  path: ['expiry_date'],
});

export const updateAnnouncementSchema = z.object({
  title: z
    .string()
    .min(1, 'Title cannot be empty')
    .max(255, 'Title must be less than 255 characters')
    .trim()
    .optional(),
  content: z
    .string()
    .min(1, 'Content cannot be empty')
    .max(10000, 'Content must be less than 10000 characters')
    .optional(),
  priority: z
    .enum(['low', 'normal', 'high', 'urgent'], {
      errorMap: () => ({ message: 'Priority must be low, normal, high, or urgent' }),
    })
    .optional(),
  target_audience: z
    .array(
      z.enum(['all', 'students', 'teachers', 'parents', 'staff'], {
        errorMap: () => ({ message: 'Target audience must be all, students, teachers, parents, or staff' }),
      })
    )
    .optional(),
  class_ids: z
    .array(
      z.number()
        .int('Class ID must be an integer')
        .positive('Class ID must be positive')
    )
    .optional(),
  section_ids: z
    .array(
      z.number()
        .int('Section ID must be an integer')
        .positive('Section ID must be positive')
    )
    .optional(),
  published_date: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), 'Invalid published date format')
    .optional(),
  expiry_date: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), 'Invalid expiry date format')
    .optional(),
  is_active: z
    .boolean()
    .optional(),
}).refine((data) => {
  if (data.published_date && data.expiry_date) {
    const publishedDate = new Date(data.published_date);
    const expiryDate = new Date(data.expiry_date);
    return publishedDate < expiryDate;
  }
  return true;
}, {
  message: 'Expiry date must be after published date',
  path: ['expiry_date'],
});

export type CreateAnnouncementInput = z.infer<typeof createAnnouncementSchema>;
export type UpdateAnnouncementInput = z.infer<typeof updateAnnouncementSchema>;
