import { Request, Response, NextFunction } from 'express';
import { successResponse, errorResponse } from '../utils/response';
import { pool } from '../config/database';

export const getAssignedClasses = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const teacherId = req.user!.id;
    const schoolId = req.user!.school_id;

    const query = `
      SELECT 
        ta.id as assignment_id,
        c.id as class_id,
        c.name as class_name,
        s.id as section_id,
        s.name as section_name,
        sub.id as subject_id,
        sub.name as subject_name,
        ta.academic_year
      FROM teacher_assignments ta
      JOIN classes c ON ta.class_id = c.id
      LEFT JOIN sections s ON ta.section_id = s.id
      JOIN subjects sub ON ta.subject_id = sub.id
      WHERE ta.teacher_id = $1 
        AND ta.school_id = $2
        AND ta.is_active = true
      ORDER BY c.name, s.name, sub.name
    `;

    const result = await pool.query(query, [teacherId, schoolId]);

    res.status(200).json(successResponse(result.rows, 'Assigned classes retrieved successfully'));
  } catch (error) {
    next(error);
  }
};

export const getStudents = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const teacherId = req.user!.id;
    const schoolId = req.user!.school_id;
    const { classId, sectionId } = req.query;

    if (!classId) {
      res.status(400).json(errorResponse('Class ID is required'));
      return;
    }

    // Verify teacher is assigned to this class/section
    const assignmentCheck = `
      SELECT id FROM teacher_assignments
      WHERE teacher_id = $1 
        AND school_id = $2
        AND class_id = $3
        AND ($4::uuid IS NULL OR section_id = $4)
        AND is_active = true
      LIMIT 1
    `;

    const assignmentResult = await pool.query(assignmentCheck, [
      teacherId,
      schoolId,
      classId,
      sectionId || null
    ]);

    if (assignmentResult.rows.length === 0) {
      res.status(403).json(errorResponse('You are not assigned to this class/section'));
      return;
    }

    const query = `
      SELECT 
        u.id,
        u.name,
        u.email,
        st.roll_number,
        st.admission_number,
        c.name as class_name,
        s.name as section_name
      FROM users u
      JOIN students st ON u.id = st.user_id
      JOIN classes c ON st.class_id = c.id
      LEFT JOIN sections s ON st.section_id = s.id
      WHERE u.school_id = $1
        AND st.class_id = $2
        AND ($3::uuid IS NULL OR st.section_id = $3)
        AND u.is_active = true
      ORDER BY st.roll_number
    `;

    const result = await pool.query(query, [schoolId, classId, sectionId || null]);

    res.status(200).json(successResponse(result.rows, 'Students retrieved successfully'));
  } catch (error) {
    next(error);
  }
};

export const markAttendance = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const teacherId = req.user!.id;
    const schoolId = req.user!.school_id;
    const { studentId, date, status, classId, sectionId, subjectId, remarks } = req.body;

    if (!studentId || !date || !status || !classId) {
      res.status(400).json(errorResponse('Student ID, date, status, and class ID are required'));
      return;
    }

    if (!['present', 'absent', 'late', 'excused'].includes(status)) {
      res.status(400).json(errorResponse('Invalid attendance status'));
      return;
    }

    // Verify teacher assignment
    const assignmentCheck = `
      SELECT id FROM teacher_assignments
      WHERE teacher_id = $1 
        AND school_id = $2
        AND class_id = $3
        AND ($4::uuid IS NULL OR section_id = $4)
        AND is_active = true
      LIMIT 1
    `;

    const assignmentResult = await pool.query(assignmentCheck, [
      teacherId,
      schoolId,
      classId,
      sectionId || null
    ]);

    if (assignmentResult.rows.length === 0) {
      res.status(403).json(errorResponse('You are not authorized to mark attendance for this class'));
      return;
    }

    const query = `
      INSERT INTO attendance (student_id, school_id, class_id, section_id, subject_id, date, status, marked_by, remarks)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (student_id, date, subject_id) 
      DO UPDATE SET 
        status = EXCLUDED.status,
        marked_by = EXCLUDED.marked_by,
        remarks = EXCLUDED.remarks,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `;

    const result = await pool.query(query, [
      studentId,
      schoolId,
      classId,
      sectionId || null,
      subjectId || null,
      date,
      status,
      teacherId,
      remarks || null
    ]);

    res.status(201).json(successResponse(result.rows[0], 'Attendance marked successfully'));
  } catch (error) {
    next(error);
  }
};

