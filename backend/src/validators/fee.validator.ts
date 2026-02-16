import { z } from 'zod';

export const createFeeStructureSchema = z.object({
  school_id: z
    .number({ required_error: 'School ID is required' })
    .int('School ID must be an integer')
    .positive('School ID must be positive'),
  academic_year_id: z
    .number({ required_error: 'Academic year ID is required' })
    .int('Academic year ID must be an integer')
    .positive('Academic year ID must be positive'),
  class_id: z
    .number({ required_error: 'Class ID is required' })
    .int('Class ID must be an integer')
    .positive('Class ID must be positive'),
  fee_type: z
    .string({ required_error: 'Fee type is required' })
    .min(1, 'Fee type cannot be empty')
    .max(100, 'Fee type must be less than 100 characters')
    .trim(),
  amount: z
    .number({ required_error: 'Amount is required' })
    .positive('Amount must be positive')
    .max(9999999.99, 'Amount must be less than 10 million'),
  frequency: z
    .enum(['monthly', 'quarterly', 'half-yearly', 'yearly', 'one-time'], {
      errorMap: () => ({ message: 'Frequency must be monthly, quarterly, half-yearly, yearly, or one-time' }),
    })
    .optional(),
  due_date: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), 'Invalid due date format')
    .optional(),
  late_fee_amount: z
    .number()
    .nonnegative('Late fee amount must be non-negative')
    .max(9999999.99, 'Late fee amount must be less than 10 million')
    .optional()
    .default(0),
  late_fee_type: z
    .enum(['fixed', 'percentage'], {
      errorMap: () => ({ message: 'Late fee type must be fixed or percentage' }),
    })
    .optional(),
  grace_period_days: z
    .number()
    .int('Grace period days must be an integer')
    .nonnegative('Grace period days must be non-negative')
    .max(365, 'Grace period days must be less than 365')
    .optional()
    .default(0),
  is_mandatory: z
    .boolean()
    .optional()
    .default(true),
});

export const createFeePaymentSchema = z.object({
  school_id: z
    .number({ required_error: 'School ID is required' })
    .int('School ID must be an integer')
    .positive('School ID must be positive'),
  student_id: z
    .number({ required_error: 'Student ID is required' })
    .int('Student ID must be an integer')
    .positive('Student ID must be positive'),
  fee_structure_id: z
    .number()
    .int('Fee structure ID must be an integer')
    .positive('Fee structure ID must be positive')
    .optional(),
  amount_paid: z
    .number({ required_error: 'Amount paid is required' })
    .positive('Amount paid must be positive')
    .max(9999999.99, 'Amount paid must be less than 10 million'),
  late_fee_paid: z
    .number()
    .nonnegative('Late fee paid must be non-negative')
    .max(9999999.99, 'Late fee paid must be less than 10 million')
    .optional()
    .default(0),
  total_amount: z
    .number({ required_error: 'Total amount is required' })
    .positive('Total amount must be positive')
    .max(9999999.99, 'Total amount must be less than 10 million'),
  payment_method: z
    .enum(['cash', 'card', 'bank_transfer', 'upi', 'cheque', 'online'], {
      errorMap: () => ({ message: 'Payment method must be cash, card, bank_transfer, upi, cheque, or online' }),
    })
    .optional(),
  transaction_id: z
    .string()
    .max(255, 'Transaction ID must be less than 255 characters')
    .trim()
    .optional(),
  payment_date: z
    .string({ required_error: 'Payment date is required' })
    .refine((val) => !isNaN(Date.parse(val)), 'Invalid payment date format'),
  academic_year_id: z
    .number()
    .int('Academic year ID must be an integer')
    .positive('Academic year ID must be positive')
    .optional(),
  remarks: z
    .string()
    .max(1000, 'Remarks must be less than 1000 characters')
    .optional(),
  collected_by: z
    .number()
    .int('Collected by must be an integer')
    .positive('Collected by must be positive')
    .optional(),
  status: z
    .enum(['completed', 'pending', 'failed', 'refunded'], {
      errorMap: () => ({ message: 'Status must be completed, pending, failed, or refunded' }),
    })
    .optional()
    .default('completed'),
}).refine((data) => {
  return data.total_amount === data.amount_paid + (data.late_fee_paid || 0);
}, {
  message: 'Total amount must equal amount paid plus late fee paid',
  path: ['total_amount'],
});

export type CreateFeeStructureInput = z.infer<typeof createFeeStructureSchema>;
export type CreateFeePaymentInput = z.infer<typeof createFeePaymentSchema>;
