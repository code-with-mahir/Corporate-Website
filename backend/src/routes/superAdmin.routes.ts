import { Router } from 'express';
import * as superAdminController from '../controllers/superAdmin.controller';
import { authenticate, requireRole, validate } from '../middleware';

const router = Router();

router.post('/login', superAdminController.login);

router.use(authenticate);
router.use(requireRole(['super_admin']));

router.get('/me', superAdminController.getProfile);

// Schools
router.post('/schools', superAdminController.createSchool);
router.get('/schools', superAdminController.getAllSchools);
router.get('/schools/:schoolId', superAdminController.getSchool);
router.put('/schools/:schoolId', superAdminController.updateSchool);
router.delete('/schools/:schoolId', superAdminController.deleteSchool);

// Subscriptions
router.post('/schools/:schoolId/subscriptions', superAdminController.createSubscription);
router.get('/schools/:schoolId/subscriptions', superAdminController.getSchoolSubscriptions);
router.put('/subscriptions/:subscriptionId', superAdminController.updateSubscription);

// Payments
router.get('/payments', superAdminController.getAllPayments);
router.get('/schools/:schoolId/payments', superAdminController.getSchoolPayments);

// Stats
router.get('/stats', superAdminController.getStats);

export default router;
