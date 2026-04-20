import { Request, Response, NextFunction } from 'express';
import * as studentService from '../../services/student.service';
import { successResponse, errorResponse } from '../../utils/response';

export const createStudent = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const schoolId = req.user!.school_id;
    const studentData = req.body;

    if (!studentData.name || !studentData.email) {
      res.status(400).json(errorResponse('Name and email are required'));
      return;
    }

    const result = await studentService.createStudent(schoolId, studentData);

    if (!result.success) {
      res.status(400).json(errorResponse(result.error || 'Failed to create student'));
      return;
    }

    res.status(201).json(successResponse(result.data, 'Student created successfully'));
  } catch (error) {
    next(error);
  }
};

export const getStudents = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const schoolId = req.user!.school_id;
    const classId = req.query.class_id as string;
    const sectionId = req.query.section_id as string;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    const result = await studentService.getStudents(schoolId, {
      classId,
      sectionId,
      page,
      limit
    });

    if (!result.success) {
      res.status(400).json(errorResponse(result.error || 'Failed to fetch students'));
      return;
    }

    res.status(200).json(successResponse(result.data, 'Students retrieved successfully'));
  } catch (error) {
    next(error);
  }
};

export const getStudent = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const schoolId = req.user!.school_id;
    const { studentId } = req.params;

    if (!studentId) {
      res.status(400).json(errorResponse('Student ID is required'));
      return;
    }

    const result = await studentService.getStudentById(schoolId, studentId);

    if (!result.success) {
      res.status(400).json(errorResponse(result.error || 'Failed to fetch student'));
      return;
    }

    res.status(200).json(successResponse(result.data, 'Student retrieved successfully'));
  } catch (error) {
    next(error);
  }
};

export const updateStudent = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const schoolId = req.user!.school_id;
    const { studentId } = req.params;
    const updateData = req.body;

    if (!studentId) {
      res.status(400).json(errorResponse('Student ID is required'));
      return;
    }

    const result = await studentService.updateStudent(schoolId, studentId, updateData);

    if (!result.success) {
      res.status(400).json(errorResponse(result.error || 'Failed to update student'));
      return;
    }

    res.status(200).json(successResponse(result.data, 'Student updated successfully'));
  } catch (error) {
    next(error);
  }
};

export const deleteStudent = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const schoolId = req.user!.school_id;
    const { studentId } = req.params;

    if (!studentId) {
      res.status(400).json(errorResponse('Student ID is required'));
      return;
    }

    const result = await studentService.deleteStudent(schoolId, studentId);

    if (!result.success) {
      res.status(400).json(errorResponse(result.error || 'Failed to delete student'));
      return;
    }

    res.status(200).json(successResponse(null, 'Student deleted successfully'));
  } catch (error) {
    next(error);
  }
};
