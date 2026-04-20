import { z } from 'zod';

export const createMarkSchema = z.object({
  school_id: z
    .number({ required_error: 'School ID is required' })
    .int('School ID must be an integer')
    .positive('School ID must be positive'),
  exam_id: z
    .number({ required_error: 'Exam ID is required' })
    .int('Exam ID must be an integer')
    .positive('Exam ID must be positive'),
  student_id: z
    .number({ required_error: 'Student ID is required' })
    .int('Student ID must be an integer')
    .positive('Student ID must be positive'),
  subject_id: z
    .number({ required_error: 'Subject ID is required' })
    .int('Subject ID must be an integer')
    .positive('Subject ID must be positive'),
  marks_obtained: z
    .number()
    .nonnegative('Marks obtained must be non-negative')
    .max(999.99, 'Marks obtained must be less than 1000')
    .optional(),
  total_marks: z
    .number()
    .positive('Total marks must be positive')
    .max(999.99, 'Total marks must be less than 1000')
    .optional(),
  grade: z
    .string()
    .max(10, 'Grade must be less than 10 characters')
    .trim()
    .optional(),
  remarks: z
    .string()
    .max(1000, 'Remarks must be less than 1000 characters')
    .optional(),
  is_absent: z
    .boolean()
    .optional()
    .default(false),
  entered_by: z
    .number()
    .int('Entered by must be an integer')
    .positive('Entered by must be positive')
    .optional(),
}).refine((data) => {
  if (data.marks_obtained !== undefined && data.total_marks !== undefined) {
    return data.marks_obtained <= data.total_marks;
  }
  return true;
}, {
  message: 'Marks obtained cannot be greater than total marks',
  path: ['marks_obtained'],
});

export const updateMarkSchema = z.object({
  marks_obtained: z
    .number()
    .nonnegative('Marks obtained must be non-negative')
    .max(999.99, 'Marks obtained must be less than 1000')
    .optional(),
  total_marks: z
    .number()
    .positive('Total marks must be positive')
    .max(999.99, 'Total marks must be less than 1000')
    .optional(),
  grade: z
    .string()
    .max(10, 'Grade must be less than 10 characters')
    .trim()
    .optional(),
  remarks: z
    .string()
    .max(1000, 'Remarks must be less than 1000 characters')
    .optional(),
  is_absent: z
    .boolean()
    .optional(),
  entered_by: z
    .number()
    .int('Entered by must be an integer')
    .positive('Entered by must be positive')
    .optional(),
}).refine((data) => {
  if (data.marks_obtained !== undefined && data.total_marks !== undefined) {
    return data.marks_obtained <= data.total_marks;
  }
  return true;
}, {
  message: 'Marks obtained cannot be greater than total marks',
  path: ['marks_obtained'],
});

export const bulkCreateMarkSchema = z.object({
  school_id: z
    .number({ required_error: 'School ID is required' })
    .int('School ID must be an integer')
    .positive('School ID must be positive'),
  exam_id: z
    .number({ required_error: 'Exam ID is required' })
    .int('Exam ID must be an integer')
    .positive('Exam ID must be positive'),
  subject_id: z
    .number({ required_error: 'Subject ID is required' })
    .int('Subject ID must be an integer')
    .positive('Subject ID must be positive'),
  marks: z
    .array(
      z.object({
        student_id: z
          .number()
          .int('Student ID must be an integer')
          .positive('Student ID must be positive'),
        marks_obtained: z
          .number()
          .nonnegative('Marks obtained must be non-negative')
          .max(999.99, 'Marks obtained must be less than 1000')
          .optional(),
        total_marks: z
          .number()
          .positive('Total marks must be positive')
          .max(999.99, 'Total marks must be less than 1000')
          .optional(),
        grade: z
          .string()
          .max(10, 'Grade must be less than 10 characters')
          .trim()
          .optional(),
        remarks: z
          .string()
          .max(1000, 'Remarks must be less than 1000 characters')
          .optional(),
        is_absent: z
          .boolean()
          .optional()
          .default(false),
      }).refine((data) => {
        if (data.marks_obtained !== undefined && data.total_marks !== undefined) {
          return data.marks_obtained <= data.total_marks;
        }
        return true;
      }, {
        message: 'Marks obtained cannot be greater than total marks',
        path: ['marks_obtained'],
      })
    )
    .min(1, 'At least one mark record is required'),
  entered_by: z
    .number()
    .int('Entered by must be an integer')
    .positive('Entered by must be positive')
    .optional(),
});

export type CreateMarkInput = z.infer<typeof createMarkSchema>;
export type UpdateMarkInput = z.infer<typeof updateMarkSchema>;
export type BulkCreateMarkInput = z.infer<typeof bulkCreateMarkSchema>;
