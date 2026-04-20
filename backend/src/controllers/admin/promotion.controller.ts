import { Request, Response, NextFunction } from 'express';
import * as promotionService from '../../services/promotion.service';
import { successResponse, errorResponse } from '../../utils/response';

export const runPromotion = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const schoolId = req.user!.school_id;
    const { from_year_id, to_year_id, from_class_id, to_class_id, min_percentage } = req.body;

    if (!from_year_id || !to_year_id || !from_class_id || !to_class_id) {
      res.status(400).json(errorResponse('All promotion parameters are required'));
      return;
    }

    const result = await promotionService.runPromotion(
      schoolId,
      from_class_id,
      to_class_id,
      from_year_id,
      to_year_id,
      min_percentage || 40
    );

    if (!result.success) {
      res.status(400).json(errorResponse(result.error || 'Failed to run promotion'));
      return;
    }

    res.status(200).json(successResponse(result.data, 'Bulk promotion completed successfully'));
  } catch (error) {
    next(error);
  }
};

export const promoteStudent = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const schoolId = req.user!.school_id;
    const { studentId } = req.params;
    const { to_year_id, to_class_id, to_section_id, remarks } = req.body;

    if (!studentId || !to_year_id || !to_class_id) {
      res.status(400).json(errorResponse('Student ID, target year, and target class are required'));
      return;
    }

    const result = await promotionService.promoteStudent(schoolId, studentId, {
      to_class_id,
      to_section_id,
      academic_year_id: to_year_id,
      remarks
    });

    if (!result.success) {
      res.status(400).json(errorResponse(result.error || 'Failed to promote student'));
      return;
    }

    res.status(200).json(successResponse(result.data, 'Student promoted successfully'));
  } catch (error) {
    next(error);
  }
};

export const getPromotionLogs = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const schoolId = req.user!.school_id;
    const academicYearId = req.query.academic_year_id as string || '';
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    const result = await promotionService.getPromotionLogs(
      schoolId,
      academicYearId,
      page,
      limit
    );

    if (!result.success) {
      res.status(400).json(errorResponse(result.error || 'Failed to fetch promotion logs'));
      return;
    }

    res.status(200).json(successResponse(result.data, 'Promotion logs retrieved successfully'));
  } catch (error) {
    next(error);
  }
};
