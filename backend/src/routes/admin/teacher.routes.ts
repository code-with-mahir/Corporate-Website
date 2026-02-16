import { Router } from 'express';
import * as teacherController from '../../controllers/admin/teacher.controller';
import { authenticate, extractSchool, checkSubscription, requireRole } from '../../middleware';

const router = Router();

router.use(authenticate);
router.use(extractSchool);
router.use(checkSubscription);
router.use(requireRole(['admin']));

router.post('/', teacherController.createTeacher);
router.get('/', teacherController.getTeachers);
router.get('/:teacherId', teacherController.getTeacher);
router.put('/:teacherId', teacherController.updateTeacher);
router.delete('/:teacherId', teacherController.deleteTeacher);
router.post('/:teacherId/reset-password', teacherController.resetPassword);

export default router;
