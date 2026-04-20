import { Request, Response, NextFunction } from 'express';
import * as authService from '../services/auth.service';
import { successResponse, errorResponse, unauthorizedResponse } from '../utils/response';
import { pool } from '../config/database';

export const login = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email, password } = req.body;
    const schoolSlug = req.query.school as string || req.body.school;

    if (!schoolSlug) {
      res.status(400).json(errorResponse('School slug is required'));
      return;
    }

    const result = await authService.login(email, password, schoolSlug);

    if (!result.success) {
      res.status(401).json(errorResponse(result.error || 'Login failed'));
      return;
    }

    res.status(200).json(successResponse(result.data, 'Login successful'));
  } catch (error) {
    next(error);
  }
};

export const refreshToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { refreshToken: refreshTokenValue } = req.body;

    if (!refreshTokenValue) {
      res.status(400).json(errorResponse('Refresh token is required'));
      return;
    }

    const result = await authService.refreshToken(refreshTokenValue);

    if (!result.success) {
      res.status(401).json(errorResponse(result.error || 'Invalid or expired refresh token'));
      return;
    }

    res.status(200).json(successResponse(result.data, 'Token refreshed successfully'));
  } catch (error) {
    next(error);
  }
};

export const logout = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user?.id) {
      res.status(401).json(unauthorizedResponse('User not authenticated'));
      return;
    }

    const userId = parseInt(req.user.id);
    const result = await authService.logout(userId);

    if (!result.success) {
      res.status(400).json(errorResponse(result.error || 'Logout failed'));
      return;
    }

    res.status(200).json(successResponse(null, result.message || 'Logged out successfully'));
  } catch (error) {
    next(error);
  }
};

export const getMe = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user?.id) {
      res.status(401).json(unauthorizedResponse('User not authenticated'));
      return;
    }

    const userId = parseInt(req.user.id);
    const client = await pool.connect();

    try {
      let query: string;
      let params: any[];

      if (req.user.school_id) {
        query = `
          SELECT u.id, u.name, u.email, u.role, u.school_id, u.is_active, 
                 u.created_at, u.last_login,
                 s.id as "school.id", s.name as "school.name", 
                 s.slug as "school.slug", s.is_active as "school.is_active"
          FROM users u
          INNER JOIN schools s ON u.school_id = s.id
          WHERE u.id = $1
        `;
        params = [userId];
      } else {
        query = `
          SELECT id, name, email, role, school_id, is_active, created_at, last_login
          FROM users
          WHERE id = $1
        `;
        params = [userId];
      }

      const result = await client.query(query, params);

      if (result.rows.length === 0) {
        res.status(404).json(errorResponse('User not found'));
        return;
      }

      const user = result.rows[0];

      if (req.user.school_id) {
        const school = {
          id: user['school.id'],
          name: user['school.name'],
          slug: user['school.slug'],
          is_active: user['school.is_active']
        };

        delete user['school.id'];
        delete user['school.name'];
        delete user['school.slug'];
        delete user['school.is_active'];

        user.school = school;
      }

      res.status(200).json(successResponse(user, 'User profile retrieved successfully'));
    } finally {
      client.release();
    }
  } catch (error) {
    next(error);
  }
};
