import { pool } from '../config/database';

interface MarkData {
  marks_obtained: number;
  total_marks: number;
  remarks?: string;
}

interface MarkRecord {
  student_id: string;
  subject_id: string;
  marks_obtained: number;
  total_marks: number;
  remarks?: string;
}

interface MarkFilters {
  examId?: string;
  studentId?: string;
  subjectId?: string;
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
    marks: T[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
  error?: string;
}

export const createMark = async (
  schoolId: string,
  examId: string,
  studentId: string,
  subjectId: string,
  data: MarkData
): Promise<ServiceResponse> => {
  const client = await pool.connect();
  try {
    const grade = calculateGrade(data.marks_obtained, data.total_marks);

    const result = await client.query(
      `INSERT INTO marks (exam_id, student_id, subject_id, marks_obtained, total_marks, grade, remarks, school_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [examId, studentId, subjectId, data.marks_obtained, data.total_marks, grade, data.remarks || null, schoolId]
    );

    return {
      success: true,
      data: result.rows[0],
      message: 'Mark created successfully'
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to create mark'
    };
  } finally {
    client.release();
  }
};

export const bulkCreateMarks = async (
  schoolId: string,
  examId: string,
  markRecords: MarkRecord[]
): Promise<ServiceResponse> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const createdMarks = [];
    for (const record of markRecords) {
      const grade = calculateGrade(record.marks_obtained, record.total_marks);

      const result = await client.query(
        `INSERT INTO marks (exam_id, student_id, subject_id, marks_obtained, total_marks, grade, remarks, school_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [examId, record.student_id, record.subject_id, record.marks_obtained, record.total_marks, grade, record.remarks || null, schoolId]
      );

      createdMarks.push(result.rows[0]);
    }

    await client.query('COMMIT');

    return {
      success: true,
      data: createdMarks,
      message: `${createdMarks.length} marks created successfully`
    };
  } catch (error: any) {
    await client.query('ROLLBACK');
    return {
      success: false,
      error: error.message || 'Failed to bulk create marks'
    };
  } finally {
    client.release();
  }
};

export const getMarks = async (
  schoolId: string,
  filters: MarkFilters = {},
  page: number = 1,
  limit: number = 50
): Promise<PaginatedResponse<any>> => {
  const client = await pool.connect();
  try {
    const offset = (page - 1) * limit;
    const conditions = ['m.school_id = $1'];
    const params: any[] = [schoolId];
    let paramIndex = 2;

    if (filters.examId) {
      conditions.push(`m.exam_id = $${paramIndex}`);
      params.push(filters.examId);
      paramIndex++;
    }

    if (filters.studentId) {
      conditions.push(`m.student_id = $${paramIndex}`);
      params.push(filters.studentId);
      paramIndex++;
    }

    if (filters.subjectId) {
      conditions.push(`m.subject_id = $${paramIndex}`);
      params.push(filters.subjectId);
      paramIndex++;
    }

    const whereClause = conditions.join(' AND ');

    const countResult = await client.query(
      `SELECT COUNT(*) FROM marks m WHERE ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    const result = await client.query(
      `SELECT m.*, 
              u.full_name as student_name,
              s.name as subject_name,
              e.name as exam_name
       FROM marks m
       JOIN students st ON m.student_id = st.id
       JOIN users u ON st.user_id = u.id
       JOIN subjects s ON m.subject_id = s.id
       JOIN exams e ON m.exam_id = e.id
       WHERE ${whereClause}
       ORDER BY m.created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    );

    return {
      success: true,
      data: {
        marks: result.rows,
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
      error: error.message || 'Failed to fetch marks'
    };
  } finally {
    client.release();
  }
};

export const updateMark = async (
  schoolId: string,
  markId: string,
  data: Partial<MarkData>
): Promise<ServiceResponse> => {
  const client = await pool.connect();
  try {
    const checkResult = await client.query(
      'SELECT * FROM marks WHERE id = $1 AND school_id = $2',
      [markId, schoolId]
    );

    if (checkResult.rows.length === 0) {
      return {
        success: false,
        error: 'Mark not found'
      };
    }

    const currentMark = checkResult.rows[0];
    const marksObtained = data.marks_obtained ?? currentMark.marks_obtained;
    const totalMarks = data.total_marks ?? currentMark.total_marks;
    const grade = calculateGrade(marksObtained, totalMarks);

    const result = await client.query(
      `UPDATE marks 
       SET marks_obtained = $1, total_marks = $2, grade = $3, remarks = $4, updated_at = CURRENT_TIMESTAMP
       WHERE id = $5 AND school_id = $6
       RETURNING *`,
      [marksObtained, totalMarks, grade, data.remarks ?? currentMark.remarks, markId, schoolId]
    );

    return {
      success: true,
      data: result.rows[0],
      message: 'Mark updated successfully'
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to update mark'
    };
  } finally {
    client.release();
  }
};

export const getStudentMarks = async (
  schoolId: string,
  studentId: string,
  academicYearId: string
): Promise<ServiceResponse> => {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT m.*, 
              s.name as subject_name,
              e.name as exam_name,
              e.exam_type,
              e.exam_date
       FROM marks m
       JOIN subjects s ON m.subject_id = s.id
       JOIN exams e ON m.exam_id = e.id
       WHERE m.student_id = $1 
         AND m.school_id = $2
         AND e.academic_year_id = $3
       ORDER BY e.exam_date DESC, s.name ASC`,
      [studentId, schoolId, academicYearId]
    );

    return {
      success: true,
      data: result.rows
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to fetch student marks'
    };
  } finally {
    client.release();
  }
};

export const calculateGrade = (marksObtained: number, totalMarks: number): string => {
  if (totalMarks === 0) return 'N/A';
  
  const percentage = (marksObtained / totalMarks) * 100;

  if (percentage >= 90) return 'A+';
  if (percentage >= 80) return 'A';
  if (percentage >= 70) return 'B+';
  if (percentage >= 60) return 'B';
  if (percentage >= 50) return 'C+';
  if (percentage >= 40) return 'C';
  if (percentage >= 33) return 'D';
  return 'F';
};
