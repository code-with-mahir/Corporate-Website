import { Request, Response, NextFunction } from 'express';
import * as authService from '../services/auth.service';
import * as schoolService from '../services/school.service';
import { successResponse, errorResponse } from '../utils/response';
import { pool } from '../config/database';

export const login = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email, password } = req.body;

    const result = await authService.login(email, password);

    if (!result.success) {
      res.status(401).json(errorResponse(result.error || 'Login failed'));
      return;
    }

    res.status(200).json(successResponse(result.data, 'Login successful'));
  } catch (error) {
    next(error);
  }
};

export const getSchools = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    const result = await schoolService.getSchools(page, limit);

    if (!result.success) {
      res.status(400).json(errorResponse(result.error || 'Failed to fetch schools'));
      return;
    }

    res.status(200).json(successResponse(result.data, 'Schools retrieved successfully'));
  } catch (error) {
    next(error);
  }
};

export const createSchool = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const {
      name,
      slug,
      email,
      phone,
      address,
      admin_email,
      admin_password,
      admin_name
    } = req.body;

    const result = await schoolService.createSchool({
      name,
      slug,
      email,
      phone,
      address,
      admin_email,
      admin_password,
      admin_name
    });

    if (!result.success) {
      res.status(400).json(errorResponse(result.error || 'Failed to create school'));
      return;
    }

    res.status(201).json(successResponse(result.data, result.message || 'School created successfully'));
  } catch (error) {
    next(error);
  }
};

export const getSchool = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const schoolId = parseInt(req.params.id);

    if (isNaN(schoolId)) {
      res.status(400).json(errorResponse('Invalid school ID'));
      return;
    }

    const result = await schoolService.getSchoolById(schoolId);

    if (!result.success) {
      res.status(404).json(errorResponse(result.error || 'School not found'));
      return;
    }

    res.status(200).json(successResponse(result.data, 'School retrieved successfully'));
  } catch (error) {
    next(error);
  }
};

export const updateSchool = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const schoolId = parseInt(req.params.id);
    const { name, email, phone, address } = req.body;

    if (isNaN(schoolId)) {
      res.status(400).json(errorResponse('Invalid school ID'));
      return;
    }

    const result = await schoolService.updateSchool(schoolId, {
      name,
      email,
      phone,
      address
    });

    if (!result.success) {
      res.status(400).json(errorResponse(result.error || 'Failed to update school'));
      return;
    }

    res.status(200).json(successResponse(result.data, result.message || 'School updated successfully'));
  } catch (error) {
    next(error);
  }
};

export const activateSchool = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const schoolId = parseInt(req.params.id);

    if (isNaN(schoolId)) {
      res.status(400).json(errorResponse('Invalid school ID'));
      return;
    }

    const result = await schoolService.activateSchool(schoolId);

    if (!result.success) {
      res.status(400).json(errorResponse(result.error || 'Failed to activate school'));
      return;
    }

    res.status(200).json(successResponse(result.data, result.message || 'School activated successfully'));
  } catch (error) {
    next(error);
  }
};

export const deactivateSchool = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const schoolId = parseInt(req.params.id);

    if (isNaN(schoolId)) {
      res.status(400).json(errorResponse('Invalid school ID'));
      return;
    }

    const result = await schoolService.deactivateSchool(schoolId);

    if (!result.success) {
      res.status(400).json(errorResponse(result.error || 'Failed to deactivate school'));
      return;
    }

    res.status(200).json(successResponse(result.data, result.message || 'School deactivated successfully'));
  } catch (error) {
    next(error);
  }
};

export const getSubscriptions = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const status = req.query.status as string;
    const offset = (page - 1) * limit;

    const client = await pool.connect();

    try {
      let query = `
        SELECT s.*, sch.name as school_name, sch.slug as school_slug, sch.email as school_email
        FROM subscriptions s
        INNER JOIN schools sch ON s.school_id = sch.id
      `;
      const params: any[] = [];

      if (status) {
        query += ' WHERE s.status = $1';
        params.push(status);
        query += ' ORDER BY s.created_at DESC LIMIT $2 OFFSET $3';
        params.push(limit, offset);
      } else {
        query += ' ORDER BY s.created_at DESC LIMIT $1 OFFSET $2';
        params.push(limit, offset);
      }

      const countQuery = status
        ? 'SELECT COUNT(*) FROM subscriptions WHERE status = $1'
        : 'SELECT COUNT(*) FROM subscriptions';
      const countParams = status ? [status] : [];

      const [result, countResult] = await Promise.all([
        client.query(query, params),
        client.query(countQuery, countParams)
      ]);

      const total = parseInt(countResult.rows[0].count);
      const totalPages = Math.ceil(total / limit);

      res.status(200).json(
        successResponse(
          {
            subscriptions: result.rows,
            pagination: {
              page,
              limit,
              total,
              totalPages
            }
          },
          'Subscriptions retrieved successfully'
        )
      );
    } finally {
      client.release();
    }
  } catch (error) {
    next(error);
  }
};

