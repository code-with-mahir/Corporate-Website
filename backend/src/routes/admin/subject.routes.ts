import { Router } from 'express';
import * as subjectController from '../../controllers/admin/subject.controller';
import { authenticate, extractSchool, checkSubscription, requireRole } from '../../middleware';

const router = Router();

router.use(authenticate);
router.use(extractSchool);
router.use(checkSubscription);
router.use(requireRole(['admin']));

router.post('/', subjectController.createSubject);
router.get('/', subjectController.getSubjects);
router.get('/class/:classId', subjectController.getClassSubjects);
router.get('/:subjectId', subjectController.getSubject);
router.put('/:subjectId', subjectController.updateSubject);
router.delete('/:subjectId', subjectController.deleteSubject);
router.post('/:subjectId/assign-teacher', subjectController.assignTeacher);

export default router;
