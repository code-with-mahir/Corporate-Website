import { Request, Response, NextFunction } from 'express';
import { pool } from '../../config/database';
import { successResponse, errorResponse } from '../../utils/response';

export const createParent = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const schoolId = req.user!.school_id;
    const { name, email, phone, address, relationship } = req.body;

    if (!name || !email) {
      res.status(400).json(errorResponse('Name and email are required'));
      return;
    }

    const client = await pool.connect();
    try {
      const query = `
        INSERT INTO parents (school_id, name, email, phone, address, relationship)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `;
      
      const values = [schoolId, name, email, phone || null, address || null, relationship || null];
      const result = await client.query(query, values);

      res.status(201).json(successResponse(result.rows[0], 'Parent created successfully'));
    } finally {
      client.release();
    }
  } catch (error) {
    next(error);
  }
};

export const getParents = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const schoolId = req.user!.school_id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;

    const client = await pool.connect();
    try {
      const query = `
        SELECT p.*,
          (SELECT COUNT(*) FROM student_parents sp WHERE sp.parent_id = p.id) as student_count
        FROM parents p
        WHERE p.school_id = $1
        ORDER BY p.created_at DESC
        LIMIT $2 OFFSET $3
      `;
      
      const countQuery = 'SELECT COUNT(*) FROM parents WHERE school_id = $1';

      const [parentsResult, countResult] = await Promise.all([
        client.query(query, [schoolId, limit, offset]),
        client.query(countQuery, [schoolId])
      ]);

      const total = parseInt(countResult.rows[0].count);
      const totalPages = Math.ceil(total / limit);

      res.status(200).json(successResponse({
        parents: parentsResult.rows,
        pagination: {
          page,
          limit,
          total,
          totalPages
        }
      }, 'Parents retrieved successfully'));
    } finally {
      client.release();
    }
  } catch (error) {
    next(error);
  }
};

export const getParent = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const schoolId = req.user!.school_id;
    const { parentId } = req.params;

    if (!parentId) {
      res.status(400).json(errorResponse('Parent ID is required'));
      return;
    }

    const client = await pool.connect();
    try {
      const query = `
        SELECT p.*,
          json_agg(
            json_build_object(
              'student_id', s.id,
              'student_name', s.name,
              'student_email', s.email
            )
          ) FILTER (WHERE s.id IS NOT NULL) as students
        FROM parents p
        LEFT JOIN student_parents sp ON p.id = sp.parent_id
        LEFT JOIN students s ON sp.student_id = s.id
        WHERE p.id = $1 AND p.school_id = $2
        GROUP BY p.id
      `;
      
      const result = await client.query(query, [parentId, schoolId]);

      if (result.rows.length === 0) {
        res.status(404).json(errorResponse('Parent not found'));
        return;
      }

      res.status(200).json(successResponse(result.rows[0], 'Parent retrieved successfully'));
    } finally {
      client.release();
    }
  } catch (error) {
    next(error);
  }
};

export const linkToStudent = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const schoolId = req.user!.school_id;
    const { parentId } = req.params;
    const { student_id } = req.body;

    if (!parentId || !student_id) {
      res.status(400).json(errorResponse('Parent ID and student ID are required'));
      return;
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const parentCheck = await client.query(
        'SELECT id FROM parents WHERE id = $1 AND school_id = $2',
        [parentId, schoolId]
      );

      if (parentCheck.rows.length === 0) {
        await client.query('ROLLBACK');
        res.status(404).json(errorResponse('Parent not found'));
        return;
      }

      const studentCheck = await client.query(
        'SELECT id FROM students WHERE id = $1 AND school_id = $2',
        [student_id, schoolId]
      );

      if (studentCheck.rows.length === 0) {
        await client.query('ROLLBACK');
        res.status(404).json(errorResponse('Student not found'));
        return;
      }

      const linkQuery = `
        INSERT INTO student_parents (student_id, parent_id)
        VALUES ($1, $2)
        ON CONFLICT (student_id, parent_id) DO NOTHING
        RETURNING *
      `;

      const result = await client.query(linkQuery, [student_id, parentId]);

      await client.query('COMMIT');

      res.status(200).json(successResponse(result.rows[0], 'Parent linked to student successfully'));
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    next(error);
  }
};

export const unlinkFromStudent = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const schoolId = req.user!.school_id;
    const { parentId } = req.params;
    const { student_id } = req.body;

    if (!parentId || !student_id) {
      res.status(400).json(errorResponse('Parent ID and student ID are required'));
      return;
    }

    const client = await pool.connect();
    try {
      const query = `
        DELETE FROM student_parents
        WHERE parent_id = $1 AND student_id = $2
        AND parent_id IN (SELECT id FROM parents WHERE school_id = $3)
        RETURNING *
      `;

      const result = await client.query(query, [parentId, student_id, schoolId]);

      if (result.rows.length === 0) {
        res.status(404).json(errorResponse('Link not found'));
        return;
      }

      res.status(200).json(successResponse(null, 'Parent unlinked from student successfully'));
    } finally {
      client.release();
    }
  } catch (error) {
    next(error);
  }
};

export const updateParent = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const schoolId = req.user!.school_id;
    const { parentId } = req.params;
    const { name, email, phone, address, relationship } = req.body;

    if (!parentId) {
      res.status(400).json(errorResponse('Parent ID is required'));
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
      if (email !== undefined) {
        updates.push(`email = $${paramCount++}`);
        values.push(email);
      }
      if (phone !== undefined) {
        updates.push(`phone = $${paramCount++}`);
        values.push(phone);
      }
      if (address !== undefined) {
        updates.push(`address = $${paramCount++}`);
        values.push(address);
      }
      if (relationship !== undefined) {
        updates.push(`relationship = $${paramCount++}`);
        values.push(relationship);
      }

      if (updates.length === 0) {
        res.status(400).json(errorResponse('No valid fields to update'));
        return;
      }

      updates.push(`updated_at = CURRENT_TIMESTAMP`);
      values.push(parentId, schoolId);

      const query = `
        UPDATE parents
        SET ${updates.join(', ')}
        WHERE id = $${paramCount++} AND school_id = $${paramCount++}
        RETURNING *
      `;

      const result = await client.query(query, values);

      if (result.rows.length === 0) {
        res.status(404).json(errorResponse('Parent not found'));
        return;
      }

      res.status(200).json(successResponse(result.rows[0], 'Parent updated successfully'));
    } finally {
      client.release();
    }
  } catch (error) {
    next(error);
  }
};

export const deleteParent = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const schoolId = req.user!.school_id;
    const { parentId } = req.params;

    if (!parentId) {
      res.status(400).json(errorResponse('Parent ID is required'));
      return;
    }

    const client = await pool.connect();
    try {
      const query = 'DELETE FROM parents WHERE id = $1 AND school_id = $2 RETURNING id';
      const result = await client.query(query, [parentId, schoolId]);

      if (result.rows.length === 0) {
        res.status(404).json(errorResponse('Parent not found'));
        return;
      }

      res.status(200).json(successResponse(null, 'Parent deleted successfully'));
    } finally {
      client.release();
    }
  } catch (error) {
    next(error);
  }
};