export const bulkMarkAttendance = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const teacherId = req.user!.id;
    const schoolId = req.user!.school_id;
    const { attendanceRecords, classId, sectionId, date } = req.body;

    if (!attendanceRecords || !Array.isArray(attendanceRecords) || attendanceRecords.length === 0) {
      res.status(400).json(errorResponse('Attendance records array is required'));
      return;
    }

    if (!classId || !date) {
      res.status(400).json(errorResponse('Class ID and date are required'));
      return;
    }

    // Verify teacher assignment
    const assignmentCheck = `
      SELECT id FROM teacher_assignments
      WHERE teacher_id = $1 
        AND school_id = $2
        AND class_id = $3
        AND ($4::uuid IS NULL OR section_id = $4)
        AND is_active = true
      LIMIT 1
    `;

    const assignmentResult = await pool.query(assignmentCheck, [
      teacherId,
      schoolId,
      classId,
      sectionId || null
    ]);

    if (assignmentResult.rows.length === 0) {
      res.status(403).json(errorResponse('You are not authorized to mark attendance for this class'));
      return;
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const insertedRecords = [];
      for (const record of attendanceRecords) {
        const { studentId, status, subjectId, remarks } = record;

        if (!studentId || !status) {
          await client.query('ROLLBACK');
          res.status(400).json(errorResponse('Each record must have studentId and status'));
          return;
        }

        const query = `
          INSERT INTO attendance (student_id, school_id, class_id, section_id, subject_id, date, status, marked_by, remarks)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          ON CONFLICT (student_id, date, subject_id) 
          DO UPDATE SET 
            status = EXCLUDED.status,
            marked_by = EXCLUDED.marked_by,
            remarks = EXCLUDED.remarks,
            updated_at = CURRENT_TIMESTAMP
          RETURNING *
        `;

        const result = await client.query(query, [
          studentId,
          schoolId,
          classId,
          sectionId || null,
          subjectId || null,
          date,
          status,
          teacherId,
          remarks || null
        ]);

        insertedRecords.push(result.rows[0]);
      }

      await client.query('COMMIT');
      res.status(201).json(successResponse({
        count: insertedRecords.length,
        records: insertedRecords
      }, 'Bulk attendance marked successfully'));
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    next(error);
  }
};

export const enterMarks = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const teacherId = req.user!.id;
    const schoolId = req.user!.school_id;
    const { studentId, examId, subjectId, marksObtained, maxMarks, grade, remarks } = req.body;

    if (!studentId || !examId || !subjectId || marksObtained === undefined || !maxMarks) {
      res.status(400).json(errorResponse('Student ID, exam ID, subject ID, marks obtained, and max marks are required'));
      return;
    }

    if (marksObtained < 0 || marksObtained > maxMarks) {
      res.status(400).json(errorResponse('Marks obtained must be between 0 and max marks'));
      return;
    }

    // Verify teacher is assigned to this subject
    const assignmentCheck = `
      SELECT id FROM teacher_assignments
      WHERE teacher_id = $1 
        AND school_id = $2
        AND subject_id = $3
        AND is_active = true
      LIMIT 1
    `;

    const assignmentResult = await pool.query(assignmentCheck, [teacherId, schoolId, subjectId]);

    if (assignmentResult.rows.length === 0) {
      res.status(403).json(errorResponse('You are not authorized to enter marks for this subject'));
      return;
    }

    const query = `
      INSERT INTO exam_marks (student_id, exam_id, subject_id, school_id, marks_obtained, max_marks, grade, entered_by, remarks)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (student_id, exam_id, subject_id) 
      DO UPDATE SET 
        marks_obtained = EXCLUDED.marks_obtained,
        max_marks = EXCLUDED.max_marks,
        grade = EXCLUDED.grade,
        entered_by = EXCLUDED.entered_by,
        remarks = EXCLUDED.remarks,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `;

    const result = await pool.query(query, [
      studentId,
      examId,
      subjectId,
      schoolId,
      marksObtained,
      maxMarks,
      grade || null,
      teacherId,
      remarks || null
    ]);

    res.status(201).json(successResponse(result.rows[0], 'Marks entered successfully'));
  } catch (error) {
    next(error);
  }
};

