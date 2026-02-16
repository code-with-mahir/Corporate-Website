import { Router } from 'express';
import * as promotionController from '../../controllers/admin/promotion.controller';
import { authenticate, extractSchool, checkSubscription, requireRole } from '../../middleware';

const router = Router();

router.use(authenticate);
router.use(extractSchool);
router.use(checkSubscription);
router.use(requireRole(['admin']));

router.post('/preview', promotionController.previewPromotion);
router.post('/execute', promotionController.executePromotion);

export default router;
