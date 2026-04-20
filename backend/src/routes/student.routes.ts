import { Router } from 'express';
import * as studentController from '../controllers/student.controller';
import { authenticate, extractSchool, checkSubscription, requireRole } from '../middleware';

const router = Router();

router.use(authenticate);
router.use(extractSchool);
router.use(checkSubscription);
router.use(requireRole(['student']));

router.get('/profile', studentController.getProfile);
router.put('/profile', studentController.updateProfile);

// Classes & Subjects
router.get('/class', studentController.getMyClass);
router.get('/subjects', studentController.getMySubjects);

// Attendance
router.get('/attendance', studentController.getMyAttendance);
router.get('/attendance/stats', studentController.getAttendanceStats);

// Grades
router.get('/grades', studentController.getMyGrades);
router.get('/grades/subject/:subjectId', studentController.getSubjectGrades);

// Homework
router.get('/homework', studentController.getMyHomework);
router.get('/homework/:homeworkId', studentController.getHomework);
router.post('/homework/:homeworkId/submit', studentController.submitHomework);

// Fees
router.get('/fees', studentController.getMyFees);
router.get('/fees/:feeId', studentController.getFeeDetails);

// Announcements
router.get('/announcements', studentController.getAnnouncements);

export default router;
