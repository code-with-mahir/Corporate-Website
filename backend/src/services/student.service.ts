import { pool } from '../config/database';
import { hashPassword } from './auth.service';

interface StudentData {
  user_data: {
    email: string;
    password: string;
    full_name: string;
    phone?: string;
  };
  class_id: string;
  section_id?: string;
  academic_year_id: string;
  admission_number: string;
  date_of_birth?: string;
  gender?: string;
  blood_group?: string;
  address?: string;
  guardian_name?: string;
  guardian_phone?: string;
  guardian_email?: string;
}

interface StudentFilters {
  classId?: string;
  sectionId?: string;
  academicYearId?: string;
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
    students: T[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
  error?: string;
}

export const createStudent = async (
  schoolId: string,
  data: StudentData
): Promise<ServiceResponse> => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const hashedPassword = await hashPassword(data.user_data.password);

    const userQuery = `
      INSERT INTO users (email, password, full_name, phone, role, school_id)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id
    `;

    const userValues = [
      data.user_data.email,
      hashedPassword,
      data.user_data.full_name,
      data.user_data.phone || null,
      'student',
      schoolId,
    ];

    const userResult = await client.query(userQuery, userValues);
    const userId = userResult.rows[0].id;

    const studentQuery = `
      INSERT INTO students (
        user_id, school_id, class_id, section_id, academic_year_id,
        admission_number, date_of_birth, gender, blood_group, address,
        guardian_name, guardian_phone, guardian_email
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `;

    const studentValues = [
      userId,
      schoolId,
      data.class_id,
      data.section_id || null,
      data.academic_year_id,
      data.admission_number,
      data.date_of_birth || null,
      data.gender || null,
      data.blood_group || null,
      data.address || null,
      data.guardian_name || null,
      data.guardian_phone || null,
      data.guardian_email || null,
    ];

    const studentResult = await client.query(studentQuery, studentValues);

    await client.query('COMMIT');

    return {
      success: true,
      data: {
        user_id: userId,
        student: studentResult.rows[0],
      },
      message: 'Student created successfully',
    };
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error creating student:', error);
    return {
      success: false,
      error: error.message || 'Failed to create student',
    };
  } finally {
    client.release();
  }
};

