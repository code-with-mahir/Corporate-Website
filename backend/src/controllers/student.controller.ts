import { Request, Response, NextFunction } from 'express';
import { successResponse, errorResponse } from '../utils/response';
import { pool } from '../config/database';

export const getProfile = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const studentId = req.user!.id;
    const schoolId = req.user!.school_id;

    const query = `
      SELECT 
        u.id,
        u.name,
        u.email,
        u.phone,
        u.date_of_birth,
        u.gender,
        u.address,
        st.roll_number,
        st.admission_number,
        st.admission_date,
        st.blood_group,
        st.guardian_name,
        st.guardian_phone,
        st.guardian_email,
        c.id as class_id,
        c.name as class_name,
        s.id as section_id,
        s.name as section_name
      FROM users u
      JOIN students st ON u.id = st.user_id
      JOIN classes c ON st.class_id = c.id
      LEFT JOIN sections s ON st.section_id = s.id
      WHERE u.id = $1 AND u.school_id = $2
    `;

    const result = await pool.query(query, [studentId, schoolId]);

    if (result.rows.length === 0) {
      res.status(404).json(errorResponse('Student profile not found'));
      return;
    }

    res.status(200).json(successResponse(result.rows[0], 'Profile retrieved successfully'));
  } catch (error) {
    next(error);
  }
};

export const getAttendance = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const studentId = req.user!.id;
    const schoolId = req.user!.school_id;
    const { startDate, endDate, subjectId } = req.query;

    let query = `
      SELECT 
        a.id,
        a.date,
        a.status,
        a.remarks,
        sub.name as subject_name,
        u.name as marked_by_name
      FROM attendance a
      LEFT JOIN subjects sub ON a.subject_id = sub.id
      LEFT JOIN users u ON a.marked_by = u.id
      WHERE a.student_id = $1 AND a.school_id = $2
    `;

    const params: any[] = [studentId, schoolId];
    let paramCount = 2;

    if (startDate) {
      paramCount++;
      query += ` AND a.date >= $${paramCount}`;
      params.push(startDate);
    }

    if (endDate) {
      paramCount++;
      query += ` AND a.date <= $${paramCount}`;
      params.push(endDate);
    }

    if (subjectId) {
      paramCount++;
      query += ` AND a.subject_id = $${paramCount}`;
      params.push(subjectId);
    }

    query += ` ORDER BY a.date DESC`;

    const result = await pool.query(query, params);

    res.status(200).json(successResponse(result.rows, 'Attendance records retrieved successfully'));
  } catch (error) {
    next(error);
  }
};

export const getAttendanceSummary = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const studentId = req.user!.id;
    const schoolId = req.user!.school_id;
    const { startDate, endDate } = req.query;

    let query = `
      SELECT 
        COUNT(*) as total_days,
        COUNT(CASE WHEN status = 'present' THEN 1 END) as present_days,
        COUNT(CASE WHEN status = 'absent' THEN 1 END) as absent_days,
        COUNT(CASE WHEN status = 'late' THEN 1 END) as late_days,
        COUNT(CASE WHEN status = 'excused' THEN 1 END) as excused_days,
        ROUND(
          (COUNT(CASE WHEN status = 'present' THEN 1 END)::decimal / 
          NULLIF(COUNT(*), 0) * 100), 2
        ) as attendance_percentage
      FROM attendance
      WHERE student_id = $1 AND school_id = $2
    `;

    const params: any[] = [studentId, schoolId];
    let paramCount = 2;

    if (startDate) {
      paramCount++;
      query += ` AND date >= $${paramCount}`;
      params.push(startDate);
    }

    if (endDate) {
      paramCount++;
      query += ` AND date <= $${paramCount}`;
      params.push(endDate);
    }

    const result = await pool.query(query, params);

    // Subject-wise attendance
    let subjectQuery = `
      SELECT 
        sub.id as subject_id,
        sub.name as subject_name,
        COUNT(*) as total_days,
        COUNT(CASE WHEN a.status = 'present' THEN 1 END) as present_days,
        COUNT(CASE WHEN a.status = 'absent' THEN 1 END) as absent_days,
        ROUND(
          (COUNT(CASE WHEN a.status = 'present' THEN 1 END)::decimal / 
          NULLIF(COUNT(*), 0) * 100), 2
        ) as attendance_percentage
      FROM attendance a
      JOIN subjects sub ON a.subject_id = sub.id
      WHERE a.student_id = $1 AND a.school_id = $2
    `;

    const subjectParams: any[] = [studentId, schoolId];
    let subjectParamCount = 2;

    if (startDate) {
      subjectParamCount++;
      subjectQuery += ` AND a.date >= $${subjectParamCount}`;
      subjectParams.push(startDate);
    }

    if (endDate) {
      subjectParamCount++;
      subjectQuery += ` AND a.date <= $${subjectParamCount}`;
      subjectParams.push(endDate);
    }

    subjectQuery += ` GROUP BY sub.id, sub.name ORDER BY sub.name`;

    const subjectResult = await pool.query(subjectQuery, subjectParams);

    res.status(200).json(successResponse({
      overall: result.rows[0],
      bySubject: subjectResult.rows
    }, 'Attendance summary retrieved successfully'));
  } catch (error) {
    next(error);
  }
};

