import { pool } from '../config/database';

interface AttendanceRecord {
  student_id: string;
  class_id: string;
  section_id?: string;
  academic_year_id: string;
  date: string;
  status: 'present' | 'absent' | 'late' | 'excused';
  marked_by: string;
  remarks?: string;
}

interface AttendanceFilters {
  studentId?: string;
  classId?: string;
  sectionId?: string;
  dateFrom?: string;
  dateTo?: string;
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
    attendance: T[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
  error?: string;
}

export const markAttendance = async (
  schoolId: string,
  studentId: string,
  classId: string,
  sectionId: string | null,
  academicYearId: string,
  date: string,
  status: 'present' | 'absent' | 'late' | 'excused',
  markedBy: string,
  remarks?: string
): Promise<ServiceResponse> => {
  const client = await pool.connect();

  try {
    const checkQuery = `
      SELECT id FROM attendance
      WHERE student_id = $1 AND date = $2 AND school_id = $3
    `;
    const checkResult = await client.query(checkQuery, [studentId, date, schoolId]);

    let query: string;
    let values: any[];

    if (checkResult.rows.length > 0) {
      query = `
        UPDATE attendance
        SET status = $1,
            marked_by = $2,
            remarks = $3,
            updated_at = CURRENT_TIMESTAMP
        WHERE student_id = $4 AND date = $5 AND school_id = $6
        RETURNING *
      `;
      values = [status, markedBy, remarks || null, studentId, date, schoolId];
    } else {
      query = `
        INSERT INTO attendance (
          student_id, class_id, section_id, academic_year_id,
          date, status, marked_by, remarks, school_id
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `;
      values = [
        studentId,
        classId,
        sectionId,
        academicYearId,
        date,
        status,
        markedBy,
        remarks || null,
        schoolId,
      ];
    }

    const result = await client.query(query, values);

    return {
      success: true,
      data: result.rows[0],
      message: 'Attendance marked successfully',
    };
  } catch (error: any) {
    console.error('Error marking attendance:', error);
    return {
      success: false,
      error: error.message || 'Failed to mark attendance',
    };
  } finally {
    client.release();
  }
};

export const bulkMarkAttendance = async (
  schoolId: string,
  attendanceRecords: AttendanceRecord[]
): Promise<ServiceResponse> => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const results = [];

    for (const record of attendanceRecords) {
      const checkQuery = `
        SELECT id FROM attendance
        WHERE student_id = $1 AND date = $2 AND school_id = $3
      `;
      const checkResult = await client.query(checkQuery, [
        record.student_id,
        record.date,
        schoolId,
      ]);

      let query: string;
      let values: any[];

      if (checkResult.rows.length > 0) {
        query = `
          UPDATE attendance
          SET status = $1,
              marked_by = $2,
              remarks = $3,
              updated_at = CURRENT_TIMESTAMP
          WHERE student_id = $4 AND date = $5 AND school_id = $6
          RETURNING *
        `;
        values = [
          record.status,
          record.marked_by,
          record.remarks || null,
          record.student_id,
          record.date,
          schoolId,
        ];
      } else {
        query = `
          INSERT INTO attendance (
            student_id, class_id, section_id, academic_year_id,
            date, status, marked_by, remarks, school_id
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          RETURNING *
        `;
        values = [
          record.student_id,
          record.class_id,
          record.section_id || null,
          record.academic_year_id,
          record.date,
          record.status,
          record.marked_by,
          record.remarks || null,
          schoolId,
        ];
      }

      const result = await client.query(query, values);
      results.push(result.rows[0]);
    }

    await client.query('COMMIT');

    return {
      success: true,
      data: results,
      message: `${results.length} attendance records marked successfully`,
    };
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error bulk marking attendance:', error);
    return {
      success: false,
      error: error.message || 'Failed to bulk mark attendance',
    };
  } finally {
    client.release();
  }
};

