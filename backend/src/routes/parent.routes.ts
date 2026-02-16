import { Router } from 'express';
import * as parentController from '../controllers/parent.controller';
import { authenticate, extractSchool, checkSubscription, requireRole } from '../middleware';

const router = Router();

router.use(authenticate);
router.use(extractSchool);
router.use(checkSubscription);
router.use(requireRole(['parent']));

router.get('/profile', parentController.getProfile);
router.put('/profile', parentController.updateProfile);

// Children
router.get('/children', parentController.getChildren);
router.get('/children/:studentId', parentController.getChildProfile);

// Attendance
router.get('/children/:studentId/attendance', parentController.getChildAttendance);
router.get('/children/:studentId/attendance/stats', parentController.getChildAttendanceStats);

// Grades
router.get('/children/:studentId/grades', parentController.getChildGrades);

// Homework
router.get('/children/:studentId/homework', parentController.getChildHomework);
router.get('/homework/:homeworkId', parentController.getHomeworkDetails);

// Fees
router.get('/children/:studentId/fees', parentController.getChildFees);
router.post('/fees/:feeId/pay', parentController.payFee);

// Announcements
router.get('/announcements', parentController.getAnnouncements);

export default router;
