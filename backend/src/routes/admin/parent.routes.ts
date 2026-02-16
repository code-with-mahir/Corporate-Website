import { Router } from 'express';
import * as parentController from '../../controllers/admin/parent.controller';
import { authenticate, extractSchool, checkSubscription, requireRole } from '../../middleware';

const router = Router();

router.use(authenticate);
router.use(extractSchool);
router.use(checkSubscription);
router.use(requireRole(['admin']));

router.post('/', parentController.createParent);
router.get('/', parentController.getParents);
router.get('/:parentId', parentController.getParent);
router.put('/:parentId', parentController.updateParent);
router.delete('/:parentId', parentController.deleteParent);
router.post('/:parentId/link-student', parentController.linkStudent);
router.delete('/:parentId/unlink-student/:studentId', parentController.unlinkStudent);
router.post('/:parentId/reset-password', parentController.resetPassword);

export default router;
