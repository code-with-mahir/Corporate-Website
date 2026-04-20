import { pool } from '../config/database';
import { hashPassword } from './auth.service';

interface TeacherData {
  user_data: {
    email: string;
    password: string;
    full_name: string;
    phone?: string;
  };
  employee_id: string;
  date_of_joining?: string;
  qualification?: string;
  specialization?: string;
  experience_years?: number;
  address?: string;
  emergency_contact?: string;
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
    teachers: T[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
  error?: string;
}

export const createTeacher = async (
  schoolId: string,
  data: TeacherData
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
      'teacher',
      schoolId,
    ];

    const userResult = await client.query(userQuery, userValues);
    const userId = userResult.rows[0].id;

    const teacherQuery = `
      INSERT INTO teachers (
        user_id, school_id, employee_id, date_of_joining,
        qualification, specialization, experience_years,
        address, emergency_contact
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;

    const teacherValues = [
      userId,
      schoolId,
      data.employee_id,
      data.date_of_joining || null,
      data.qualification || null,
      data.specialization || null,
      data.experience_years || null,
      data.address || null,
      data.emergency_contact || null,
    ];

    const teacherResult = await client.query(teacherQuery, teacherValues);

    await client.query('COMMIT');

    return {
      success: true,
      data: {
        user_id: userId,
        teacher: teacherResult.rows[0],
      },
      message: 'Teacher created successfully',
    };
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error creating teacher:', error);
    return {
      success: false,
      error: error.message || 'Failed to create teacher',
    };
  } finally {
    client.release();
  }
};

export const getTeachers = async (
  schoolId: string,
  page: number = 1,
  limit: number = 10
): Promise<PaginatedResponse<any>> => {
  const client = await pool.connect();

  try {
    const offset = (page - 1) * limit;

    const query = `
      SELECT t.*, u.email, u.full_name, u.phone
      FROM teachers t
      JOIN users u ON t.user_id = u.id
      WHERE t.school_id = $1
      ORDER BY u.full_name
      LIMIT $2 OFFSET $3
    `;

    const result = await client.query(query, [schoolId, limit, offset]);

    const countQuery = `SELECT COUNT(*) FROM teachers WHERE school_id = $1`;
    const countResult = await client.query(countQuery, [schoolId]);
    const total = parseInt(countResult.rows[0].count);

    return {
      success: true,
      data: {
        teachers: result.rows,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    };
  } catch (error: any) {
    console.error('Error getting teachers:', error);
    return {
      success: false,
      error: error.message || 'Failed to get teachers',
    };
  } finally {
    client.release();
  }
};

export const getTeacherById = async (
  schoolId: string,
  teacherId: string
): Promise<ServiceResponse> => {
  const client = await pool.connect();

  try {
    const query = `
      SELECT t.*, u.email, u.full_name, u.phone
      FROM teachers t
      JOIN users u ON t.user_id = u.id
      WHERE t.id = $1 AND t.school_id = $2
    `;

    const result = await client.query(query, [teacherId, schoolId]);

    if (result.rows.length === 0) {
      return {
        success: false,
        error: 'Teacher not found',
      };
    }

    return {
      success: true,
      data: result.rows[0],
    };
  } catch (error: any) {
    console.error('Error getting teacher:', error);
    return {
      success: false,
      error: error.message || 'Failed to get teacher',
    };
  } finally {
    client.release();
  }
};

export const updateTeacher = async (
  schoolId: string,
  teacherId: string,
  data: Partial<TeacherData>
): Promise<ServiceResponse> => {
  const client = await pool.connect();

  try {
    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (data.employee_id !== undefined) {
      fields.push(`employee_id = $${paramCount++}`);
      values.push(data.employee_id);
    }
    if (data.date_of_joining !== undefined) {
      fields.push(`date_of_joining = $${paramCount++}`);
      values.push(data.date_of_joining);
    }
    if (data.qualification !== undefined) {
      fields.push(`qualification = $${paramCount++}`);
      values.push(data.qualification);
    }
    if (data.specialization !== undefined) {
      fields.push(`specialization = $${paramCount++}`);
      values.push(data.specialization);
    }
    if (data.experience_years !== undefined) {
      fields.push(`experience_years = $${paramCount++}`);
      values.push(data.experience_years);
    }
    if (data.address !== undefined) {
      fields.push(`address = $${paramCount++}`);
      values.push(data.address);
    }
    if (data.emergency_contact !== undefined) {
      fields.push(`emergency_contact = $${paramCount++}`);
      values.push(data.emergency_contact);
    }

    if (fields.length === 0) {
      return {
        success: false,
        error: 'No fields to update',
      };
    }

    fields.push(`updated_at = CURRENT_TIMESTAMP`);

    const query = `
      UPDATE teachers
      SET ${fields.join(', ')}
      WHERE id = $${paramCount} AND school_id = $${paramCount + 1}
      RETURNING *
    `;

    values.push(teacherId, schoolId);

    const result = await client.query(query, values);

    if (result.rows.length === 0) {
      return {
        success: false,
        error: 'Teacher not found',
      };
    }

    return {
      success: true,
      data: result.rows[0],
      message: 'Teacher updated successfully',
    };
  } catch (error: any) {
    console.error('Error updating teacher:', error);
    return {
      success: false,
      error: error.message || 'Failed to update teacher',
    };
  } finally {
    client.release();
  }
};

export const assignTeacherToClass = async (
  schoolId: string,
  teacherId: string,
  classId: string,
  sectionId: string | null,
  subjectId: string,
  academicYearId: string
): Promise<ServiceResponse> => {
  const client = await pool.connect();

  try {
    const checkQuery = `
      SELECT id FROM teachers WHERE id = $1 AND school_id = $2
    `;
    const checkResult = await client.query(checkQuery, [teacherId, schoolId]);

    if (checkResult.rows.length === 0) {
      return {
        success: false,
        error: 'Teacher not found',
      };
    }

    const assignQuery = `
      INSERT INTO teacher_assignments (
        teacher_id, class_id, section_id, subject_id, academic_year_id, school_id
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

    const result = await client.query(assignQuery, [
      teacherId,
      classId,
      sectionId,
      subjectId,
      academicYearId,
      schoolId,
    ]);

    return {
      success: true,
      data: result.rows[0],
      message: 'Teacher assigned to class successfully',
    };
  } catch (error: any) {
    console.error('Error assigning teacher:', error);
    return {
      success: false,
      error: error.message || 'Failed to assign teacher',
    };
  } finally {
    client.release();
  }
};

