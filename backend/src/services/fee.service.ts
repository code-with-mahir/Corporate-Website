import { pool } from '../config/database';

interface FeeStructureData {
  academic_year_id: string;
  class_id: string;
  fee_type: string;
  amount: number;
  due_date: string;
  description?: string;
}

interface FeePaymentData {
  amount_paid: number;
  payment_date: string;
  payment_method: string;
  transaction_id?: string;
  remarks?: string;
}

interface FeeFilters {
  academicYearId?: string;
  classId?: string;
  studentId?: string;
  feeType?: string;
  status?: string;
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
    feeStructures?: T[];
    feePayments?: T[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
  error?: string;
}

export const createFeeStructure = async (
  schoolId: string,
  data: FeeStructureData
): Promise<ServiceResponse> => {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `INSERT INTO fee_structures (school_id, academic_year_id, class_id, fee_type, amount, due_date, description)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [schoolId, data.academic_year_id, data.class_id, data.fee_type, data.amount, data.due_date, data.description || null]
    );

    return {
      success: true,
      data: result.rows[0],
      message: 'Fee structure created successfully'
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to create fee structure'
    };
  } finally {
    client.release();
  }
};

export const getFeeStructures = async (
  schoolId: string,
  filters: FeeFilters = {},
  page: number = 1,
  limit: number = 50
): Promise<PaginatedResponse<any>> => {
  const client = await pool.connect();
  try {
    const offset = (page - 1) * limit;
    const conditions = ['fs.school_id = $1'];
    const params: any[] = [schoolId];
    let paramIndex = 2;

    if (filters.academicYearId) {
      conditions.push(`fs.academic_year_id = $${paramIndex}`);
      params.push(filters.academicYearId);
      paramIndex++;
    }

    if (filters.classId) {
      conditions.push(`fs.class_id = $${paramIndex}`);
      params.push(filters.classId);
      paramIndex++;
    }

    const whereClause = conditions.join(' AND ');

    const countResult = await client.query(
      `SELECT COUNT(*) FROM fee_structures fs WHERE ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    const result = await client.query(
      `SELECT fs.*, 
              c.name as class_name,
              ay.year as academic_year
       FROM fee_structures fs
       JOIN classes c ON fs.class_id = c.id
       JOIN academic_years ay ON fs.academic_year_id = ay.id
       WHERE ${whereClause}
       ORDER BY fs.due_date ASC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    );

    return {
      success: true,
      data: {
        feeStructures: result.rows,
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
      error: error.message || 'Failed to fetch fee structures'
    };
  } finally {
    client.release();
  }
};

export const updateFeeStructure = async (
  schoolId: string,
  feeStructureId: string,
  data: Partial<FeeStructureData>
): Promise<ServiceResponse> => {
  const client = await pool.connect();
  try {
    const checkResult = await client.query(
      'SELECT * FROM fee_structures WHERE id = $1 AND school_id = $2',
      [feeStructureId, schoolId]
    );

    if (checkResult.rows.length === 0) {
      return {
        success: false,
        error: 'Fee structure not found'
      };
    }

    const updates: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (data.amount !== undefined) {
      updates.push(`amount = $${paramIndex}`);
      params.push(data.amount);
      paramIndex++;
    }

    if (data.due_date !== undefined) {
      updates.push(`due_date = $${paramIndex}`);
      params.push(data.due_date);
      paramIndex++;
    }

    if (data.description !== undefined) {
      updates.push(`description = $${paramIndex}`);
      params.push(data.description);
      paramIndex++;
    }

    if (updates.length === 0) {
      return {
        success: false,
        error: 'No fields to update'
      };
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    params.push(feeStructureId, schoolId);

    const result = await client.query(
      `UPDATE fee_structures 
       SET ${updates.join(', ')}
       WHERE id = $${paramIndex} AND school_id = $${paramIndex + 1}
       RETURNING *`,
      params
    );

    return {
      success: true,
      data: result.rows[0],
      message: 'Fee structure updated successfully'
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to update fee structure'
    };
  } finally {
    client.release();
  }
};

export const recordFeePayment = async (
  schoolId: string,
  studentId: string,
  feeStructureId: string,
  data: FeePaymentData
): Promise<ServiceResponse> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const feeStructure = await client.query(
      'SELECT * FROM fee_structures WHERE id = $1 AND school_id = $2',
      [feeStructureId, schoolId]
    );

    if (feeStructure.rows.length === 0) {
      await client.query('ROLLBACK');
      return {
        success: false,
        error: 'Fee structure not found'
      };
    }

    const lateFee = calculateLateFee(
      feeStructure.rows[0],
      feeStructure.rows[0].due_date,
      data.payment_date
    );

    const result = await client.query(
      `INSERT INTO fee_payments (student_id, fee_structure_id, amount_paid, late_fee, payment_date, payment_method, transaction_id, remarks, school_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [studentId, feeStructureId, data.amount_paid, lateFee, data.payment_date, data.payment_method, data.transaction_id || null, data.remarks || null, schoolId]
    );

    await client.query('COMMIT');

    return {
      success: true,
      data: result.rows[0],
      message: 'Fee payment recorded successfully'
    };
  } catch (error: any) {
    await client.query('ROLLBACK');
    return {
      success: false,
      error: error.message || 'Failed to record fee payment'
    };
  } finally {
    client.release();
  }
};

export const getStudentFeeDues = async (
  schoolId: string,
  studentId: string,
  academicYearId: string
): Promise<ServiceResponse> => {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT fs.*,
              c.name as class_name,
              COALESCE(SUM(fp.amount_paid), 0) as total_paid,
              COALESCE(SUM(fp.late_fee), 0) as total_late_fee,
              (fs.amount - COALESCE(SUM(fp.amount_paid), 0)) as balance
       FROM fee_structures fs
       JOIN students s ON fs.class_id = s.class_id
       JOIN classes c ON fs.class_id = c.id
       LEFT JOIN fee_payments fp ON fs.id = fp.fee_structure_id AND fp.student_id = s.id
       WHERE s.id = $1 
         AND fs.school_id = $2
         AND fs.academic_year_id = $3
       GROUP BY fs.id, c.name
       HAVING (fs.amount - COALESCE(SUM(fp.amount_paid), 0)) > 0
       ORDER BY fs.due_date ASC`,
      [studentId, schoolId, academicYearId]
    );

    return {
      success: true,
      data: result.rows
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to fetch student fee dues'
    };
  } finally {
    client.release();
  }
};

export const calculateLateFee = (
  feeStructure: any,
  dueDate: string,
  paymentDate: string
): number => {
  const due = new Date(dueDate);
  const payment = new Date(paymentDate);

  if (payment <= due) {
    return 0;
  }

  const daysDiff = Math.ceil((payment.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
  const lateFeePerDay = 10;
  const maxLateFee = feeStructure.amount * 0.1;

  return Math.min(daysDiff * lateFeePerDay, maxLateFee);
};

export const getFeePayments = async (
  schoolId: string,
  filters: FeeFilters = {},
  page: number = 1,
  limit: number = 50
): Promise<PaginatedResponse<any>> => {
  const client = await pool.connect();
  try {
    const offset = (page - 1) * limit;
    const conditions = ['fp.school_id = $1'];
    const params: any[] = [schoolId];
    let paramIndex = 2;

    if (filters.studentId) {
      conditions.push(`fp.student_id = $${paramIndex}`);
      params.push(filters.studentId);
      paramIndex++;
    }

    if (filters.academicYearId) {
      conditions.push(`fs.academic_year_id = $${paramIndex}`);
      params.push(filters.academicYearId);
      paramIndex++;
    }

    const whereClause = conditions.join(' AND ');

    const countResult = await client.query(
      `SELECT COUNT(*) FROM fee_payments fp 
       JOIN fee_structures fs ON fp.fee_structure_id = fs.id
       WHERE ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    const result = await client.query(
      `SELECT fp.*, 
              u.full_name as student_name,
              fs.fee_type,
              fs.amount as total_amount
       FROM fee_payments fp
       JOIN students s ON fp.student_id = s.id
       JOIN users u ON s.user_id = u.id
       JOIN fee_structures fs ON fp.fee_structure_id = fs.id
       WHERE ${whereClause}
       ORDER BY fp.payment_date DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    );

    return {
      success: true,
      data: {
        feePayments: result.rows,
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
      error: error.message || 'Failed to fetch fee payments'
    };
  } finally {
    client.release();
  }
};