export const getAttendance = async (
  schoolId: string,
  filters: AttendanceFilters = {},
  page: number = 1,
  limit: number = 10
): Promise<PaginatedResponse<any>> => {
  const client = await pool.connect();

  try {
    const offset = (page - 1) * limit;

    let query = `
      SELECT a.*, 
        s.admission_number,
        u.full_name as student_name,
        c.name as class_name, c.section,
        mu.full_name as marked_by_name
      FROM attendance a
      JOIN students s ON a.student_id = s.id
      JOIN users u ON s.user_id = u.id
      LEFT JOIN classes c ON a.class_id = c.id
      LEFT JOIN users mu ON a.marked_by = mu.id
      WHERE a.school_id = $1
    `;

    const values: any[] = [schoolId];
    let paramCount = 2;

    if (filters.studentId) {
      query += ` AND a.student_id = $${paramCount++}`;
      values.push(filters.studentId);
    }

    if (filters.classId) {
      query += ` AND a.class_id = $${paramCount++}`;
      values.push(filters.classId);
    }

    if (filters.sectionId) {
      query += ` AND a.section_id = $${paramCount++}`;
      values.push(filters.sectionId);
    }

    if (filters.dateFrom) {
      query += ` AND a.date >= $${paramCount++}`;
      values.push(filters.dateFrom);
    }

    if (filters.dateTo) {
      query += ` AND a.date <= $${paramCount++}`;
      values.push(filters.dateTo);
    }

    query += ` ORDER BY a.date DESC, u.full_name LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    values.push(limit, offset);

    const result = await client.query(query, values);

    let countQuery = `SELECT COUNT(*) FROM attendance WHERE school_id = $1`;
    const countValues: any[] = [schoolId];
    let countParam = 2;

    if (filters.studentId) {
      countQuery += ` AND student_id = $${countParam++}`;
      countValues.push(filters.studentId);
    }

    if (filters.classId) {
      countQuery += ` AND class_id = $${countParam++}`;
      countValues.push(filters.classId);
    }

    if (filters.sectionId) {
      countQuery += ` AND section_id = $${countParam++}`;
      countValues.push(filters.sectionId);
    }

    if (filters.dateFrom) {
      countQuery += ` AND date >= $${countParam++}`;
      countValues.push(filters.dateFrom);
    }

    if (filters.dateTo) {
      countQuery += ` AND date <= $${countParam++}`;
      countValues.push(filters.dateTo);
    }

    const countResult = await client.query(countQuery, countValues);
    const total = parseInt(countResult.rows[0].count);

    return {
      success: true,
      data: {
        attendance: result.rows,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    };
  } catch (error: any) {
    console.error('Error getting attendance:', error);
    return {
      success: false,
      error: error.message || 'Failed to get attendance',
    };
  } finally {
    client.release();
  }
};

export const getStudentAttendanceSummary = async (
  schoolId: string,
  studentId: string,
  academicYearId: string
): Promise<ServiceResponse> => {
  const client = await pool.connect();

  try {
    const query = `
      SELECT 
        COUNT(*) as total_days,
        COUNT(CASE WHEN status = 'present' THEN 1 END) as present_days,
        COUNT(CASE WHEN status = 'absent' THEN 1 END) as absent_days,
        COUNT(CASE WHEN status = 'late' THEN 1 END) as late_days,
        COUNT(CASE WHEN status = 'excused' THEN 1 END) as excused_days,
        ROUND(
          (COUNT(CASE WHEN status = 'present' THEN 1 END)::numeric / 
          NULLIF(COUNT(*)::numeric, 0)) * 100, 2
        ) as attendance_percentage
      FROM attendance
      WHERE student_id = $1 
        AND school_id = $2
        AND academic_year_id = $3
    `;

    const result = await client.query(query, [studentId, schoolId, academicYearId]);

    return {
      success: true,
      data: result.rows[0],
    };
  } catch (error: any) {
    console.error('Error getting attendance summary:', error);
    return {
      success: false,
      error: error.message || 'Failed to get attendance summary',
    };
  } finally {
    client.release();
  }
};

export const generateAttendanceReport = async (
  schoolId: string,
  filters: AttendanceFilters = {}
): Promise<ServiceResponse> => {
  const client = await pool.connect();

  try {
    let query = `
      SELECT 
        s.admission_number,
        u.full_name as student_name,
        c.name as class_name,
        c.section,
        a.date,
        a.status,
        a.remarks,
        mu.full_name as marked_by_name
      FROM attendance a
      JOIN students s ON a.student_id = s.id
      JOIN users u ON s.user_id = u.id
      LEFT JOIN classes c ON a.class_id = c.id
      LEFT JOIN users mu ON a.marked_by = mu.id
      WHERE a.school_id = $1
    `;

    const values: any[] = [schoolId];
    let paramCount = 2;

    if (filters.studentId) {
      query += ` AND a.student_id = $${paramCount++}`;
      values.push(filters.studentId);
    }

    if (filters.classId) {
      query += ` AND a.class_id = $${paramCount++}`;
      values.push(filters.classId);
    }

    if (filters.sectionId) {
      query += ` AND a.section_id = $${paramCount++}`;
      values.push(filters.sectionId);
    }

    if (filters.dateFrom) {
      query += ` AND a.date >= $${paramCount++}`;
      values.push(filters.dateFrom);
    }

    if (filters.dateTo) {
      query += ` AND a.date <= $${paramCount++}`;
      values.push(filters.dateTo);
    }

    query += ` ORDER BY a.date DESC, u.full_name`;

    const result = await client.query(query, values);

    const csvHeader = 'Admission Number,Student Name,Class,Section,Date,Status,Remarks,Marked By\n';
    const csvRows = result.rows.map((row) => {
      return [
        row.admission_number,
        row.student_name,
        row.class_name || '',
        row.section || '',
        row.date,
        row.status,
        row.remarks || '',
        row.marked_by_name || '',
      ]
        .map((field) => `"${field}"`)
        .join(',');
    });

    const csvData = csvHeader + csvRows.join('\n');

    return {
      success: true,
      data: csvData,
      message: 'Attendance report generated successfully',
    };
  } catch (error: any) {
    console.error('Error generating attendance report:', error);
    return {
      success: false,
      error: error.message || 'Failed to generate attendance report',
    };
  } finally {
    client.release();
  }
};
