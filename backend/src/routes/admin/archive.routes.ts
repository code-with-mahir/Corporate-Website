import { Router } from 'express';
import * as archiveController from '../../controllers/admin/archive.controller';
import { authenticate, extractSchool, checkSubscription, requireRole } from '../../middleware';

const router = Router();

router.use(authenticate);
router.use(extractSchool);
router.use(checkSubscription);
router.use(requireRole(['admin']));

router.post('/students/:studentId', archiveController.archiveStudent);
router.post('/teachers/:teacherId', archiveController.archiveTeacher);
router.get('/students', archiveController.getArchivedStudents);
router.get('/teachers', archiveController.getArchivedTeachers);

export default router;
