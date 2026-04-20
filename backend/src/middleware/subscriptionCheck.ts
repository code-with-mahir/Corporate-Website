import { Request, Response, NextFunction } from 'express';
import { query } from '../config/database';

export const checkSubscription = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.schoolId) {
      res.status(400).json({
        success: false,
        message: 'School context required',
      });
      return;
    }

    const result = await query(
      `SELECT p.id, p.status, p.subscription_id, 
              p.payment_date + (s.duration_months || ' months')::interval as end_date
       FROM payments p
       JOIN subscriptions s ON p.subscription_id = s.id
       WHERE p.school_id = $1 
         AND p.status = 'completed'
         AND p.payment_date + (s.duration_months || ' months')::interval > NOW()
       ORDER BY p.payment_date DESC
       LIMIT 1`,
      [req.schoolId]
    );

    if (!result.rows.length) {
      res.status(402).json({
        success: false,
        message: 'No active subscription found. Please subscribe to continue.',
      });
      return;
    }

    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to verify subscription',
    });
  }
};
