import { pool } from '../config/database';

interface PromotionData {
  to_class_id: string;
  to_section_id?: string;
  academic_year_id: string;
  remarks?: string;
}

interface ServiceResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

interface PaginatedResponse<T> {
  success: boolean;
  data?: {
    logs: T[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
  error?: string;
}

export const runPromotion = async (
  schoolId: string,
  fromClassId: string,
  toClassId: string,
  academicYearId: string,
  nextAcademicYearId: string,
  minPercentage: number
): Promise<ServiceResponse> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const studentsResult = await client.query(
      `SELECT DISTINCT s.* 
       FROM students s
       WHERE s.class_id = $1 
         AND s.academic_year_id = $2 
         AND s.school_id = $3
         AND s.status = 'active'`,
      [fromClassId, academicYearId, schoolId]
    );

    const students = studentsResult.rows;
    const promotedStudents = [];
    const failedStudents = [];

    for (const student of students) {
      const examsResult = await client.query(
        `SELECT DISTINCT e.id 
         FROM exams e
         WHERE e.class_id = $1 
           AND e.academic_year_id = $2 
           AND e.school_id = $3
           AND e.exam_type = 'final'`,
        [fromClassId, academicYearId, schoolId]
      );

      if (examsResult.rows.length === 0) {
        failedStudents.push({
          student_id: student.id,
          reason: 'No final exam found'
        });
        continue;
      }

      const examId = examsResult.rows[0].id;
      const percentage = await calculateStudentPercentage(schoolId, student.id, examId);

      if (percentage >= minPercentage) {
        await client.query(
          `UPDATE students 
           SET class_id = $1, academic_year_id = $2, updated_at = CURRENT_TIMESTAMP
           WHERE id = $3 AND school_id = $4`,
          [toClassId, nextAcademicYearId, student.id, schoolId]
        );

        await client.query(
          `INSERT INTO promotion_logs (student_id, from_class_id, to_class_id, from_academic_year_id, to_academic_year_id, percentage, status, school_id)
           VALUES ($1, $2, $3, $4, $5, $6, 'promoted', $7)`,
          [student.id, fromClassId, toClassId, academicYearId, nextAcademicYearId, percentage, schoolId]
        );

        promotedStudents.push({
          student_id: student.id,
          percentage
        });
      } else {
        await client.query(
          `INSERT INTO promotion_logs (student_id, from_class_id, to_class_id, from_academic_year_id, to_academic_year_id, percentage, status, remarks, school_id)
           VALUES ($1, $2, $3, $4, $5, $6, 'failed', 'Did not meet minimum percentage', $7)`,
          [student.id, fromClassId, toClassId, academicYearId, nextAcademicYearId, percentage, schoolId]
        );

        failedStudents.push({
          student_id: student.id,
          percentage
        });
      }
    }

    await client.query('COMMIT');

    return {
      success: true,
      data: {
        promoted: promotedStudents,
        failed: failedStudents,
        summary: {
          total: students.length,
          promoted_count: promotedStudents.length,
          failed_count: failedStudents.length
        }
      },
      message: `Promotion completed: ${promotedStudents.length} promoted, ${failedStudents.length} failed`
    };
  } catch (error: any) {
    await client.query('ROLLBACK');
    return {
      success: false,
      error: error.message || 'Failed to run promotion'
    };
  } finally {
    client.release();
  }
};

export const promoteStudent = async (
  schoolId: string,
  studentId: string,
  data: PromotionData
): Promise<ServiceResponse> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const studentResult = await client.query(
      'SELECT * FROM students WHERE id = $1 AND school_id = $2',
      [studentId, schoolId]
    );

    if (studentResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return {
        success: false,
        error: 'Student not found'
      };
    }

    const student = studentResult.rows[0];
    const fromClassId = student.class_id;
    const fromAcademicYearId = student.academic_year_id;

    await client.query(
      `UPDATE students 
       SET class_id = $1, section_id = $2, academic_year_id = $3, updated_at = CURRENT_TIMESTAMP
       WHERE id = $4 AND school_id = $5`,
      [data.to_class_id, data.to_section_id || null, data.academic_year_id, studentId, schoolId]
    );

    await client.query(
      `INSERT INTO promotion_logs (student_id, from_class_id, to_class_id, from_academic_year_id, to_academic_year_id, status, remarks, school_id)
       VALUES ($1, $2, $3, $4, $5, 'promoted', $6, $7)`,
      [studentId, fromClassId, data.to_class_id, fromAcademicYearId, data.academic_year_id, data.remarks || 'Manual promotion', schoolId]
    );

    await client.query('COMMIT');

    return {
      success: true,
      message: 'Student promoted successfully'
    };
  } catch (error: any) {
    await client.query('ROLLBACK');
    return {
      success: false,
      error: error.message || 'Failed to promote student'
    };
  } finally {
    client.release();
  }
};

export const getPromotionLogs = async (
  schoolId: string,
  academicYearId: string,
  page: number = 1,
  limit: number = 50
): Promise<PaginatedResponse<any>> => {
  const client = await pool.connect();
  try {
    const offset = (page - 1) * limit;

    const countResult = await client.query(
      `SELECT COUNT(*) FROM promotion_logs WHERE school_id = $1 AND from_academic_year_id = $2`,
      [schoolId, academicYearId]
    );
    const total = parseInt(countResult.rows[0].count);

    const result = await client.query(
      `SELECT pl.*, 
              u.full_name as student_name,
              fc.name as from_class_name,
              tc.name as to_class_name,
              fay.year as from_academic_year,
              tay.year as to_academic_year
       FROM promotion_logs pl
       JOIN students s ON pl.student_id = s.id
       JOIN users u ON s.user_id = u.id
       JOIN classes fc ON pl.from_class_id = fc.id
       JOIN classes tc ON pl.to_class_id = tc.id
       JOIN academic_years fay ON pl.from_academic_year_id = fay.id
       JOIN academic_years tay ON pl.to_academic_year_id = tay.id
       WHERE pl.school_id = $1 AND pl.from_academic_year_id = $2
       ORDER BY pl.created_at DESC
       LIMIT $3 OFFSET $4`,
      [schoolId, academicYearId, limit, offset]
    );

    return {
      success: true,
      data: {
        logs: result.rows,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      }
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to fetch promotion logs'
    };
  } finally {
    client.release();
  }
};

export const calculateStudentPercentage = async (
  schoolId: string,
  studentId: string,
  examId: string
): Promise<number> => {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT 
         SUM(marks_obtained) as total_obtained,
         SUM(total_marks) as total_maximum
       FROM marks
       WHERE student_id = $1 
         AND exam_id = $2 
         AND school_id = $3`,
      [studentId, examId, schoolId]
    );

    if (result.rows.length === 0 || !result.rows[0].total_maximum) {
      return 0;
    }

    const totalObtained = parseFloat(result.rows[0].total_obtained) || 0;
    const totalMaximum = parseFloat(result.rows[0].total_maximum) || 1;

    return (totalObtained / totalMaximum) * 100;
  } catch (error: any) {
    return 0;
  } finally {
    client.release();
  }
};
