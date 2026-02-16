import { Router } from 'express';
import * as sectionController from '../../controllers/admin/section.controller';
import { authenticate, extractSchool, checkSubscription, requireRole } from '../../middleware';

const router = Router();

router.use(authenticate);
router.use(extractSchool);
router.use(checkSubscription);
router.use(requireRole(['admin']));

router.post('/', sectionController.createSection);
router.get('/', sectionController.getSections);
router.get('/class/:classId', sectionController.getClassSections);
router.get('/:sectionId', sectionController.getSection);
router.put('/:sectionId', sectionController.updateSection);
router.delete('/:sectionId', sectionController.deleteSection);
router.post('/:sectionId/assign-teacher', sectionController.assignTeacher);
router.delete('/:sectionId/unassign-teacher/:teacherId', sectionController.unassignTeacher);

export default router;