export const getStudents = async (
  schoolId: string,
  filters: StudentFilters = {},
  page: number = 1,
  limit: number = 10
): Promise<PaginatedResponse<any>> => {
  const client = await pool.connect();

  try {
    const offset = (page - 1) * limit;

    let query = `
      SELECT s.*, u.email, u.full_name, u.phone,
        c.name as class_name, c.section,
        ay.year_name
      FROM students s
      JOIN users u ON s.user_id = u.id
      LEFT JOIN classes c ON s.class_id = c.id
      LEFT JOIN academic_years ay ON s.academic_year_id = ay.id
      WHERE s.school_id = $1
    `;

    const values: any[] = [schoolId];
    let paramCount = 2;

    if (filters.classId) {
      query += ` AND s.class_id = $${paramCount++}`;
      values.push(filters.classId);
    }

    if (filters.sectionId) {
      query += ` AND s.section_id = $${paramCount++}`;
      values.push(filters.sectionId);
    }

    if (filters.academicYearId) {
      query += ` AND s.academic_year_id = $${paramCount++}`;
      values.push(filters.academicYearId);
    }

    query += ` ORDER BY u.full_name LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    values.push(limit, offset);

    const result = await client.query(query, values);

    let countQuery = `SELECT COUNT(*) FROM students WHERE school_id = $1`;
    const countValues: any[] = [schoolId];
    let countParam = 2;

    if (filters.classId) {
      countQuery += ` AND class_id = $${countParam++}`;
      countValues.push(filters.classId);
    }

    if (filters.sectionId) {
      countQuery += ` AND section_id = $${countParam++}`;
      countValues.push(filters.sectionId);
    }

    if (filters.academicYearId) {
      countQuery += ` AND academic_year_id = $${countParam++}`;
      countValues.push(filters.academicYearId);
    }

    const countResult = await client.query(countQuery, countValues);
    const total = parseInt(countResult.rows[0].count);

    return {
      success: true,
      data: {
        students: result.rows,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    };
  } catch (error: any) {
    console.error('Error getting students:', error);
    return {
      success: false,
      error: error.message || 'Failed to get students',
    };
  } finally {
    client.release();
  }
};

export const getStudentById = async (
  schoolId: string,
  studentId: string
): Promise<ServiceResponse> => {
  const client = await pool.connect();

  try {
    const query = `
      SELECT s.*, u.email, u.full_name, u.phone,
        c.name as class_name, c.section,
        ay.year_name
      FROM students s
      JOIN users u ON s.user_id = u.id
      LEFT JOIN classes c ON s.class_id = c.id
      LEFT JOIN academic_years ay ON s.academic_year_id = ay.id
      WHERE s.id = $1 AND s.school_id = $2
    `;

    const result = await client.query(query, [studentId, schoolId]);

    if (result.rows.length === 0) {
      return {
        success: false,
        error: 'Student not found',
      };
    }

    return {
      success: true,
      data: result.rows[0],
    };
  } catch (error: any) {
    console.error('Error getting student:', error);
    return {
      success: false,
      error: error.message || 'Failed to get student',
    };
  } finally {
    client.release();
  }
};

export const updateStudent = async (
  schoolId: string,
  studentId: string,
  data: Partial<StudentData>
): Promise<ServiceResponse> => {
  const client = await pool.connect();

  try {
    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (data.class_id !== undefined) {
      fields.push(`class_id = $${paramCount++}`);
      values.push(data.class_id);
    }
    if (data.section_id !== undefined) {
      fields.push(`section_id = $${paramCount++}`);
      values.push(data.section_id);
    }
    if (data.academic_year_id !== undefined) {
      fields.push(`academic_year_id = $${paramCount++}`);
      values.push(data.academic_year_id);
    }
    if (data.admission_number !== undefined) {
      fields.push(`admission_number = $${paramCount++}`);
      values.push(data.admission_number);
    }
    if (data.date_of_birth !== undefined) {
      fields.push(`date_of_birth = $${paramCount++}`);
      values.push(data.date_of_birth);
    }
    if (data.gender !== undefined) {
      fields.push(`gender = $${paramCount++}`);
      values.push(data.gender);
    }
    if (data.blood_group !== undefined) {
      fields.push(`blood_group = $${paramCount++}`);
      values.push(data.blood_group);
    }
    if (data.address !== undefined) {
      fields.push(`address = $${paramCount++}`);
      values.push(data.address);
    }
    if (data.guardian_name !== undefined) {
      fields.push(`guardian_name = $${paramCount++}`);
      values.push(data.guardian_name);
    }
    if (data.guardian_phone !== undefined) {
      fields.push(`guardian_phone = $${paramCount++}`);
      values.push(data.guardian_phone);
    }
    if (data.guardian_email !== undefined) {
      fields.push(`guardian_email = $${paramCount++}`);
      values.push(data.guardian_email);
    }

    if (fields.length === 0) {
      return {
        success: false,
        error: 'No fields to update',
      };
    }

    fields.push(`updated_at = CURRENT_TIMESTAMP`);

    const query = `
      UPDATE students
      SET ${fields.join(', ')}
      WHERE id = $${paramCount} AND school_id = $${paramCount + 1}
      RETURNING *
    `;

    values.push(studentId, schoolId);

    const result = await client.query(query, values);

    if (result.rows.length === 0) {
      return {
        success: false,
        error: 'Student not found',
      };
    }

    return {
      success: true,
      data: result.rows[0],
      message: 'Student updated successfully',
    };
  } catch (error: any) {
    console.error('Error updating student:', error);
    return {
      success: false,
      error: error.message || 'Failed to update student',
    };
  } finally {
    client.release();
  }
};

export const promoteStudent = async (
  schoolId: string,
  studentId: string,
  toClassId: string,
  toSectionId: string | null,
  nextAcademicYearId: string
): Promise<ServiceResponse> => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const checkQuery = `
      SELECT id FROM students WHERE id = $1 AND school_id = $2
    `;
    const checkResult = await client.query(checkQuery, [studentId, schoolId]);

    if (checkResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return {
        success: false,
        error: 'Student not found',
      };
    }

    const promoteQuery = `
      UPDATE students
      SET class_id = $1,
          section_id = $2,
          academic_year_id = $3,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $4 AND school_id = $5
      RETURNING *
    `;

    const result = await client.query(promoteQuery, [
      toClassId,
      toSectionId,
      nextAcademicYearId,
      studentId,
      schoolId,
    ]);

    await client.query('COMMIT');

    return {
      success: true,
      data: result.rows[0],
      message: 'Student promoted successfully',
    };
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error promoting student:', error);
    return {
      success: false,
      error: error.message || 'Failed to promote student',
    };
  } finally {
    client.release();
  }
};

export const deleteStudent = async (
  schoolId: string,
  studentId: string
): Promise<ServiceResponse> => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const getUserQuery = `
      SELECT user_id FROM students WHERE id = $1 AND school_id = $2
    `;
    const userResult = await client.query(getUserQuery, [studentId, schoolId]);

    if (userResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return {
        success: false,
        error: 'Student not found',
      };
    }

    const userId = userResult.rows[0].user_id;

    await client.query('DELETE FROM students WHERE id = $1', [studentId]);
    await client.query('DELETE FROM users WHERE id = $1', [userId]);

    await client.query('COMMIT');

    return {
      success: true,
      message: 'Student deleted successfully',
    };
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error deleting student:', error);
    return {
      success: false,
      error: error.message || 'Failed to delete student',
    };
  } finally {
    client.release();
  }
};
