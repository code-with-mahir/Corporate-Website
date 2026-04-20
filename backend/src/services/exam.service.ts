import { pool } from '../config/database';

interface ExamData {
  name: string;
  academic_year_id: string;
  class_id: string;
  exam_type?: string;
  start_date?: string;
  end_date?: string;
  description?: string;
  total_marks?: number;
  passing_marks?: number;
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
    exams: T[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
  error?: string;
}

export const createExam = async (
  schoolId: string,
  data: ExamData
): Promise<ServiceResponse> => {
  const client = await pool.connect();

  try {
    const query = `
      INSERT INTO exams (
        school_id, name, academic_year_id, class_id,
        exam_type, start_date, end_date, description,
        total_marks, passing_marks
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;

    const values = [
      schoolId,
      data.name,
      data.academic_year_id,
      data.class_id,
      data.exam_type || null,
      data.start_date || null,
      data.end_date || null,
      data.description || null,
      data.total_marks || null,
      data.passing_marks || null,
    ];

    const result = await client.query(query, values);

    return {
      success: true,
      data: result.rows[0],
      message: 'Exam created successfully',
    };
  } catch (error: any) {
    console.error('Error creating exam:', error);
    return {
      success: false,
      error: error.message || 'Failed to create exam',
    };
  } finally {
    client.release();
  }
};

export const getExams = async (
  schoolId: string,
  academicYearId?: string,
  classId?: string,
  page: number = 1,
  limit: number = 10
): Promise<PaginatedResponse<any>> => {
  const client = await pool.connect();

  try {
    const offset = (page - 1) * limit;

    let query = `
      SELECT e.*, 
        ay.year_name,
        c.name as class_name, c.section
      FROM exams e
      LEFT JOIN academic_years ay ON e.academic_year_id = ay.id
      LEFT JOIN classes c ON e.class_id = c.id
      WHERE e.school_id = $1
    `;

    const values: any[] = [schoolId];
    let paramCount = 2;

    if (academicYearId) {
      query += ` AND e.academic_year_id = $${paramCount++}`;
      values.push(academicYearId);
    }

    if (classId) {
      query += ` AND e.class_id = $${paramCount++}`;
      values.push(classId);
    }

    query += ` ORDER BY e.start_date DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    values.push(limit, offset);

    const result = await client.query(query, values);

    let countQuery = `SELECT COUNT(*) FROM exams WHERE school_id = $1`;
    const countValues: any[] = [schoolId];
    let countParam = 2;

    if (academicYearId) {
      countQuery += ` AND academic_year_id = $${countParam++}`;
      countValues.push(academicYearId);
    }

    if (classId) {
      countQuery += ` AND class_id = $${countParam++}`;
      countValues.push(classId);
    }

    const countResult = await client.query(countQuery, countValues);
    const total = parseInt(countResult.rows[0].count);

    return {
      success: true,
      data: {
        exams: result.rows,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    };
  } catch (error: any) {
    console.error('Error getting exams:', error);
    return {
      success: false,
      error: error.message || 'Failed to get exams',
    };
  } finally {
    client.release();
  }
};

export const getExamById = async (
  schoolId: string,
  examId: string
): Promise<ServiceResponse> => {
  const client = await pool.connect();

  try {
    const query = `
      SELECT e.*, 
        ay.year_name,
        c.name as class_name, c.section
      FROM exams e
      LEFT JOIN academic_years ay ON e.academic_year_id = ay.id
      LEFT JOIN classes c ON e.class_id = c.id
      WHERE e.id = $1 AND e.school_id = $2
    `;

    const result = await client.query(query, [examId, schoolId]);

    if (result.rows.length === 0) {
      return {
        success: false,
        error: 'Exam not found',
      };
    }

    return {
      success: true,
      data: result.rows[0],
    };
  } catch (error: any) {
    console.error('Error getting exam:', error);
    return {
      success: false,
      error: error.message || 'Failed to get exam',
    };
  } finally {
    client.release();
  }
};

export const updateExam = async (
  schoolId: string,
  examId: string,
  data: Partial<ExamData>
): Promise<ServiceResponse> => {
  const client = await pool.connect();

  try {
    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (data.name !== undefined) {
      fields.push(`name = $${paramCount++}`);
      values.push(data.name);
    }
    if (data.academic_year_id !== undefined) {
      fields.push(`academic_year_id = $${paramCount++}`);
      values.push(data.academic_year_id);
    }
    if (data.class_id !== undefined) {
      fields.push(`class_id = $${paramCount++}`);
      values.push(data.class_id);
    }
    if (data.exam_type !== undefined) {
      fields.push(`exam_type = $${paramCount++}`);
      values.push(data.exam_type);
    }
    if (data.start_date !== undefined) {
      fields.push(`start_date = $${paramCount++}`);
      values.push(data.start_date);
    }
    if (data.end_date !== undefined) {
      fields.push(`end_date = $${paramCount++}`);
      values.push(data.end_date);
    }
    if (data.description !== undefined) {
      fields.push(`description = $${paramCount++}`);
      values.push(data.description);
    }
    if (data.total_marks !== undefined) {
      fields.push(`total_marks = $${paramCount++}`);
      values.push(data.total_marks);
    }
    if (data.passing_marks !== undefined) {
      fields.push(`passing_marks = $${paramCount++}`);
      values.push(data.passing_marks);
    }

    if (fields.length === 0) {
      return {
        success: false,
        error: 'No fields to update',
      };
    }

    fields.push(`updated_at = CURRENT_TIMESTAMP`);

    const query = `
      UPDATE exams
      SET ${fields.join(', ')}
      WHERE id = $${paramCount} AND school_id = $${paramCount + 1}
      RETURNING *
    `;

    values.push(examId, schoolId);

    const result = await client.query(query, values);

    if (result.rows.length === 0) {
      return {
        success: false,
        error: 'Exam not found',
      };
    }

    return {
      success: true,
      data: result.rows[0],
      message: 'Exam updated successfully',
    };
  } catch (error: any) {
    console.error('Error updating exam:', error);
    return {
      success: false,
      error: error.message || 'Failed to update exam',
    };
  } finally {
    client.release();
  }
};

export const deleteExam = async (
  schoolId: string,
  examId: string
): Promise<ServiceResponse> => {
  const client = await pool.connect();

  try {
    const query = `
      DELETE FROM exams
      WHERE id = $1 AND school_id = $2
      RETURNING id
    `;

    const result = await client.query(query, [examId, schoolId]);

    if (result.rows.length === 0) {
      return {
        success: false,
        error: 'Exam not found',
      };
    }

    return {
      success: true,
      message: 'Exam deleted successfully',
    };
  } catch (error: any) {
    console.error('Error deleting exam:', error);
    return {
      success: false,
      error: error.message || 'Failed to delete exam',
    };
  } finally {
    client.release();
  }
};
