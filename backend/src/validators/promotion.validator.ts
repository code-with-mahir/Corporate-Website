import { z } from 'zod';

export const runPromotionSchema = z.object({
  school_id: z
    .number({ required_error: 'School ID is required' })
    .int('School ID must be an integer')
    .positive('School ID must be positive'),
  from_academic_year_id: z
    .number({ required_error: 'From academic year ID is required' })
    .int('From academic year ID must be an integer')
    .positive('From academic year ID must be positive'),
  to_academic_year_id: z
    .number({ required_error: 'To academic year ID is required' })
    .int('To academic year ID must be an integer')
    .positive('To academic year ID must be positive'),
  from_class_id: z
    .number({ required_error: 'From class ID is required' })
    .int('From class ID must be an integer')
    .positive('From class ID must be positive'),
  to_class_id: z
    .number({ required_error: 'To class ID is required' })
    .int('To class ID must be an integer')
    .positive('To class ID must be positive'),
  from_section_id: z
    .number()
    .int('From section ID must be an integer')
    .positive('From section ID must be positive')
    .optional(),
  to_section_id: z
    .number()
    .int('To section ID must be an integer')
    .positive('To section ID must be positive')
    .optional(),
  student_ids: z
    .array(
      z.number()
        .int('Student ID must be an integer')
        .positive('Student ID must be positive')
    )
    .min(1, 'At least one student ID is required'),
  promotion_status: z
    .enum(['promoted', 'detained', 'failed'], {
      errorMap: () => ({ message: 'Promotion status must be promoted, detained, or failed' }),
    })
    .optional()
    .default('promoted'),
  remarks: z
    .string()
    .max(1000, 'Remarks must be less than 1000 characters')
    .optional(),
  promoted_by: z
    .number()
    .int('Promoted by must be an integer')
    .positive('Promoted by must be positive')
    .optional(),
}).refine((data) => {
  return data.from_academic_year_id !== data.to_academic_year_id;
}, {
  message: 'From and to academic year must be different',
  path: ['to_academic_year_id'],
});

export const singlePromotionSchema = z.object({
  school_id: z
    .number({ required_error: 'School ID is required' })
    .int('School ID must be an integer')
    .positive('School ID must be positive'),
  student_id: z
    .number({ required_error: 'Student ID is required' })
    .int('Student ID must be an integer')
    .positive('Student ID must be positive'),
  from_academic_year_id: z
    .number({ required_error: 'From academic year ID is required' })
    .int('From academic year ID must be an integer')
    .positive('From academic year ID must be positive'),
  to_academic_year_id: z
    .number({ required_error: 'To academic year ID is required' })
    .int('To academic year ID must be an integer')
    .positive('To academic year ID must be positive'),
  from_class_id: z
    .number()
    .int('From class ID must be an integer')
    .positive('From class ID must be positive')
    .optional(),
  to_class_id: z
    .number()
    .int('To class ID must be an integer')
    .positive('To class ID must be positive')
    .optional(),
  from_section_id: z
    .number()
    .int('From section ID must be an integer')
    .positive('From section ID must be positive')
    .optional(),
  to_section_id: z
    .number()
    .int('To section ID must be an integer')
    .positive('To section ID must be positive')
    .optional(),
  promotion_status: z
    .enum(['promoted', 'detained', 'failed'], {
      errorMap: () => ({ message: 'Promotion status must be promoted, detained, or failed' }),
    })
    .optional()
    .default('promoted'),
  remarks: z
    .string()
    .max(1000, 'Remarks must be less than 1000 characters')
    .optional(),
  promoted_by: z
    .number()
    .int('Promoted by must be an integer')
    .positive('Promoted by must be positive')
    .optional(),
}).refine((data) => {
  return data.from_academic_year_id !== data.to_academic_year_id;
}, {
  message: 'From and to academic year must be different',
  path: ['to_academic_year_id'],
});

export type RunPromotionInput = z.infer<typeof runPromotionSchema>;
export type SinglePromotionInput = z.infer<typeof singlePromotionSchema>;
