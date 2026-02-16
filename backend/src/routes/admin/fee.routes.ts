import { Router } from 'express';
import * as feeController from '../../controllers/admin/fee.controller';
import { authenticate, extractSchool, checkSubscription, requireRole } from '../../middleware';

const router = Router();

router.use(authenticate);
router.use(extractSchool);
router.use(checkSubscription);
router.use(requireRole(['admin']));

router.post('/', feeController.createFee);
router.get('/', feeController.getFees);
router.get('/:feeId', feeController.getFee);
router.put('/:feeId', feeController.updateFee);
router.delete('/:feeId', feeController.deleteFee);
router.post('/bulk-assign', feeController.bulkAssignFees);

export default router;
