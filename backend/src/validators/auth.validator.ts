import { z } from 'zod';

export const loginSchema = z.object({
  email: z
    .string({ required_error: 'Email is required' })
    .email('Invalid email format')
    .min(1, 'Email cannot be empty')
    .max(255, 'Email must be less than 255 characters'),
  password: z
    .string({ required_error: 'Password is required' })
    .min(1, 'Password cannot be empty')
    .max(255, 'Password must be less than 255 characters'),
  schoolSlug: z
    .string()
    .min(1, 'School slug cannot be empty')
    .max(100, 'School slug must be less than 100 characters')
    .regex(/^[a-z0-9-]+$/, 'School slug must contain only lowercase letters, numbers, and hyphens')
    .optional(),
});

export const refreshTokenSchema = z.object({
  refreshToken: z
    .string({ required_error: 'Refresh token is required' })
    .min(1, 'Refresh token cannot be empty'),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
