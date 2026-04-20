import express, { Application } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import dotenv from 'dotenv';
import { authLimiter, apiLimiter } from './middleware/rateLimiter';
import { errorHandler } from './middleware/errorHandler';

// Routes
import authRoutes from './routes/auth.routes';
import webhookRoutes from './routes/webhook.routes';
import superAdminRoutes from './routes/superAdmin.routes';
import teacherRoutes from './routes/teacher.routes';
import studentRoutes from './routes/student.routes';
import parentRoutes from './routes/parent.routes';
import archiveRoutes from './routes/admin/archive.routes';
import sectionRoutes from './routes/admin/section.routes';
import announcementRoutes from './routes/admin/announcement.routes';
import promotionRoutes from './routes/admin/promotion.routes';
import academicYearRoutes from './routes/admin/academicYear.routes';
import adminTeacherRoutes from './routes/admin/teacher.routes';
import adminStudentRoutes from './routes/admin/student.routes';
import adminParentRoutes from './routes/admin/parent.routes';
import subjectRoutes from './routes/admin/subject.routes';
import classRoutes from './routes/admin/class.routes';
import feeRoutes from './routes/admin/fee.routes';

dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
app.use('/api/auth', authLimiter);
app.use('/api', apiLimiter);

// Health check
app.get('/health', (_req, res) => {
  res.status(200).json({ success: true, message: 'Server is running' });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/webhook', webhookRoutes);
app.use('/api/super-admin', superAdminRoutes);
app.use('/api/teacher', teacherRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/parent', parentRoutes);
app.use('/api/admin/archive', archiveRoutes);
app.use('/api/admin/sections', sectionRoutes);
app.use('/api/admin/announcements', announcementRoutes);
app.use('/api/admin/promotions', promotionRoutes);
app.use('/api/admin/academic-years', academicYearRoutes);
app.use('/api/admin/teachers', adminTeacherRoutes);
app.use('/api/admin/students', adminStudentRoutes);
app.use('/api/admin/parents', adminParentRoutes);
app.use('/api/admin/subjects', subjectRoutes);
app.use('/api/admin/classes', classRoutes);
app.use('/api/admin/fees', feeRoutes);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// Error handler (must be last)
app.use(errorHandler);

// Start server
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
  });
}

export default app;
