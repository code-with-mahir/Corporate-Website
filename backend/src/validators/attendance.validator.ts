import { z } from 'zod';

export const markAttendanceSchema = z.object({
  school_id: z
    .number({ required_error: 'School ID is required' })
    .int('School ID must be an integer')
    .positive('School ID must be positive'),
  student_id: z
    .number({ required_error: 'Student ID is required' })
    .int('Student ID must be an integer')
    .positive('Student ID must be positive'),
  class_id: z
    .number({ required_error: 'Class ID is required' })
    .int('Class ID must be an integer')
    .positive('Class ID must be positive'),
  section_id: z
    .number({ required_error: 'Section ID is required' })
    .int('Section ID must be an integer')
    .positive('Section ID must be positive'),
  date: z
    .string({ required_error: 'Date is required' })
    .refine((val) => !isNaN(Date.parse(val)), 'Invalid date format'),
  status: z
    .enum(['present', 'absent', 'late', 'half-day', 'excused'], {
      required_error: 'Status is required',
      errorMap: () => ({ message: 'Status must be present, absent, late, half-day, or excused' }),
    }),
  remarks: z
    .string()
    .max(1000, 'Remarks must be less than 1000 characters')
    .optional(),
  marked_by: z
    .number()
    .int('Marked by must be an integer')
    .positive('Marked by must be positive')
    .optional(),
});

export const bulkMarkAttendanceSchema = z.object({
  school_id: z
    .number({ required_error: 'School ID is required' })
    .int('School ID must be an integer')
    .positive('School ID must be positive'),
  class_id: z
    .number({ required_error: 'Class ID is required' })
    .int('Class ID must be an integer')
    .positive('Class ID must be positive'),
  section_id: z
    .number({ required_error: 'Section ID is required' })
    .int('Section ID must be an integer')
    .positive('Section ID must be positive'),
  date: z
    .string({ required_error: 'Date is required' })
    .refine((val) => !isNaN(Date.parse(val)), 'Invalid date format'),
  attendance: z
    .array(
      z.object({
        student_id: z
          .number()
          .int('Student ID must be an integer')
          .positive('Student ID must be positive'),
        status: z
          .enum(['present', 'absent', 'late', 'half-day', 'excused'], {
            errorMap: () => ({ message: 'Status must be present, absent, late, half-day, or excused' }),
          }),
        remarks: z
          .string()
          .max(1000, 'Remarks must be less than 1000 characters')
          .optional(),
      })
    )
    .min(1, 'At least one attendance record is required'),
  marked_by: z
    .number()
    .int('Marked by must be an integer')
    .positive('Marked by must be positive')
    .optional(),
});

export type MarkAttendanceInput = z.infer<typeof markAttendanceSchema>;
export type BulkMarkAttendanceInput = z.infer<typeof bulkMarkAttendanceSchema>;
