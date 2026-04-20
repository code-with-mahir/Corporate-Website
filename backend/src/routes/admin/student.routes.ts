import { Router } from 'express';
import * as studentController from '../../controllers/admin/student.controller';
import { authenticate, extractSchool, checkSubscription, requireRole } from '../../middleware';

const router = Router();

router.use(authenticate);
router.use(extractSchool);
router.use(checkSubscription);
router.use(requireRole(['admin']));

router.post('/', studentController.createStudent);
router.get('/', studentController.getStudents);
router.get('/:studentId', studentController.getStudent);
router.put('/:studentId', studentController.updateStudent);
router.delete('/:studentId', studentController.deleteStudent);

export default router;
