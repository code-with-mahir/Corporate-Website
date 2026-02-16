import { Router } from 'express';
import * as authController from '../controllers/auth.controller';
import { authenticate, extractSchool } from '../middleware';

const router = Router();

router.post('/login', extractSchool, authController.login);
router.post('/refresh', authController.refresh);
router.post('/logout', authenticate, authController.logout);
router.get('/me', authenticate, authController.me);

export default router;
