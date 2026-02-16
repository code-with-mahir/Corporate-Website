import { Request, Response, NextFunction } from 'express';
import * as teacherService from '../../services/teacher.service';
import { successResponse, errorResponse } from '../../utils/response';

export const createTeacher = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const schoolId = req.user!.school_id;
    const teacherData = req.body;

    if (!teacherData.name || !teacherData.email) {
      res.status(400).json(errorResponse('Name and email are required'));
      return;
    }

    const result = await teacherService.createTeacher(schoolId, teacherData);

    if (!result.success) {
      res.status(400).json(errorResponse(result.error || 'Failed to create teacher'));
      return;
    }

    res.status(201).json(successResponse(result.data, 'Teacher created successfully'));
  } catch (error) {
    next(error);
  }
};

export const getTeachers = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const schoolId = req.user!.school_id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    const result = await teacherService.getTeachers(schoolId, page, limit);

    if (!result.success) {
      res.status(400).json(errorResponse(result.error || 'Failed to fetch teachers'));
      return;
    }

    res.status(200).json(successResponse(result.data, 'Teachers retrieved successfully'));
  } catch (error) {
    next(error);
  }
};

export const getTeacher = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const schoolId = req.user!.school_id;
    const { teacherId } = req.params;

    if (!teacherId) {
      res.status(400).json(errorResponse('Teacher ID is required'));
      return;
    }

    const result = await teacherService.getTeacherById(schoolId, teacherId);

    if (!result.success) {
      res.status(400).json(errorResponse(result.error || 'Failed to fetch teacher'));
      return;
    }

    res.status(200).json(successResponse(result.data, 'Teacher retrieved successfully'));
  } catch (error) {
    next(error);
  }
};

export const updateTeacher = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const schoolId = req.user!.school_id;
    const { teacherId } = req.params;
    const updateData = req.body;

    if (!teacherId) {
      res.status(400).json(errorResponse('Teacher ID is required'));
      return;
    }

    const result = await teacherService.updateTeacher(schoolId, teacherId, updateData);

    if (!result.success) {
      res.status(400).json(errorResponse(result.error || 'Failed to update teacher'));
      return;
    }

    res.status(200).json(successResponse(result.data, 'Teacher updated successfully'));
  } catch (error) {
    next(error);
  }
};

export const assignToClass = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const schoolId = req.user!.school_id;
    const { teacherId } = req.params;
    const { class_id, section_id, subject_id, academic_year_id } = req.body;

    if (!teacherId || !class_id || !subject_id || !academic_year_id) {
      res.status(400).json(errorResponse('Teacher ID, class ID, subject ID, and academic year ID are required'));
      return;
    }

    const result = await teacherService.assignTeacherToClass(
      schoolId,
      teacherId,
      class_id,
      section_id || null,
      subject_id,
      academic_year_id
    );

    if (!result.success) {
      res.status(400).json(errorResponse(result.error || 'Failed to assign teacher to class'));
      return;
    }

    res.status(200).json(successResponse(result.data, 'Teacher assigned to class successfully'));
  } catch (error) {
    next(error);
  }
};

export const getAssignments = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const schoolId = req.user!.school_id;
    const { teacherId } = req.params;

    if (!teacherId) {
      res.status(400).json(errorResponse('Teacher ID is required'));
      return;
    }

    const result = await teacherService.getTeacherAssignments(schoolId, teacherId);

    if (!result.success) {
      res.status(400).json(errorResponse(result.error || 'Failed to fetch teacher assignments'));
      return;
    }

    res.status(200).json(successResponse(result.data, 'Teacher assignments retrieved successfully'));
  } catch (error) {
    next(error);
  }
};

export const deleteTeacher = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const schoolId = req.user!.school_id;
    const { teacherId } = req.params;

    if (!teacherId) {
      res.status(400).json(errorResponse('Teacher ID is required'));
      return;
    }

    const result = await teacherService.deleteTeacher(schoolId, teacherId);

    if (!result.success) {
      res.status(400).json(errorResponse(result.error || 'Failed to delete teacher'));
      return;
    }

    res.status(200).json(successResponse(null, 'Teacher deleted successfully'));
  } catch (error) {
    next(error);
  }
};
