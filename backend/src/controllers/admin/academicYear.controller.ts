import { Request, Response, NextFunction } from 'express';
import * as academicYearService from '../../services/academicYear.service';
import { successResponse, errorResponse } from '../../utils/response';

export const createAcademicYear = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const schoolId = parseInt(req.user!.school_id);
    const { name, start_date, end_date } = req.body;

    if (!name || !start_date || !end_date) {
      res.status(400).json(errorResponse('Name, start date, and end date are required'));
      return;
    }

    const result = await academicYearService.createAcademicYear(schoolId, {
      name,
      start_date: new Date(start_date),
      end_date: new Date(end_date)
    });

    if (!result.success) {
      res.status(400).json(errorResponse(result.error || 'Failed to create academic year'));
      return;
    }

    res.status(201).json(successResponse(result.data, 'Academic year created successfully'));
  } catch (error) {
    next(error);
  }
};

export const getAcademicYears = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const schoolId = parseInt(req.user!.school_id);
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    const result = await academicYearService.getAcademicYears(schoolId, page, limit);

    if (!result.success) {
      res.status(400).json(errorResponse(result.error || 'Failed to fetch academic years'));
      return;
    }

    res.status(200).json(successResponse(result.data, 'Academic years retrieved successfully'));
  } catch (error) {
    next(error);
  }
};

export const getCurrentYear = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const schoolId = parseInt(req.user!.school_id);

    const result = await academicYearService.getCurrentAcademicYear(schoolId);

    if (!result.success) {
      res.status(400).json(errorResponse(result.error || 'Failed to fetch current academic year'));
      return;
    }

    res.status(200).json(successResponse(result.data, 'Current academic year retrieved successfully'));
  } catch (error) {
    next(error);
  }
};

export const setCurrentYear = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const schoolId = parseInt(req.user!.school_id);
    const { yearId } = req.params;

    if (!yearId) {
      res.status(400).json(errorResponse('Year ID is required'));
      return;
    }

    const result = await academicYearService.setCurrentAcademicYear(schoolId, parseInt(yearId));

    if (!result.success) {
      res.status(400).json(errorResponse(result.error || 'Failed to set current academic year'));
      return;
    }

    res.status(200).json(successResponse(result.data, 'Current academic year set successfully'));
  } catch (error) {
    next(error);
  }
};

export const closeYear = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const schoolId = parseInt(req.user!.school_id);
    const { yearId } = req.params;

    if (!yearId) {
      res.status(400).json(errorResponse('Year ID is required'));
      return;
    }

    const result = await academicYearService.closeAcademicYear(schoolId, parseInt(yearId));

    if (!result.success) {
      res.status(400).json(errorResponse(result.error || 'Failed to close academic year'));
      return;
    }

    res.status(200).json(successResponse(result.data, 'Academic year closed successfully'));
  } catch (error) {
    next(error);
  }
};

export const updateYear = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const schoolId = parseInt(req.user!.school_id);
    const { yearId } = req.params;
    const updateData = req.body;

    if (!yearId) {
      res.status(400).json(errorResponse('Year ID is required'));
      return;
    }

    const result = await academicYearService.updateAcademicYear(schoolId, parseInt(yearId), updateData);

    if (!result.success) {
      res.status(400).json(errorResponse(result.error || 'Failed to update academic year'));
      return;
    }

    res.status(200).json(successResponse(result.data, 'Academic year updated successfully'));
  } catch (error) {
    next(error);
  }
};
