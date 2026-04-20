import { Request, Response, NextFunction } from 'express';
import { pool } from '../../config/database';
import { successResponse, errorResponse } from '../../utils/response';

export const createSubject = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const schoolId = req.user!.school_id;
    const { name, code, description, class_id } = req.body;

    if (!name) {
      res.status(400).json(errorResponse('Subject name is required'));
      return;
    }

    const client = await pool.connect();
    try {
      const query = `
        INSERT INTO subjects (school_id, name, code, description, class_id)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `;
      
      const values = [schoolId, name, code || null, description || null, class_id || null];
      const result = await client.query(query, values);

      res.status(201).json(successResponse(result.rows[0], 'Subject created successfully'));
    } finally {
      client.release();
    }
  } catch (error) {
    next(error);
  }
};

export const getSubjects = async (
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
        FROM subjects s
        LEFT JOIN classes c ON s.class_id = c.id
        WHERE s.school_id = $1
      `;
      let countQuery = 'SELECT COUNT(*) FROM subjects WHERE school_id = $1';
      const params: any[] = [schoolId];

      if (classId) {
        query += ' AND s.class_id = $2';
        countQuery += ' AND class_id = $2';
        params.push(classId);
      }

      query += ' ORDER BY s.created_at DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
      params.push(limit, offset);

      const [subjectsResult, countResult] = await Promise.all([
        client.query(query, params),
        client.query(countQuery, classId ? [schoolId, classId] : [schoolId])
      ]);

      const total = parseInt(countResult.rows[0].count);
      const totalPages = Math.ceil(total / limit);

      res.status(200).json(successResponse({
        subjects: subjectsResult.rows,
        pagination: {
          page,
          limit,
          total,
          totalPages
        }
      }, 'Subjects retrieved successfully'));
    } finally {
      client.release();
    }
  } catch (error) {
    next(error);
  }
};

export const getSubject = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const schoolId = req.user!.school_id;
    const { subjectId } = req.params;

    if (!subjectId) {
      res.status(400).json(errorResponse('Subject ID is required'));
      return;
    }

    const client = await pool.connect();
    try {
      const query = `
        SELECT s.*, c.name as class_name
        FROM subjects s
        LEFT JOIN classes c ON s.class_id = c.id
        WHERE s.id = $1 AND s.school_id = $2
      `;
      
      const result = await client.query(query, [subjectId, schoolId]);

      if (result.rows.length === 0) {
        res.status(404).json(errorResponse('Subject not found'));
        return;
      }

      res.status(200).json(successResponse(result.rows[0], 'Subject retrieved successfully'));
    } finally {
      client.release();
    }
  } catch (error) {
    next(error);
  }
};

export const updateSubject = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const schoolId = req.user!.school_id;
    const { subjectId } = req.params;
    const { name, code, description, class_id } = req.body;

    if (!subjectId) {
      res.status(400).json(errorResponse('Subject ID is required'));
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
      if (code !== undefined) {
        updates.push(`code = $${paramCount++}`);
        values.push(code);
      }
      if (description !== undefined) {
        updates.push(`description = $${paramCount++}`);
        values.push(description);
      }
      if (class_id !== undefined) {
        updates.push(`class_id = $${paramCount++}`);
        values.push(class_id);
      }

      if (updates.length === 0) {
        res.status(400).json(errorResponse('No valid fields to update'));
        return;
      }

      updates.push(`updated_at = CURRENT_TIMESTAMP`);
      values.push(subjectId, schoolId);

      const query = `
        UPDATE subjects
        SET ${updates.join(', ')}
        WHERE id = $${paramCount++} AND school_id = $${paramCount++}
        RETURNING *
      `;

      const result = await client.query(query, values);

      if (result.rows.length === 0) {
        res.status(404).json(errorResponse('Subject not found'));
        return;
      }

      res.status(200).json(successResponse(result.rows[0], 'Subject updated successfully'));
    } finally {
      client.release();
    }
  } catch (error) {
    next(error);
  }
};

export const deleteSubject = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const schoolId = req.user!.school_id;
    const { subjectId } = req.params;

    if (!subjectId) {
      res.status(400).json(errorResponse('Subject ID is required'));
      return;
    }

    const client = await pool.connect();
    try {
      const query = 'DELETE FROM subjects WHERE id = $1 AND school_id = $2 RETURNING id';
      const result = await client.query(query, [subjectId, schoolId]);

      if (result.rows.length === 0) {
        res.status(404).json(errorResponse('Subject not found'));
        return;
      }

      res.status(200).json(successResponse(null, 'Subject deleted successfully'));
    } finally {
      client.release();
    }
  } catch (error) {
    next(error);
  }
};