export const getPayments = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const status = req.query.status as string;
    const offset = (page - 1) * limit;

    const client = await pool.connect();

    try {
      let query = `
        SELECT p.*, s.name as school_name, s.slug as school_slug, s.email as school_email
        FROM payments p
        INNER JOIN schools s ON p.school_id = s.id
      `;
      const params: any[] = [];

      if (status) {
        query += ' WHERE p.status = $1';
        params.push(status);
        query += ' ORDER BY p.created_at DESC LIMIT $2 OFFSET $3';
        params.push(limit, offset);
      } else {
        query += ' ORDER BY p.created_at DESC LIMIT $1 OFFSET $2';
        params.push(limit, offset);
      }

      const countQuery = status
        ? 'SELECT COUNT(*) FROM payments WHERE status = $1'
        : 'SELECT COUNT(*) FROM payments';
      const countParams = status ? [status] : [];

      const [result, countResult] = await Promise.all([
        client.query(query, params),
        client.query(countQuery, countParams)
      ]);

      const total = parseInt(countResult.rows[0].count);
      const totalPages = Math.ceil(total / limit);

      res.status(200).json(
        successResponse(
          {
            payments: result.rows,
            pagination: {
              page,
              limit,
              total,
              totalPages
            }
          },
          'Payments retrieved successfully'
        )
      );
    } finally {
      client.release();
    }
  } catch (error) {
    next(error);
  }
};

export const getDashboardStats = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const client = await pool.connect();

    try {
      const [
        totalSchools,
        activeSchools,
        totalSubscriptions,
        activeSubscriptions,
        totalRevenue,
        monthlyRevenue,
        totalUsers
      ] = await Promise.all([
        client.query('SELECT COUNT(*) FROM schools'),
        client.query('SELECT COUNT(*) FROM schools WHERE is_active = true'),
        client.query('SELECT COUNT(*) FROM subscriptions'),
        client.query('SELECT COUNT(*) FROM subscriptions WHERE status = $1', ['active']),
        client.query('SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE status = $1', ['completed']),
        client.query(
          `SELECT COALESCE(SUM(amount), 0) as total 
           FROM payments 
           WHERE status = $1 AND created_at >= DATE_TRUNC('month', CURRENT_DATE)`,
          ['completed']
        ),
        client.query('SELECT COUNT(*) FROM users WHERE role != $1', ['super_admin'])
      ]);

      const recentPayments = await client.query(
        `SELECT p.*, s.name as school_name 
         FROM payments p
         INNER JOIN schools s ON p.school_id = s.id
         ORDER BY p.created_at DESC
         LIMIT 10`
      );

      const expiringSubscriptions = await client.query(
        `SELECT s.*, sch.name as school_name, sch.email as school_email
         FROM subscriptions s
         INNER JOIN schools sch ON s.school_id = sch.id
         WHERE s.status = 'active' 
           AND s.end_date > NOW() 
           AND s.end_date <= NOW() + INTERVAL '7 days'
         ORDER BY s.end_date ASC`
      );

      const stats = {
        schools: {
          total: parseInt(totalSchools.rows[0].count),
          active: parseInt(activeSchools.rows[0].count),
          inactive: parseInt(totalSchools.rows[0].count) - parseInt(activeSchools.rows[0].count)
        },
        subscriptions: {
          total: parseInt(totalSubscriptions.rows[0].count),
          active: parseInt(activeSubscriptions.rows[0].count)
        },
        revenue: {
          total: parseFloat(totalRevenue.rows[0].total),
          monthly: parseFloat(monthlyRevenue.rows[0].total)
        },
        users: {
          total: parseInt(totalUsers.rows[0].count)
        },
        recentPayments: recentPayments.rows,
        expiringSubscriptions: expiringSubscriptions.rows
      };

      res.status(200).json(successResponse(stats, 'Dashboard statistics retrieved successfully'));
    } finally {
      client.release();
    }
  } catch (error) {
    next(error);
  }
};
