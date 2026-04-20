import { Router } from 'express';
import * as classController from '../../controllers/admin/class.controller';
import { authenticate, extractSchool, checkSubscription, requireRole } from '../../middleware';

const router = Router();

router.use(authenticate);
router.use(extractSchool);
router.use(checkSubscription);
router.use(requireRole(['admin']));

router.post('/', classController.createClass);
router.get('/', classController.getClasses);
router.get('/:classId', classController.getClass);
router.put('/:classId', classController.updateClass);
router.delete('/:classId', classController.deleteClass);

export default router;
