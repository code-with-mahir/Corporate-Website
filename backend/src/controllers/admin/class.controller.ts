import { Request, Response, NextFunction } from 'express';
import * as classService from '../../services/class.service';
import { successResponse, errorResponse } from '../../utils/response';

export const createClass = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const schoolId = req.user!.school_id;
    const { academic_year_id, name, section, capacity, description } = req.body;

    if (!academic_year_id || !name) {
      res.status(400).json(errorResponse('Academic year ID and name are required'));
      return;
    }

    const result = await classService.createClass(schoolId, academic_year_id, {
      name,
      section,
      capacity,
      description
    });

    if (!result.success) {
      res.status(400).json(errorResponse(result.error || 'Failed to create class'));
      return;
    }

    res.status(201).json(successResponse(result.data, 'Class created successfully'));
  } catch (error) {
    next(error);
  }
};

export const getClasses = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const schoolId = req.user!.school_id;
    const academicYearId = req.query.academic_year_id as string;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    if (!academicYearId) {
      res.status(400).json(errorResponse('Academic year ID is required'));
      return;
    }

    const result = await classService.getClasses(schoolId, academicYearId, page, limit);

    if (!result.success) {
      res.status(400).json(errorResponse(result.error || 'Failed to fetch classes'));
      return;
    }

    res.status(200).json(successResponse(result.data, 'Classes retrieved successfully'));
  } catch (error) {
    next(error);
  }
};

export const getClass = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const schoolId = req.user!.school_id;
    const { classId } = req.params;

    if (!classId) {
      res.status(400).json(errorResponse('Class ID is required'));
      return;
    }

    const result = await classService.getClassById(schoolId, classId);

    if (!result.success) {
      res.status(400).json(errorResponse(result.error || 'Failed to fetch class'));
      return;
    }

    res.status(200).json(successResponse(result.data, 'Class retrieved successfully'));
  } catch (error) {
    next(error);
  }
};

export const updateClass = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const schoolId = req.user!.school_id;
    const { classId } = req.params;
    const updateData = req.body;

    if (!classId) {
      res.status(400).json(errorResponse('Class ID is required'));
      return;
    }

    const result = await classService.updateClass(schoolId, classId, updateData);

    if (!result.success) {
      res.status(400).json(errorResponse(result.error || 'Failed to update class'));
      return;
    }

    res.status(200).json(successResponse(result.data, 'Class updated successfully'));
  } catch (error) {
    next(error);
  }
};

export const deleteClass = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const schoolId = req.user!.school_id;
    const { classId } = req.params;

    if (!classId) {
      res.status(400).json(errorResponse('Class ID is required'));
      return;
    }

    const result = await classService.deleteClass(schoolId, classId);

    if (!result.success) {
      res.status(400).json(errorResponse(result.error || 'Failed to delete class'));
      return;
    }

    res.status(200).json(successResponse(null, 'Class deleted successfully'));
  } catch (error) {
    next(error);
  }
};