export const getMarks = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const studentId = req.user!.id;
    const schoolId = req.user!.school_id;
    const { examId } = req.query;

    let query = `
      SELECT 
        em.*,
        e.name as exam_name,
        e.exam_date,
        e.exam_type,
        sub.name as subject_name,
        sub.code as subject_code,
        ROUND((em.marks_obtained::decimal / em.max_marks * 100), 2) as percentage
      FROM exam_marks em
      JOIN exams e ON em.exam_id = e.id
      JOIN subjects sub ON em.subject_id = sub.id
      WHERE em.student_id = $1 AND em.school_id = $2
    `;

    const params: any[] = [studentId, schoolId];

    if (examId) {
      query += ` AND em.exam_id = $3`;
      params.push(examId);
    }

    query += ` ORDER BY e.exam_date DESC, sub.name`;

    const result = await pool.query(query, params);

    // Calculate exam-wise totals if no specific exam is requested
    if (!examId && result.rows.length > 0) {
      const examTotals = result.rows.reduce((acc: any, row: any) => {
        if (!acc[row.exam_id]) {
          acc[row.exam_id] = {
            exam_id: row.exam_id,
            exam_name: row.exam_name,
            exam_date: row.exam_date,
            exam_type: row.exam_type,
            total_marks_obtained: 0,
            total_max_marks: 0,
            subjects: []
          };
        }
        acc[row.exam_id].total_marks_obtained += parseFloat(row.marks_obtained);
        acc[row.exam_id].total_max_marks += parseFloat(row.max_marks);
        acc[row.exam_id].subjects.push({
          subject_name: row.subject_name,
          subject_code: row.subject_code,
          marks_obtained: row.marks_obtained,
          max_marks: row.max_marks,
          grade: row.grade,
          percentage: row.percentage
        });
        return acc;
      }, {});

      const examResults = Object.values(examTotals).map((exam: any) => ({
        ...exam,
        overall_percentage: ((exam.total_marks_obtained / exam.total_max_marks) * 100).toFixed(2)
      }));

      res.status(200).json(successResponse({
        examResults,
        allMarks: result.rows
      }, 'Marks retrieved successfully'));
    } else {
      res.status(200).json(successResponse(result.rows, 'Marks retrieved successfully'));
    }
  } catch (error) {
    next(error);
  }
};

export const getFees = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const studentId = req.user!.id;
    const schoolId = req.user!.school_id;

    // Get fee structure for student
    const feeStructureQuery = `
      SELECT 
        fs.*,
        ft.name as fee_type_name,
        ft.description as fee_type_description
      FROM fee_structure fs
      JOIN fee_types ft ON fs.fee_type_id = ft.id
      JOIN students st ON fs.class_id = st.class_id
      WHERE st.user_id = $1 
        AND fs.school_id = $2
        AND fs.is_active = true
      ORDER BY ft.name
    `;

    const feeStructureResult = await pool.query(feeStructureQuery, [studentId, schoolId]);

    // Get payment history
    const paymentsQuery = `
      SELECT 
        fp.*,
        ft.name as fee_type_name
      FROM fee_payments fp
      JOIN fee_types ft ON fp.fee_type_id = ft.id
      WHERE fp.student_id = $1 
        AND fp.school_id = $2
      ORDER BY fp.payment_date DESC
    `;

    const paymentsResult = await pool.query(paymentsQuery, [studentId, schoolId]);

    // Calculate total fees, paid, and dues
    const totalFees = feeStructureResult.rows.reduce((sum, row) => sum + parseFloat(row.amount), 0);
    const totalPaid = paymentsResult.rows
      .filter(row => row.status === 'completed')
      .reduce((sum, row) => sum + parseFloat(row.amount), 0);
    const totalDue = totalFees - totalPaid;

    res.status(200).json(successResponse({
      summary: {
        total_fees: totalFees,
        total_paid: totalPaid,
        total_due: totalDue
      },
      feeStructure: feeStructureResult.rows,
      payments: paymentsResult.rows
    }, 'Fee details retrieved successfully'));
  } catch (error) {
    next(error);
  }
};

export const getAnnouncements = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const studentId = req.user!.id;
    const schoolId = req.user!.school_id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;

    // Get student's class and section for targeted announcements
    const studentInfoQuery = `
      SELECT class_id, section_id FROM students WHERE user_id = $1
    `;
    const studentInfo = await pool.query(studentInfoQuery, [studentId]);

    if (studentInfo.rows.length === 0) {
      res.status(404).json(errorResponse('Student information not found'));
      return;
    }

    const { class_id, section_id } = studentInfo.rows[0];

    const query = `
      SELECT 
        a.*,
        u.name as created_by_name
      FROM announcements a
      JOIN users u ON a.created_by = u.id
      WHERE a.school_id = $1
        AND a.is_published = true
        AND (
          a.target_audience = 'all' 
          OR a.target_audience = 'students'
          OR (a.target_audience = 'class' AND a.target_class_id = $2)
          OR (a.target_audience = 'section' AND a.target_section_id = $3)
        )
        AND (a.expires_at IS NULL OR a.expires_at > CURRENT_TIMESTAMP)
      ORDER BY a.created_at DESC
      LIMIT $4 OFFSET $5
    `;

    const result = await pool.query(query, [schoolId, class_id, section_id, limit, offset]);

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM announcements a
      WHERE a.school_id = $1
        AND a.is_published = true
        AND (
          a.target_audience = 'all' 
          OR a.target_audience = 'students'
          OR (a.target_audience = 'class' AND a.target_class_id = $2)
          OR (a.target_audience = 'section' AND a.target_section_id = $3)
        )
        AND (a.expires_at IS NULL OR a.expires_at > CURRENT_TIMESTAMP)
    `;

    const countResult = await pool.query(countQuery, [schoolId, class_id, section_id]);
    const total = parseInt(countResult.rows[0].total);

    res.status(200).json(successResponse({
      announcements: result.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    }, 'Announcements retrieved successfully'));
  } catch (error) {
    next(error);
  }
};
