import { Router } from 'express';
import * as academicYearController from '../../controllers/admin/academicYear.controller';
import { authenticate, extractSchool, checkSubscription, requireRole } from '../../middleware';

const router = Router();

router.use(authenticate);
router.use(extractSchool);
router.use(checkSubscription);
router.use(requireRole(['admin']));

router.post('/', academicYearController.createAcademicYear);
router.get('/', academicYearController.getAcademicYears);
router.get('/:academicYearId', academicYearController.getAcademicYear);
router.put('/:academicYearId', academicYearController.updateAcademicYear);
router.delete('/:academicYearId', academicYearController.deleteAcademicYear);
router.post('/:academicYearId/set-current', academicYearController.setCurrentAcademicYear);

export default router;