export const bulkEnterMarks = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const teacherId = req.user!.id;
    const schoolId = req.user!.school_id;
    const { marksRecords, examId, subjectId } = req.body;

    if (!marksRecords || !Array.isArray(marksRecords) || marksRecords.length === 0) {
      res.status(400).json(errorResponse('Marks records array is required'));
      return;
    }

    if (!examId || !subjectId) {
      res.status(400).json(errorResponse('Exam ID and subject ID are required'));
      return;
    }

    // Verify teacher assignment
    const assignmentCheck = `
      SELECT id FROM teacher_assignments
      WHERE teacher_id = $1 
        AND school_id = $2
        AND subject_id = $3
        AND is_active = true
      LIMIT 1
    `;

    const assignmentResult = await pool.query(assignmentCheck, [teacherId, schoolId, subjectId]);

    if (assignmentResult.rows.length === 0) {
      res.status(403).json(errorResponse('You are not authorized to enter marks for this subject'));
      return;
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const insertedRecords = [];
      for (const record of marksRecords) {
        const { studentId, marksObtained, maxMarks, grade, remarks } = record;

        if (!studentId || marksObtained === undefined || !maxMarks) {
          await client.query('ROLLBACK');
          res.status(400).json(errorResponse('Each record must have studentId, marksObtained, and maxMarks'));
          return;
        }

        if (marksObtained < 0 || marksObtained > maxMarks) {
          await client.query('ROLLBACK');
          res.status(400).json(errorResponse(`Invalid marks for student ${studentId}: must be between 0 and ${maxMarks}`));
          return;
        }

        const query = `
          INSERT INTO exam_marks (student_id, exam_id, subject_id, school_id, marks_obtained, max_marks, grade, entered_by, remarks)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          ON CONFLICT (student_id, exam_id, subject_id) 
          DO UPDATE SET 
            marks_obtained = EXCLUDED.marks_obtained,
            max_marks = EXCLUDED.max_marks,
            grade = EXCLUDED.grade,
            entered_by = EXCLUDED.entered_by,
            remarks = EXCLUDED.remarks,
            updated_at = CURRENT_TIMESTAMP
          RETURNING *
        `;

        const result = await client.query(query, [
          studentId,
          examId,
          subjectId,
          schoolId,
          marksObtained,
          maxMarks,
          grade || null,
          teacherId,
          remarks || null
        ]);

        insertedRecords.push(result.rows[0]);
      }

      await client.query('COMMIT');
      res.status(201).json(successResponse({
        count: insertedRecords.length,
        records: insertedRecords
      }, 'Bulk marks entered successfully'));
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    next(error);
  }
};

export const viewMarks = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const teacherId = req.user!.id;
    const schoolId = req.user!.school_id;
    const { examId, subjectId, classId, sectionId } = req.query;

    let query = `
      SELECT 
        em.*,
        u.name as student_name,
        st.roll_number,
        e.name as exam_name,
        sub.name as subject_name,
        c.name as class_name,
        sec.name as section_name
      FROM exam_marks em
      JOIN users u ON em.student_id = u.id
      JOIN students st ON u.id = st.user_id
      JOIN exams e ON em.exam_id = e.id
      JOIN subjects sub ON em.subject_id = sub.id
      JOIN classes c ON st.class_id = c.id
      LEFT JOIN sections sec ON st.section_id = sec.id
      WHERE em.school_id = $1
        AND em.entered_by = $2
    `;

    const params: any[] = [schoolId, teacherId];
    let paramCount = 2;

    if (examId) {
      paramCount++;
      query += ` AND em.exam_id = $${paramCount}`;
      params.push(examId);
    }

    if (subjectId) {
      paramCount++;
      query += ` AND em.subject_id = $${paramCount}`;
      params.push(subjectId);
    }

    if (classId) {
      paramCount++;
      query += ` AND st.class_id = $${paramCount}`;
      params.push(classId);
    }

    if (sectionId) {
      paramCount++;
      query += ` AND st.section_id = $${paramCount}`;
      params.push(sectionId);
    }

    query += ` ORDER BY e.name, sub.name, st.roll_number`;

    const result = await pool.query(query, params);

    res.status(200).json(successResponse(result.rows, 'Marks retrieved successfully'));
  } catch (error) {
    next(error);
  }
};
