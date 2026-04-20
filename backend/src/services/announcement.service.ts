import { pool } from '../config/database';

interface AnnouncementData {
  title: string;
  content: string;
  target_audience: string;
  priority?: string;
  valid_from?: string;
  valid_until?: string;
}

interface AnnouncementFilters {
  targetAudience?: string;
  priority?: string;
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
    announcements: T[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
  error?: string;
}

export const createAnnouncement = async (
  schoolId: string,
  data: AnnouncementData
): Promise<ServiceResponse> => {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `INSERT INTO announcements (school_id, title, content, target_audience, priority, valid_from, valid_until)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        schoolId,
        data.title,
        data.content,
        data.target_audience,
        data.priority || 'normal',
        data.valid_from || null,
        data.valid_until || null
      ]
    );

    return {
      success: true,
      data: result.rows[0],
      message: 'Announcement created successfully'
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to create announcement'
    };
  } finally {
    client.release();
  }
};

export const getAnnouncements = async (
  schoolId: string,
  filters: AnnouncementFilters = {},
  page: number = 1,
  limit: number = 20
): Promise<PaginatedResponse<any>> => {
  const client = await pool.connect();
  try {
    const offset = (page - 1) * limit;
    const conditions = ['school_id = $1'];
    const params: any[] = [schoolId];
    let paramIndex = 2;

    if (filters.targetAudience) {
      conditions.push(`target_audience = $${paramIndex}`);
      params.push(filters.targetAudience);
      paramIndex++;
    }

    if (filters.priority) {
      conditions.push(`priority = $${paramIndex}`);
      params.push(filters.priority);
      paramIndex++;
    }

    conditions.push(`(valid_from IS NULL OR valid_from <= CURRENT_DATE)`);
    conditions.push(`(valid_until IS NULL OR valid_until >= CURRENT_DATE)`);

    const whereClause = conditions.join(' AND ');

    const countResult = await client.query(
      `SELECT COUNT(*) FROM announcements WHERE ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    const result = await client.query(
      `SELECT * FROM announcements
       WHERE ${whereClause}
       ORDER BY priority DESC, created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    );

    return {
      success: true,
      data: {
        announcements: result.rows,
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
      error: error.message || 'Failed to fetch announcements'
    };
  } finally {
    client.release();
  }
};

export const getAnnouncementById = async (
  schoolId: string,
  announcementId: string
): Promise<ServiceResponse> => {
  const client = await pool.connect();
  try {
    const result = await client.query(
      'SELECT * FROM announcements WHERE id = $1 AND school_id = $2',
      [announcementId, schoolId]
    );

    if (result.rows.length === 0) {
      return {
        success: false,
        error: 'Announcement not found'
      };
    }

    return {
      success: true,
      data: result.rows[0]
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to fetch announcement'
    };
  } finally {
    client.release();
  }
};

export const updateAnnouncement = async (
  schoolId: string,
  announcementId: string,
  data: Partial<AnnouncementData>
): Promise<ServiceResponse> => {
  const client = await pool.connect();
  try {
    const checkResult = await client.query(
      'SELECT * FROM announcements WHERE id = $1 AND school_id = $2',
      [announcementId, schoolId]
    );

    if (checkResult.rows.length === 0) {
      return {
        success: false,
        error: 'Announcement not found'
      };
    }

    const updates: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (data.title !== undefined) {
      updates.push(`title = $${paramIndex}`);
      params.push(data.title);
      paramIndex++;
    }

    if (data.content !== undefined) {
      updates.push(`content = $${paramIndex}`);
      params.push(data.content);
      paramIndex++;
    }

    if (data.target_audience !== undefined) {
      updates.push(`target_audience = $${paramIndex}`);
      params.push(data.target_audience);
      paramIndex++;
    }

    if (data.priority !== undefined) {
      updates.push(`priority = $${paramIndex}`);
      params.push(data.priority);
      paramIndex++;
    }

    if (data.valid_from !== undefined) {
      updates.push(`valid_from = $${paramIndex}`);
      params.push(data.valid_from);
      paramIndex++;
    }

    if (data.valid_until !== undefined) {
      updates.push(`valid_until = $${paramIndex}`);
      params.push(data.valid_until);
      paramIndex++;
    }

    if (updates.length === 0) {
      return {
        success: false,
        error: 'No fields to update'
      };
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    params.push(announcementId, schoolId);

    const result = await client.query(
      `UPDATE announcements 
       SET ${updates.join(', ')}
       WHERE id = $${paramIndex} AND school_id = $${paramIndex + 1}
       RETURNING *`,
      params
    );

    return {
      success: true,
      data: result.rows[0],
      message: 'Announcement updated successfully'
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to update announcement'
    };
  } finally {
    client.release();
  }
};

export const deleteAnnouncement = async (
  schoolId: string,
  announcementId: string
): Promise<ServiceResponse> => {
  const client = await pool.connect();
  try {
    const result = await client.query(
      'DELETE FROM announcements WHERE id = $1 AND school_id = $2 RETURNING *',
      [announcementId, schoolId]
    );

    if (result.rows.length === 0) {
      return {
        success: false,
        error: 'Announcement not found'
      };
    }

    return {
      success: true,
      message: 'Announcement deleted successfully'
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to delete announcement'
    };
  } finally {
    client.release();
  }
};
