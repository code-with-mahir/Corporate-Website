import { pool } from '../config/database';

interface AcademicYearData {
  name: string;
  start_date: Date;
  end_date: Date;
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
    academicYears: T[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
  error?: string;
}

export const createAcademicYear = async (
  schoolId: number,
  data: AcademicYearData
): Promise<ServiceResponse> => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Verify school exists and is active
    const schoolCheck = await client.query(
      'SELECT id, is_active FROM schools WHERE id = $1',
      [schoolId]
    );

    if (schoolCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return {
        success: false,
        error: 'School not found'
      };
    }

    if (!schoolCheck.rows[0].is_active) {
      await client.query('ROLLBACK');
      return {
        success: false,
        error: 'School is not active'
      };
    }

    // Validate dates
    const startDate = new Date(data.start_date);
    const endDate = new Date(data.end_date);

    if (startDate >= endDate) {
      await client.query('ROLLBACK');
      return {
        success: false,
        error: 'End date must be after start date'
      };
    }

    // Check for overlapping academic years
    const overlapCheck = await client.query(
      `SELECT id, name FROM academic_years
       WHERE school_id = $1
       AND is_closed = false
       AND (
         (start_date <= $2 AND end_date >= $2)
         OR (start_date <= $3 AND end_date >= $3)
         OR (start_date >= $2 AND end_date <= $3)
       )`,
      [schoolId, startDate, endDate]
    );

    if (overlapCheck.rows.length > 0) {
      await client.query('ROLLBACK');
      return {
        success: false,
        error: `Academic year overlaps with existing year: ${overlapCheck.rows[0].name}`
      };
    }

    // Check if this is the first academic year
    const existingYearsCheck = await client.query(
      'SELECT COUNT(*) FROM academic_years WHERE school_id = $1',
      [schoolId]
    );

    const isFirstYear = parseInt(existingYearsCheck.rows[0].count) === 0;

    // Create academic year
    const result = await client.query(
      `INSERT INTO academic_years (
        school_id, name, start_date, end_date,
        is_current, is_closed, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, false, NOW(), NOW())
      RETURNING *`,
      [
        schoolId,
        data.name,
        startDate,
        endDate,
        isFirstYear // Set as current if it's the first year
      ]
    );

    await client.query('COMMIT');

    return {
      success: true,
      data: result.rows[0],
      message: 'Academic year created successfully'
    };
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Create academic year error:', error);
    return {
      success: false,
      error: 'Failed to create academic year'
    };
  } finally {
    client.release();
  }
};

export const getAcademicYears = async (
  schoolId: number,
  page: number = 1,
  limit: number = 10
): Promise<PaginatedResponse<any>> => {
  const client = await pool.connect();
  
  try {
    const offset = (page - 1) * limit;

    // Get total count
    const countResult = await client.query(
      'SELECT COUNT(*) FROM academic_years WHERE school_id = $1',
      [schoolId]
    );
    const total = parseInt(countResult.rows[0].count);

    // Get paginated academic years
    const result = await client.query(
      `SELECT *
       FROM academic_years
       WHERE school_id = $1
       ORDER BY start_date DESC
       LIMIT $2 OFFSET $3`,
      [schoolId, limit, offset]
    );

    const totalPages = Math.ceil(total / limit);

    return {
      success: true,
      data: {
        academicYears: result.rows,
        pagination: {
          page,
          limit,
          total,
          totalPages
        }
      }
    };
  } catch (error: any) {
    console.error('Get academic years error:', error);
    return {
      success: false,
      error: 'Failed to fetch academic years'
    };
  } finally {
    client.release();
  }
};

export const getCurrentAcademicYear = async (
  schoolId: number
): Promise<ServiceResponse> => {
  const client = await pool.connect();
  
  try {
    const result = await client.query(
      `SELECT *
       FROM academic_years
       WHERE school_id = $1 AND is_current = true AND is_closed = false
       LIMIT 1`,
      [schoolId]
    );

    if (result.rows.length === 0) {
      return {
        success: false,
        error: 'No current academic year set'
      };
    }

    return {
      success: true,
      data: result.rows[0]
    };
  } catch (error: any) {
    console.error('Get current academic year error:', error);
    return {
      success: false,
      error: 'Failed to fetch current academic year'
    };
  } finally {
    client.release();
  }
};

