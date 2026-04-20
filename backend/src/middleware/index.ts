/**
 * Production-ready middleware for School Management SaaS
 * 
 * Usage Examples:
 * 
 * ```typescript
 * import express from 'express';
 * import {
 *   authenticate,
 *   extractSchool,
 *   checkSubscription,
 *   requireRole,
 *   authLimiter,
 *   apiLimiter,
 *   validate,
 *   errorHandler
 * } from './middleware';
 * 
 * const app = express();
 * 
 * // Auth routes with rate limiting
 * app.post('/auth/login', authLimiter, validate(loginSchema), (req, res) => {
 *   // Login logic
 * });
 * 
 * // Protected routes with authentication
 * app.get('/api/profile', authenticate, (req, res) => {
 *   res.json({ user: req.user });
 * });
 * 
 * // School-scoped routes with subscription check
 * app.get('/api/students', 
 *   authenticate, 
 *   extractSchool, 
 *   checkSubscription, 
 *   requireRole('admin', 'teacher'),
 *   (req, res) => {
 *     // req.user, req.school, req.schoolId available here
 *   }
 * );
 * 
 * // General API rate limiting
 * app.use('/api', apiLimiter);
 * 
 * // Global error handler (must be last)
 * app.use(errorHandler);
 * ```
 */

export { authenticate } from './auth';
export { extractSchool } from './schoolContext';
export { checkSubscription } from './subscriptionCheck';
export { requireRole } from './roleGuard';
export { authLimiter, apiLimiter } from './rateLimiter';
export { validate } from './validate';
export { errorHandler } from './errorHandler';
