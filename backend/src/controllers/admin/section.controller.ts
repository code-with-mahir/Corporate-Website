import { Request, Response, NextFunction } from 'express';
import { pool } from '../../config/database';
import { successResponse, errorResponse } from '../../utils/response';

export const createSection = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const schoolId = req.user!.school_id;
    const { class_id, name, capacity, description } = req.body;

    if (!class_id || !name) {
      res.status(400).json(errorResponse('Class ID and name are required'));
      return;
    }

    const client = await pool.connect();
    try {
      const query = `
        INSERT INTO sections (school_id, class_id, name, capacity, description)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `;
      
      const values = [schoolId, class_id, name, capacity || null, description || null];
      const result = await client.query(query, values);

      res.status(201).json(successResponse(result.rows[0], 'Section created successfully'));
    } finally {
      client.release();
    }
  } catch (error) {
    next(error);
  }
};

export const getSections = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const schoolId = req.user!.school_id;
    const classId = req.query.class_id as string;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;

    const client = await pool.connect();
    try {
      let query = `
        SELECT s.*, c.name as class_name
        FROM sections s
        LEFT JOIN classes c ON s.class_id = c.id
        WHERE s.school_id = $1
      `;
      let countQuery = 'SELECT COUNT(*) FROM sections WHERE school_id = $1';
      const params: any[] = [schoolId];

      if (classId) {
        query += ' AND s.class_id = $2';
        countQuery += ' AND class_id = $2';
        params.push(classId);
      }

      query += ' ORDER BY s.created_at DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
      params.push(limit, offset);

      const [sectionsResult, countResult] = await Promise.all([
        client.query(query, params),
        client.query(countQuery, classId ? [schoolId, classId] : [schoolId])
      ]);

      const total = parseInt(countResult.rows[0].count);
      const totalPages = Math.ceil(total / limit);

      res.status(200).json(successResponse({
        sections: sectionsResult.rows,
        pagination: {
          page,
          limit,
          total,
          totalPages
        }
      }, 'Sections retrieved successfully'));
    } finally {
      client.release();
    }
  } catch (error) {
    next(error);
  }
};

export const getSection = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const schoolId = req.user!.school_id;
    const { sectionId } = req.params;

    if (!sectionId) {
      res.status(400).json(errorResponse('Section ID is required'));
      return;
    }

    const client = await pool.connect();
    try {
      const query = `
        SELECT s.*, c.name as class_name
        FROM sections s
        LEFT JOIN classes c ON s.class_id = c.id
        WHERE s.id = $1 AND s.school_id = $2
      `;
      
      const result = await client.query(query, [sectionId, schoolId]);

      if (result.rows.length === 0) {
        res.status(404).json(errorResponse('Section not found'));
        return;
      }

      res.status(200).json(successResponse(result.rows[0], 'Section retrieved successfully'));
    } finally {
      client.release();
    }
  } catch (error) {
    next(error);
  }
};

export const updateSection = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const schoolId = req.user!.school_id;
    const { sectionId } = req.params;
    const { name, capacity, description } = req.body;

    if (!sectionId) {
      res.status(400).json(errorResponse('Section ID is required'));
      return;
    }

    const client = await pool.connect();
    try {
      const updates: string[] = [];
      const values: any[] = [];
      let paramCount = 1;

      if (name !== undefined) {
        updates.push(`name = $${paramCount++}`);
        values.push(name);
      }
      if (capacity !== undefined) {
        updates.push(`capacity = $${paramCount++}`);
        values.push(capacity);
      }
      if (description !== undefined) {
        updates.push(`description = $${paramCount++}`);
        values.push(description);
      }

      if (updates.length === 0) {
        res.status(400).json(errorResponse('No valid fields to update'));
        return;
      }

      updates.push(`updated_at = CURRENT_TIMESTAMP`);
      values.push(sectionId, schoolId);

      const query = `
        UPDATE sections
        SET ${updates.join(', ')}
        WHERE id = $${paramCount++} AND school_id = $${paramCount++}
        RETURNING *
      `;

      const result = await client.query(query, values);

      if (result.rows.length === 0) {
        res.status(404).json(errorResponse('Section not found'));
        return;
      }

      res.status(200).json(successResponse(result.rows[0], 'Section updated successfully'));
    } finally {
      client.release();
    }
  } catch (error) {
    next(error);
  }
};

export const deleteSection = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const schoolId = req.user!.school_id;
    const { sectionId } = req.params;

    if (!sectionId) {
      res.status(400).json(errorResponse('Section ID is required'));
      return;
    }

    const client = await pool.connect();
    try {
      const query = 'DELETE FROM sections WHERE id = $1 AND school_id = $2 RETURNING id';
      const result = await client.query(query, [sectionId, schoolId]);

      if (result.rows.length === 0) {
        res.status(404).json(errorResponse('Section not found'));
        return;
      }

      res.status(200).json(successResponse(null, 'Section deleted successfully'));
    } finally {
      client.release();
    }
  } catch (error) {
    next(error);
  }
};
