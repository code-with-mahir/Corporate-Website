import { pool } from '../config/database';
import { hashPassword } from './auth.service';

interface SchoolData {
  name: string;
  slug: string;
  email: string;
  phone: string;
  address?: string;
  admin_email: string;
  admin_password: string;
  admin_name: string;
}

interface UpdateSchoolData {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
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
    schools: T[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
  error?: string;
}

export const createSchool = async (
  data: SchoolData
): Promise<ServiceResponse> => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Check if slug already exists
    const slugCheck = await client.query(
      'SELECT id FROM schools WHERE slug = $1',
      [data.slug]
    );

    if (slugCheck.rows.length > 0) {
      await client.query('ROLLBACK');
      return {
        success: false,
        error: 'School slug already exists'
      };
    }

    // Check if email already exists
    const emailCheck = await client.query(
      'SELECT id FROM schools WHERE email = $1',
      [data.email]
    );

    if (emailCheck.rows.length > 0) {
      await client.query('ROLLBACK');
      return {
        success: false,
        error: 'School email already exists'
      };
    }

    // Create school
    const schoolResult = await client.query(
      `INSERT INTO schools (
        name, slug, email, phone, address, is_active, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, true, NOW(), NOW())
      RETURNING *`,
      [
        data.name,
        data.slug,
        data.email,
        data.phone,
        data.address || null
      ]
    );

    const school = schoolResult.rows[0];

    // Hash admin password
    const hashedPassword = await hashPassword(data.admin_password);

    // Create initial admin user
    const userResult = await client.query(
      `INSERT INTO users (
        school_id, name, email, password_hash, role, is_active, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, 'school_admin', true, NOW(), NOW())
      RETURNING id, school_id, name, email, role, is_active, created_at`,
      [school.id, data.admin_name, data.admin_email, hashedPassword]
    );

    const admin = userResult.rows[0];

    await client.query('COMMIT');

    return {
      success: true,
      data: {
        school,
        admin
      },
      message: 'School and admin user created successfully'
    };
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Create school error:', error);
    
    if (error.constraint === 'users_email_key') {
      return {
        success: false,
        error: 'Admin email already exists'
      };
    }
    
    return {
      success: false,
      error: 'Failed to create school'
    };
  } finally {
    client.release();
  }
};

export const getSchools = async (
  page: number = 1,
  limit: number = 10
): Promise<PaginatedResponse<any>> => {
  const client = await pool.connect();
  
  try {
    const offset = (page - 1) * limit;

    // Get total count
    const countResult = await client.query('SELECT COUNT(*) FROM schools');
    const total = parseInt(countResult.rows[0].count);

    // Get paginated schools
    const result = await client.query(
      `SELECT s.*, 
        (SELECT COUNT(*) FROM users WHERE school_id = s.id) as user_count,
        (SELECT COUNT(*) FROM subscriptions WHERE school_id = s.id AND status = 'active') as active_subscriptions
       FROM schools s
       ORDER BY s.created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    const totalPages = Math.ceil(total / limit);

    return {
      success: true,
      data: {
        schools: result.rows,
        pagination: {
          page,
          limit,
          total,
          totalPages
        }
      }
    };
  } catch (error: any) {
    console.error('Get schools error:', error);
    return {
      success: false,
      error: 'Failed to fetch schools'
    };
  } finally {
    client.release();
  }
};

export const getSchoolById = async (id: number): Promise<ServiceResponse> => {
  const client = await pool.connect();
  
  try {
    const result = await client.query(
      `SELECT s.*,
        (SELECT COUNT(*) FROM users WHERE school_id = s.id) as user_count,
        (SELECT json_agg(json_build_object(
          'id', id,
          'plan_type', plan_type,
          'status', status,
          'start_date', start_date,
          'end_date', end_date
        )) FROM subscriptions WHERE school_id = s.id) as subscriptions
       FROM schools s
       WHERE s.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return {
        success: false,
        error: 'School not found'
      };
    }

    return {
      success: true,
      data: result.rows[0]
    };
  } catch (error: any) {
    console.error('Get school by ID error:', error);
    return {
      success: false,
      error: 'Failed to fetch school'
    };
  } finally {
    client.release();
  }
};

export const updateSchool = async (
  id: number,
  data: UpdateSchoolData
): Promise<ServiceResponse> => {
  const client = await pool.connect();
  
  try {
    // Build dynamic update query
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (data.name !== undefined) {
      updates.push(`name = $${paramCount++}`);
      values.push(data.name);
    }
    if (data.email !== undefined) {
      updates.push(`email = $${paramCount++}`);
      values.push(data.email);
    }
    if (data.phone !== undefined) {
      updates.push(`phone = $${paramCount++}`);
      values.push(data.phone);
    }
    if (data.address !== undefined) {
      updates.push(`address = $${paramCount++}`);
      values.push(data.address);
    }

    if (updates.length === 0) {
      return {
        success: false,
        error: 'No fields to update'
      };
    }

    updates.push(`updated_at = NOW()`);
    values.push(id);

    const query = `
      UPDATE schools
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await client.query(query, values);

    if (result.rows.length === 0) {
      return {
        success: false,
        error: 'School not found'
      };
    }

    return {
      success: true,
      data: result.rows[0],
      message: 'School updated successfully'
    };
  } catch (error: any) {
    console.error('Update school error:', error);
    
    if (error.constraint === 'schools_email_key') {
      return {
        success: false,
        error: 'Email already exists'
      };
    }
    
    return {
      success: false,
      error: 'Failed to update school'
    };
  } finally {
    client.release();
  }
};

export const activateSchool = async (id: number): Promise<ServiceResponse> => {
  const client = await pool.connect();
  
  try {
    const result = await client.query(
      `UPDATE schools
       SET is_active = true, updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return {
        success: false,
        error: 'School not found'
      };
    }

    return {
      success: true,
      data: result.rows[0],
      message: 'School activated successfully'
    };
  } catch (error: any) {
    console.error('Activate school error:', error);
    return {
      success: false,
      error: 'Failed to activate school'
    };
  } finally {
    client.release();
  }
};

export const deactivateSchool = async (id: number): Promise<ServiceResponse> => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Deactivate school
    const schoolResult = await client.query(
      `UPDATE schools
       SET is_active = false, updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    if (schoolResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return {
        success: false,
        error: 'School not found'
      };
    }

    // Deactivate all users in the school
    await client.query(
      `UPDATE users
       SET is_active = false, updated_at = NOW()
       WHERE school_id = $1`,
      [id]
    );

    await client.query('COMMIT');

    return {
      success: true,
      data: schoolResult.rows[0],
      message: 'School and its users deactivated successfully'
    };
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Deactivate school error:', error);
    return {
      success: false,
      error: 'Failed to deactivate school'
    };
  } finally {
    client.release();
  }
};
