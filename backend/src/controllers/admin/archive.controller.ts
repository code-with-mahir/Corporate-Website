import { Request, Response, NextFunction } from 'express';
import * as archiveService from '../../services/archive.service';
import { successResponse, errorResponse } from '../../utils/response';

export const archiveYear = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const schoolId = req.user!.school_id;
    const { yearId } = req.params;

    if (!yearId) {
      res.status(400).json(errorResponse('Year ID is required'));
      return;
    }

    const result = await archiveService.archiveAcademicYear(schoolId, yearId);

    if (!result.success) {
      res.status(400).json(errorResponse(result.error || 'Failed to archive academic year'));
      return;
    }

    res.status(200).json(successResponse(result.data, 'Academic year archived successfully'));
  } catch (error) {
    next(error);
  }
};

export const exportAttendance = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const schoolId = req.user!.school_id;
    const { academic_year_id } = req.query;

    if (!academic_year_id) {
      res.status(400).json(errorResponse('Academic year ID is required'));
      return;
    }

    const result = await archiveService.exportAttendanceCSV(
      schoolId,
      academic_year_id as string
    );

    if (!result.success) {
      res.status(400).json(errorResponse(result.error || 'Failed to export attendance'));
      return;
    }

    res.status(200).json(successResponse(result.data, 'Attendance exported successfully'));
  } catch (error) {
    next(error);
  }
};

export const exportStudents = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const schoolId = req.user!.school_id;
    const { academic_year_id } = req.query;

    if (!academic_year_id) {
      res.status(400).json(errorResponse('Academic year ID is required'));
      return;
    }

    const result = await archiveService.exportStudentDataCSV(
      schoolId,
      academic_year_id as string
    );

    if (!result.success) {
      res.status(400).json(errorResponse(result.error || 'Failed to export students'));
      return;
    }

    res.status(200).json(successResponse(result.data, 'Students exported successfully'));
  } catch (error) {
    next(error);
  }
};

export const exportSchoolData = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const schoolId = req.user!.school_id;

    const result = await archiveService.exportSchoolDataJSON(schoolId);

    if (!result.success) {
      res.status(400).json(errorResponse(result.error || 'Failed to export school data'));
      return;
    }

    res.status(200).json(successResponse(result.data, 'School data exported successfully'));
  } catch (error) {
    next(error);
  }
};

export const createBackup = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const schoolId = req.user!.school_id;
    const { academic_year_id } = req.body;

    if (!academic_year_id) {
      res.status(400).json(errorResponse('Academic year ID is required'));
      return;
    }

    const result = await archiveService.createBackupZip(schoolId, academic_year_id);

    if (!result.success) {
      res.status(400).json(errorResponse(result.error || 'Failed to create backup'));
      return;
    }

    res.status(201).json(successResponse(result.data, 'Backup created successfully'));
  } catch (error) {
    next(error);
  }
};