export const setCurrentAcademicYear = async (
  schoolId: number,
  yearId: number
): Promise<ServiceResponse> => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Verify the year exists and belongs to the school
    const yearCheck = await client.query(
      'SELECT id, is_closed FROM academic_years WHERE id = $1 AND school_id = $2',
      [yearId, schoolId]
    );

    if (yearCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return {
        success: false,
        error: 'Academic year not found'
      };
    }

    if (yearCheck.rows[0].is_closed) {
      await client.query('ROLLBACK');
      return {
        success: false,
        error: 'Cannot set a closed academic year as current'
      };
    }

    // Unset all current years for this school
    await client.query(
      `UPDATE academic_years
       SET is_current = false, updated_at = NOW()
       WHERE school_id = $1 AND is_current = true`,
      [schoolId]
    );

    // Set the new current year
    const result = await client.query(
      `UPDATE academic_years
       SET is_current = true, updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [yearId]
    );

    await client.query('COMMIT');

    return {
      success: true,
      data: result.rows[0],
      message: 'Current academic year updated successfully'
    };
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Set current academic year error:', error);
    return {
      success: false,
      error: 'Failed to set current academic year'
    };
  } finally {
    client.release();
  }
};

export const closeAcademicYear = async (
  schoolId: number,
  yearId: number
): Promise<ServiceResponse> => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Verify the year exists and belongs to the school
    const yearCheck = await client.query(
      `SELECT id, is_current, is_closed
       FROM academic_years
       WHERE id = $1 AND school_id = $2`,
      [yearId, schoolId]
    );

    if (yearCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return {
        success: false,
        error: 'Academic year not found'
      };
    }

    const year = yearCheck.rows[0];

    if (year.is_closed) {
      await client.query('ROLLBACK');
      return {
        success: false,
        error: 'Academic year is already closed'
      };
    }

    // If closing the current year, check if there's another year to set as current
    if (year.is_current) {
      const nextYearResult = await client.query(
        `SELECT id
         FROM academic_years
         WHERE school_id = $1 AND id != $2 AND is_closed = false
         ORDER BY start_date DESC
         LIMIT 1`,
        [schoolId, yearId]
      );

      if (nextYearResult.rows.length > 0) {
        // Set the next year as current
        await client.query(
          `UPDATE academic_years
           SET is_current = true, updated_at = NOW()
           WHERE id = $1`,
          [nextYearResult.rows[0].id]
        );
      }
    }

    // Close the academic year
    const result = await client.query(
      `UPDATE academic_years
       SET is_closed = true, is_current = false, updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [yearId]
    );

    await client.query('COMMIT');

    return {
      success: true,
      data: result.rows[0],
      message: 'Academic year closed successfully. No further edits allowed.'
    };
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Close academic year error:', error);
    return {
      success: false,
      error: 'Failed to close academic year'
    };
  } finally {
    client.release();
  }
};

export const getAcademicYearById = async (
  schoolId: number,
  yearId: number
): Promise<ServiceResponse> => {
  const client = await pool.connect();
  
  try {
    const result = await client.query(
      `SELECT *
       FROM academic_years
       WHERE id = $1 AND school_id = $2`,
      [yearId, schoolId]
    );

    if (result.rows.length === 0) {
      return {
        success: false,
        error: 'Academic year not found'
      };
    }

    return {
      success: true,
      data: result.rows[0]
    };
  } catch (error: any) {
    console.error('Get academic year by ID error:', error);
    return {
      success: false,
      error: 'Failed to fetch academic year'
    };
  } finally {
    client.release();
  }
};

export const updateAcademicYear = async (
  schoolId: number,
  yearId: number,
  data: Partial<AcademicYearData>
): Promise<ServiceResponse> => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Check if year exists and is not closed
    const yearCheck = await client.query(
      `SELECT id, is_closed FROM academic_years
       WHERE id = $1 AND school_id = $2`,
      [yearId, schoolId]
    );

    if (yearCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return {
        success: false,
        error: 'Academic year not found'
      };
    }

    if (yearCheck.rows[0].is_closed) {
      await client.query('ROLLBACK');
      return {
        success: false,
        error: 'Cannot edit a closed academic year'
      };
    }

    // Build dynamic update query
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (data.name !== undefined) {
      updates.push(`name = $${paramCount++}`);
      values.push(data.name);
    }
    if (data.start_date !== undefined) {
      updates.push(`start_date = $${paramCount++}`);
      values.push(new Date(data.start_date));
    }
    if (data.end_date !== undefined) {
      updates.push(`end_date = $${paramCount++}`);
      values.push(new Date(data.end_date));
    }

    if (updates.length === 0) {
      await client.query('ROLLBACK');
      return {
        success: false,
        error: 'No fields to update'
      };
    }

    updates.push(`updated_at = NOW()`);
    values.push(yearId);
    values.push(schoolId);

    const query = `
      UPDATE academic_years
      SET ${updates.join(', ')}
      WHERE id = $${paramCount++} AND school_id = $${paramCount}
      RETURNING *
    `;

    const result = await client.query(query, values);

    await client.query('COMMIT');

    return {
      success: true,
      data: result.rows[0],
      message: 'Academic year updated successfully'
    };
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Update academic year error:', error);
    return {
      success: false,
      error: 'Failed to update academic year'
    };
  } finally {
    client.release();
  }
};
