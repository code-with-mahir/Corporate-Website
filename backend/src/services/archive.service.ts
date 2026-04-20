import { pool } from '../config/database';
import { stringify } from 'csv-stringify/sync';
import archiver from 'archiver';

interface ServiceResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export const archiveAcademicYear = async (
  schoolId: string,
  academicYearId: string
): Promise<ServiceResponse> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const checkResult = await client.query(
      'SELECT * FROM academic_years WHERE id = $1 AND school_id = $2',
      [academicYearId, schoolId]
    );

    if (checkResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return {
        success: false,
        error: 'Academic year not found'
      };
    }

    await client.query(
      `UPDATE academic_years 
       SET status = 'archived', updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND school_id = $2`,
      [academicYearId, schoolId]
    );

    await client.query(
      `UPDATE students 
       SET status = 'archived', updated_at = CURRENT_TIMESTAMP
       WHERE academic_year_id = $1 AND school_id = $2 AND status = 'active'`,
      [academicYearId, schoolId]
    );

    await client.query('COMMIT');

    return {
      success: true,
      message: 'Academic year archived successfully'
    };
  } catch (error: any) {
    await client.query('ROLLBACK');
    return {
      success: false,
      error: error.message || 'Failed to archive academic year'
    };
  } finally {
    client.release();
  }
};

export const exportAttendanceCSV = async (
  schoolId: string,
  academicYearId: string
): Promise<ServiceResponse<string>> => {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT 
         a.id,
         u.full_name as student_name,
         s.admission_number,
         c.name as class_name,
         a.date,
         a.status,
         a.remarks
       FROM attendance a
       JOIN students s ON a.student_id = s.id
       JOIN users u ON s.user_id = u.id
       JOIN classes c ON s.class_id = c.id
       WHERE s.academic_year_id = $1 AND s.school_id = $2
       ORDER BY a.date DESC, u.full_name ASC`,
      [academicYearId, schoolId]
    );

    const csvData = stringify(result.rows, {
      header: true,
      columns: [
        { key: 'id', header: 'ID' },
        { key: 'student_name', header: 'Student Name' },
        { key: 'admission_number', header: 'Admission Number' },
        { key: 'class_name', header: 'Class' },
        { key: 'date', header: 'Date' },
        { key: 'status', header: 'Status' },
        { key: 'remarks', header: 'Remarks' }
      ]
    });

    return {
      success: true,
      data: csvData,
      message: 'Attendance data exported successfully'
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to export attendance data'
    };
  } finally {
    client.release();
  }
};

export const exportStudentDataCSV = async (
  schoolId: string,
  academicYearId: string
): Promise<ServiceResponse<string>> => {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT 
         s.id,
         u.full_name,
         u.email,
         u.phone,
         s.admission_number,
         c.name as class_name,
         sec.name as section_name,
         s.date_of_birth,
         s.gender,
         s.blood_group,
         s.address,
         s.guardian_name,
         s.guardian_phone,
         s.guardian_email,
         s.status,
         ay.year as academic_year
       FROM students s
       JOIN users u ON s.user_id = u.id
       JOIN classes c ON s.class_id = c.id
       LEFT JOIN sections sec ON s.section_id = sec.id
       JOIN academic_years ay ON s.academic_year_id = ay.id
       WHERE s.academic_year_id = $1 AND s.school_id = $2
       ORDER BY c.name, u.full_name`,
      [academicYearId, schoolId]
    );

    const csvData = stringify(result.rows, {
      header: true,
      columns: [
        { key: 'id', header: 'ID' },
        { key: 'full_name', header: 'Full Name' },
        { key: 'email', header: 'Email' },
        { key: 'phone', header: 'Phone' },
        { key: 'admission_number', header: 'Admission Number' },
        { key: 'class_name', header: 'Class' },
        { key: 'section_name', header: 'Section' },
        { key: 'date_of_birth', header: 'Date of Birth' },
        { key: 'gender', header: 'Gender' },
        { key: 'blood_group', header: 'Blood Group' },
        { key: 'address', header: 'Address' },
        { key: 'guardian_name', header: 'Guardian Name' },
        { key: 'guardian_phone', header: 'Guardian Phone' },
        { key: 'guardian_email', header: 'Guardian Email' },
        { key: 'status', header: 'Status' },
        { key: 'academic_year', header: 'Academic Year' }
      ]
    });

    return {
      success: true,
      data: csvData,
      message: 'Student data exported successfully'
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to export student data'
    };
  } finally {
    client.release();
  }
};

export const exportSchoolDataJSON = async (
  schoolId: string
): Promise<ServiceResponse> => {
  const client = await pool.connect();
  try {
    const schoolResult = await client.query(
      'SELECT * FROM schools WHERE id = $1',
      [schoolId]
    );

    if (schoolResult.rows.length === 0) {
      return {
        success: false,
        error: 'School not found'
      };
    }

    const academicYearsResult = await client.query(
      'SELECT * FROM academic_years WHERE school_id = $1 ORDER BY year DESC',
      [schoolId]
    );

    const classesResult = await client.query(
      'SELECT * FROM classes WHERE school_id = $1 ORDER BY name',
      [schoolId]
    );

    const subjectsResult = await client.query(
      'SELECT * FROM subjects WHERE school_id = $1 ORDER BY name',
      [schoolId]
    );

    const studentsResult = await client.query(
      `SELECT s.*, u.full_name, u.email, u.phone
       FROM students s
       JOIN users u ON s.user_id = u.id
       WHERE s.school_id = $1
       ORDER BY u.full_name`,
      [schoolId]
    );

    const teachersResult = await client.query(
      `SELECT t.*, u.full_name, u.email, u.phone
       FROM teachers t
       JOIN users u ON t.user_id = u.id
       WHERE t.school_id = $1
       ORDER BY u.full_name`,
      [schoolId]
    );

    const exportData = {
      school: schoolResult.rows[0],
      academic_years: academicYearsResult.rows,
      classes: classesResult.rows,
      subjects: subjectsResult.rows,
      students: studentsResult.rows,
      teachers: teachersResult.rows,
      exported_at: new Date().toISOString()
    };

    return {
      success: true,
      data: exportData,
      message: 'School data exported successfully'
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to export school data'
    };
  } finally {
    client.release();
  }
};

export const createBackupZip = async (
  schoolId: string,
  academicYearId: string
): Promise<ServiceResponse<Buffer>> => {
  try {
    const attendanceCSV = await exportAttendanceCSV(schoolId, academicYearId);
    const studentCSV = await exportStudentDataCSV(schoolId, academicYearId);
    const schoolJSON = await exportSchoolDataJSON(schoolId);

    if (!attendanceCSV.success || !studentCSV.success || !schoolJSON.success) {
      return {
        success: false,
        error: 'Failed to generate export data'
      };
    }

    const archive = archiver('zip', {
      zlib: { level: 9 }
    });

    const chunks: Buffer[] = [];
    archive.on('data', (chunk) => chunks.push(chunk));

    const zipPromise = new Promise<Buffer>((resolve, reject) => {
      archive.on('end', () => resolve(Buffer.concat(chunks)));
      archive.on('error', (err) => reject(err));
    });

    archive.append(attendanceCSV.data!, { name: 'attendance.csv' });
    archive.append(studentCSV.data!, { name: 'students.csv' });
    archive.append(JSON.stringify(schoolJSON.data, null, 2), { name: 'school_data.json' });

    await archive.finalize();

    const zipBuffer = await zipPromise;

    return {
      success: true,
      data: zipBuffer,
      message: 'Backup ZIP created successfully'
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to create backup ZIP'
    };
  }
};
