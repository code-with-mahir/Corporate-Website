import { Router } from 'express';
import * as teacherController from '../controllers/teacher.controller';
import { authenticate, extractSchool, checkSubscription, requireRole } from '../middleware';

const router = Router();

router.use(authenticate);
router.use(extractSchool);
router.use(checkSubscription);
router.use(requireRole(['teacher']));

router.get('/profile', teacherController.getProfile);
router.put('/profile', teacherController.updateProfile);

// Classes & Sections
router.get('/classes', teacherController.getMyClasses);
router.get('/sections/:sectionId/students', teacherController.getSectionStudents);

// Attendance
router.post('/attendance', teacherController.markAttendance);
router.get('/attendance/:sectionId', teacherController.getAttendance);
router.put('/attendance/:attendanceId', teacherController.updateAttendance);

// Grades
router.post('/grades', teacherController.createGrade);
router.get('/grades/:sectionId', teacherController.getSectionGrades);
router.put('/grades/:gradeId', teacherController.updateGrade);
router.delete('/grades/:gradeId', teacherController.deleteGrade);

// Homework
router.post('/homework', teacherController.createHomework);
router.get('/homework', teacherController.getMyHomework);
router.get('/homework/:homeworkId', teacherController.getHomework);
router.put('/homework/:homeworkId', teacherController.updateHomework);
router.delete('/homework/:homeworkId', teacherController.deleteHomework);

// Announcements
router.get('/announcements', teacherController.getAnnouncements);

export default router;
