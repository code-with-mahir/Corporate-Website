import { Request, Response, NextFunction } from 'express';
import { query } from '../config/database';

export const extractSchool = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    let schoolSlug: string | undefined;

    const xSchoolSlug = req.headers['x-school-slug'];
    if (xSchoolSlug) {
      schoolSlug = Array.isArray(xSchoolSlug) ? xSchoolSlug[0] : xSchoolSlug;
    } else if (req.headers.host) {
      const host = req.headers.host;
      const subdomain = host.split('.')[0];
      
      if (subdomain && subdomain !== 'www' && subdomain !== 'api') {
        schoolSlug = subdomain;
      }
    }

    if (!schoolSlug) {
      res.status(400).json({
        success: false,
        message: 'School identifier not provided',
      });
      return;
    }

    const result = await query(
      `SELECT id, name, code, is_active 
       FROM schools 
       WHERE code = $1`,
      [schoolSlug]
    );

    if (!result.rows.length) {
      res.status(404).json({
        success: false,
        message: 'School not found',
      });
      return;
    }

    const school = result.rows[0];

    if (!school.is_active) {
      res.status(403).json({
        success: false,
        message: 'School is inactive',
      });
      return;
    }

    req.school = {
      id: school.id,
      name: school.name,
      code: school.code,
    };
    req.schoolId = school.id;

    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to extract school context',
    });
  }
};
