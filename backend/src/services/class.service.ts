import { pool } from '../config/database';

interface ClassData {
  name: string;
  section?: string;
  capacity?: number;
  description?: string;
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
    classes: T[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
  error?: string;
}

export const createClass = async (
  schoolId: string,
  academicYearId: string,
  data: ClassData
): Promise<ServiceResponse> => {
  const client = await pool.connect();

  try {
    const query = `
      INSERT INTO classes (school_id, academic_year_id, name, section, capacity, description)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

    const values = [
      schoolId,
      academicYearId,
      data.name,
      data.section || null,
      data.capacity || null,
      data.description || null,
    ];

    const result = await client.query(query, values);

    return {
      success: true,
      data: result.rows[0],
      message: 'Class created successfully',
    };
  } catch (error: any) {
    console.error('Error creating class:', error);
    return {
      success: false,
      error: error.message || 'Failed to create class',
    };
  } finally {
    client.release();
  }
};

export const getClasses = async (
  schoolId: string,
  academicYearId?: string,
  page: number = 1,
  limit: number = 10
): Promise<PaginatedResponse<any>> => {
  const client = await pool.connect();

  try {
    const offset = (page - 1) * limit;

    let query = `
      SELECT c.*, ay.year_name, ay.start_date, ay.end_date
      FROM classes c
      LEFT JOIN academic_years ay ON c.academic_year_id = ay.id
      WHERE c.school_id = $1
    `;

    const values: any[] = [schoolId];

    if (academicYearId) {
      query += ` AND c.academic_year_id = $${values.length + 1}`;
      values.push(academicYearId);
    }

    query += ` ORDER BY c.name, c.section LIMIT $${values.length + 1} OFFSET $${values.length + 2}`;
    values.push(limit, offset);

    const result = await client.query(query, values);

    let countQuery = `SELECT COUNT(*) FROM classes WHERE school_id = $1`;
    const countValues: any[] = [schoolId];

    if (academicYearId) {
      countQuery += ` AND academic_year_id = $2`;
      countValues.push(academicYearId);
    }

    const countResult = await client.query(countQuery, countValues);
    const total = parseInt(countResult.rows[0].count);

    return {
      success: true,
      data: {
        classes: result.rows,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    };
  } catch (error: any) {
    console.error('Error getting classes:', error);
    return {
      success: false,
      error: error.message || 'Failed to get classes',
    };
  } finally {
    client.release();
  }
};

export const getClassById = async (
  schoolId: string,
  classId: string
): Promise<ServiceResponse> => {
  const client = await pool.connect();

  try {
    const query = `
      SELECT c.*, ay.year_name, ay.start_date, ay.end_date,
        (SELECT COUNT(*) FROM students WHERE class_id = c.id) as student_count
      FROM classes c
      LEFT JOIN academic_years ay ON c.academic_year_id = ay.id
      WHERE c.id = $1 AND c.school_id = $2
    `;

    const result = await client.query(query, [classId, schoolId]);

    if (result.rows.length === 0) {
      return {
        success: false,
        error: 'Class not found',
      };
    }

    return {
      success: true,
      data: result.rows[0],
    };
  } catch (error: any) {
    console.error('Error getting class:', error);
    return {
      success: false,
      error: error.message || 'Failed to get class',
    };
  } finally {
    client.release();
  }
};

export const updateClass = async (
  schoolId: string,
  classId: string,
  data: Partial<ClassData>
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
    if (data.section !== undefined) {
      fields.push(`section = $${paramCount++}`);
      values.push(data.section);
    }
    if (data.capacity !== undefined) {
      fields.push(`capacity = $${paramCount++}`);
      values.push(data.capacity);
    }
    if (data.description !== undefined) {
      fields.push(`description = $${paramCount++}`);
      values.push(data.description);
    }

    if (fields.length === 0) {
      return {
        success: false,
        error: 'No fields to update',
      };
    }

    fields.push(`updated_at = CURRENT_TIMESTAMP`);

    const query = `
      UPDATE classes
      SET ${fields.join(', ')}
      WHERE id = $${paramCount} AND school_id = $${paramCount + 1}
      RETURNING *
    `;

    values.push(classId, schoolId);

    const result = await client.query(query, values);

    if (result.rows.length === 0) {
      return {
        success: false,
        error: 'Class not found',
      };
    }

    return {
      success: true,
      data: result.rows[0],
      message: 'Class updated successfully',
    };
  } catch (error: any) {
    console.error('Error updating class:', error);
    return {
      success: false,
      error: error.message || 'Failed to update class',
    };
  } finally {
    client.release();
  }
};

export const deleteClass = async (
  schoolId: string,
  classId: string
): Promise<ServiceResponse> => {
  const client = await pool.connect();

  try {
    const checkQuery = `
      SELECT COUNT(*) as student_count FROM students WHERE class_id = $1
    `;
    const checkResult = await client.query(checkQuery, [classId]);

    if (parseInt(checkResult.rows[0].student_count) > 0) {
      return {
        success: false,
        error: 'Cannot delete class with enrolled students',
      };
    }

    const query = `
      DELETE FROM classes
      WHERE id = $1 AND school_id = $2
      RETURNING id
    `;

    const result = await client.query(query, [classId, schoolId]);

    if (result.rows.length === 0) {
      return {
        success: false,
        error: 'Class not found',
      };
    }

    return {
      success: true,
      message: 'Class deleted successfully',
    };
  } catch (error: any) {
    console.error('Error deleting class:', error);
    return {
      success: false,
      error: error.message || 'Failed to delete class',
    };
  } finally {
    client.release();
  }
};
