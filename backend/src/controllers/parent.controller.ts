import { Request, Response, NextFunction } from 'express';
import { successResponse, errorResponse } from '../utils/response';
import { pool } from '../config/database';

export const getChildren = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const parentId = req.user!.id;
    const schoolId = req.user!.school_id;

    const query = `
      SELECT 
        u.id,
        u.name,
        u.email,
        u.phone,
        u.date_of_birth,
        u.gender,
        st.roll_number,
        st.admission_number,
        st.blood_group,
        c.id as class_id,
        c.name as class_name,
        s.id as section_id,
        s.name as section_name
      FROM parent_student_links psl
      JOIN users u ON psl.student_id = u.id
      JOIN students st ON u.id = st.user_id
      JOIN classes c ON st.class_id = c.id
      LEFT JOIN sections s ON st.section_id = s.id
      WHERE psl.parent_id = $1 
        AND psl.school_id = $2
        AND psl.is_active = true
      ORDER BY u.name
    `;

    const result = await pool.query(query, [parentId, schoolId]);

    res.status(200).json(successResponse(result.rows, 'Children retrieved successfully'));
  } catch (error) {
    next(error);
  }
};

export const getChildAttendance = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const parentId = req.user!.id;
    const schoolId = req.user!.school_id;
    const { childId } = req.params;
    const { startDate, endDate, subjectId } = req.query;

    if (!childId) {
      res.status(400).json(errorResponse('Child ID is required'));
      return;
    }

    // Verify parent-child relationship
    const linkCheck = `
      SELECT id FROM parent_student_links
      WHERE parent_id = $1 
        AND student_id = $2 
        AND school_id = $3
        AND is_active = true
      LIMIT 1
    `;

    const linkResult = await pool.query(linkCheck, [parentId, childId, schoolId]);

    if (linkResult.rows.length === 0) {
      res.status(403).json(errorResponse('You are not authorized to view this child\'s attendance'));
      return;
    }

    // Overall attendance summary
    let summaryQuery = `
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

    const summaryParams: any[] = [childId, schoolId];
    let summaryParamCount = 2;

    if (startDate) {
      summaryParamCount++;
      summaryQuery += ` AND date >= $${summaryParamCount}`;
      summaryParams.push(startDate);
    }

    if (endDate) {
      summaryParamCount++;
      summaryQuery += ` AND date <= $${summaryParamCount}`;
      summaryParams.push(endDate);
    }

    const summaryResult = await pool.query(summaryQuery, summaryParams);

    // Detailed attendance records
    let detailQuery = `
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

    const detailParams: any[] = [childId, schoolId];
    let detailParamCount = 2;

    if (startDate) {
      detailParamCount++;
      detailQuery += ` AND a.date >= $${detailParamCount}`;
      detailParams.push(startDate);
    }

    if (endDate) {
      detailParamCount++;
      detailQuery += ` AND a.date <= $${detailParamCount}`;
      detailParams.push(endDate);
    }

    if (subjectId) {
      detailParamCount++;
      detailQuery += ` AND a.subject_id = $${detailParamCount}`;
      detailParams.push(subjectId);
    }

    detailQuery += ` ORDER BY a.date DESC`;

    const detailResult = await pool.query(detailQuery, detailParams);

    res.status(200).json(successResponse({
      summary: summaryResult.rows[0],
      records: detailResult.rows
    }, 'Child attendance retrieved successfully'));
  } catch (error) {
    next(error);
  }
};

export const getChildMarks = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const parentId = req.user!.id;
    const schoolId = req.user!.school_id;
    const { childId } = req.params;
    const { examId } = req.query;

    if (!childId) {
      res.status(400).json(errorResponse('Child ID is required'));
      return;
    }

    // Verify parent-child relationship
    const linkCheck = `
      SELECT id FROM parent_student_links
      WHERE parent_id = $1 
        AND student_id = $2 
        AND school_id = $3
        AND is_active = true
      LIMIT 1
    `;

    const linkResult = await pool.query(linkCheck, [parentId, childId, schoolId]);

    if (linkResult.rows.length === 0) {
      res.status(403).json(errorResponse('You are not authorized to view this child\'s marks'));
      return;
    }

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

    const params: any[] = [childId, schoolId];

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
      }, 'Child marks retrieved successfully'));
    } else {
      res.status(200).json(successResponse(result.rows, 'Child marks retrieved successfully'));
    }
  } catch (error) {
    next(error);
  }
};

export const getChildFees = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const parentId = req.user!.id;
    const schoolId = req.user!.school_id;
    const { childId } = req.params;

    if (!childId) {
      res.status(400).json(errorResponse('Child ID is required'));
      return;
    }

    // Verify parent-child relationship
    const linkCheck = `
      SELECT id FROM parent_student_links
      WHERE parent_id = $1 
        AND student_id = $2 
        AND school_id = $3
        AND is_active = true
      LIMIT 1
    `;

    const linkResult = await pool.query(linkCheck, [parentId, childId, schoolId]);

    if (linkResult.rows.length === 0) {
      res.status(403).json(errorResponse('You are not authorized to view this child\'s fees'));
      return;
    }

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

    const feeStructureResult = await pool.query(feeStructureQuery, [childId, schoolId]);

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

    const paymentsResult = await pool.query(paymentsQuery, [childId, schoolId]);

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
    }, 'Child fee details retrieved successfully'));
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
    const parentId = req.user!.id;
    const schoolId = req.user!.school_id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;

    // Get parent's children classes/sections for targeted announcements
    const childrenQuery = `
      SELECT DISTINCT st.class_id, st.section_id
      FROM parent_student_links psl
      JOIN students st ON psl.student_id = st.user_id
      WHERE psl.parent_id = $1 
        AND psl.school_id = $2
        AND psl.is_active = true
    `;

    const childrenResult = await pool.query(childrenQuery, [parentId, schoolId]);
    const classIds = childrenResult.rows.map(row => row.class_id);
    const sectionIds = childrenResult.rows.map(row => row.section_id).filter(id => id !== null);

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
          OR a.target_audience = 'parents'
          OR (a.target_audience = 'class' AND a.target_class_id = ANY($2::uuid[]))
          OR (a.target_audience = 'section' AND a.target_section_id = ANY($3::uuid[]))
        )
        AND (a.expires_at IS NULL OR a.expires_at > CURRENT_TIMESTAMP)
      ORDER BY a.created_at DESC
      LIMIT $4 OFFSET $5
    `;

    const result = await pool.query(query, [
      schoolId, 
      classIds.length > 0 ? classIds : [null],
      sectionIds.length > 0 ? sectionIds : [null],
      limit, 
      offset
    ]);

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM announcements a
      WHERE a.school_id = $1
        AND a.is_published = true
        AND (
          a.target_audience = 'all' 
          OR a.target_audience = 'parents'
          OR (a.target_audience = 'class' AND a.target_class_id = ANY($2::uuid[]))
          OR (a.target_audience = 'section' AND a.target_section_id = ANY($3::uuid[]))
        )
        AND (a.expires_at IS NULL OR a.expires_at > CURRENT_TIMESTAMP)
    `;

    const countResult = await pool.query(countQuery, [
      schoolId,
      classIds.length > 0 ? classIds : [null],
      sectionIds.length > 0 ? sectionIds : [null]
    ]);
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