export const getTeacherAssignments = async (
  schoolId: string,
  teacherId: string
): Promise<ServiceResponse> => {
  const client = await pool.connect();

  try {
    const query = `
      SELECT ta.*, 
        c.name as class_name, c.section,
        s.name as subject_name,
        ay.year_name
      FROM teacher_assignments ta
      LEFT JOIN classes c ON ta.class_id = c.id
      LEFT JOIN subjects s ON ta.subject_id = s.id
      LEFT JOIN academic_years ay ON ta.academic_year_id = ay.id
      WHERE ta.teacher_id = $1 AND ta.school_id = $2
      ORDER BY ay.start_date DESC, c.name
    `;

    const result = await client.query(query, [teacherId, schoolId]);

    return {
      success: true,
      data: result.rows,
    };
  } catch (error: any) {
    console.error('Error getting teacher assignments:', error);
    return {
      success: false,
      error: error.message || 'Failed to get teacher assignments',
    };
  } finally {
    client.release();
  }
};

export const deleteTeacher = async (
  schoolId: string,
  teacherId: string
): Promise<ServiceResponse> => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const getUserQuery = `
      SELECT user_id FROM teachers WHERE id = $1 AND school_id = $2
    `;
    const userResult = await client.query(getUserQuery, [teacherId, schoolId]);

    if (userResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return {
        success: false,
        error: 'Teacher not found',
      };
    }

    const userId = userResult.rows[0].user_id;

    await client.query('DELETE FROM teacher_assignments WHERE teacher_id = $1', [teacherId]);
    await client.query('DELETE FROM teachers WHERE id = $1', [teacherId]);
    await client.query('DELETE FROM users WHERE id = $1', [userId]);

    await client.query('COMMIT');

    return {
      success: true,
      message: 'Teacher deleted successfully',
    };
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error deleting teacher:', error);
    return {
      success: false,
      error: error.message || 'Failed to delete teacher',
    };
  } finally {
    client.release();
  }
};
