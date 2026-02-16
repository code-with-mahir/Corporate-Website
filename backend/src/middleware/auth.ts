import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';
import { query } from '../config/database';

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        message: 'Authorization token required',
      });
      return;
    }

    const token = authHeader.substring(7);

    const payload = verifyToken(token);

    let userResult;
    if (payload.role === 'super_admin') {
      userResult = await query(
        `SELECT id, email, 'super_admin' as role, name, is_active 
         FROM super_admins 
         WHERE id = $1`,
        [payload.id]
      );
    } else {
      userResult = await query(
        `SELECT u.id, u.email, r.name as role, u.school_id, u.is_active
         FROM users u
         JOIN roles r ON u.role_id = r.id
         WHERE u.id = $1`,
        [payload.id]
      );
    }

    if (!userResult.rows.length) {
      res.status(401).json({
        success: false,
        message: 'User not found',
      });
      return;
    }

    const user = userResult.rows[0];

    if (!user.is_active) {
      res.status(401).json({
        success: false,
        message: 'Account is inactive',
      });
      return;
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      school_id: user.school_id,
    };

    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      message: error instanceof Error ? error.message : 'Invalid or expired token',
    });
  }
};
