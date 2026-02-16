import { Request, Response, NextFunction } from 'express';
import * as feeService from '../../services/fee.service';
import { successResponse, errorResponse } from '../../utils/response';

export const createFeeStructure = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const schoolId = req.user!.school_id;
    const feeData = req.body;

    if (!feeData.name || !feeData.amount) {
      res.status(400).json(errorResponse('Fee name and amount are required'));
      return;
    }

    const result = await feeService.createFeeStructure(schoolId, feeData);

    if (!result.success) {
      res.status(400).json(errorResponse(result.error || 'Failed to create fee structure'));
      return;
    }

    res.status(201).json(successResponse(result.data, 'Fee structure created successfully'));
  } catch (error) {
    next(error);
  }
};

export const getFeeStructures = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const schoolId = req.user!.school_id;
    const classId = req.query.class_id as string;
    const academicYearId = req.query.academic_year_id as string;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    const result = await feeService.getFeeStructures(schoolId, {
      classId,
      academicYearId,
      page,
      limit
    });

    if (!result.success) {
      res.status(400).json(errorResponse(result.error || 'Failed to fetch fee structures'));
      return;
    }

    res.status(200).json(successResponse(result.data, 'Fee structures retrieved successfully'));
  } catch (error) {
    next(error);
  }
};

export const updateFeeStructure = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const schoolId = req.user!.school_id;
    const { feeId } = req.params;
    const updateData = req.body;

    if (!feeId) {
      res.status(400).json(errorResponse('Fee ID is required'));
      return;
    }

    const result = await feeService.updateFeeStructure(schoolId, feeId, updateData);

    if (!result.success) {
      res.status(400).json(errorResponse(result.error || 'Failed to update fee structure'));
      return;
    }

    res.status(200).json(successResponse(result.data, 'Fee structure updated successfully'));
  } catch (error) {
    next(error);
  }
};

export const recordPayment = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const schoolId = req.user!.school_id;
    const { student_id, fee_structure_id, amount, payment_method, transaction_id } = req.body;

    if (!student_id || !fee_structure_id || !amount) {
      res.status(400).json(errorResponse('Student ID, fee structure ID, and amount are required'));
      return;
    }

    const result = await feeService.recordFeePayment(schoolId, student_id, fee_structure_id, {
      amount_paid: amount,
      payment_date: new Date().toISOString(),
      payment_method,
      transaction_id
    });

    if (!result.success) {
      res.status(400).json(errorResponse(result.error || 'Failed to record payment'));
      return;
    }

    res.status(201).json(successResponse(result.data, 'Payment recorded successfully'));
  } catch (error) {
    next(error);
  }
};

export const getStudentDues = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const schoolId = req.user!.school_id;
    const { studentId } = req.params;
    const academicYearId = req.query.academic_year_id as string || '';

    if (!studentId) {
      res.status(400).json(errorResponse('Student ID is required'));
      return;
    }

    const result = await feeService.getStudentFeeDues(schoolId, studentId, academicYearId);

    if (!result.success) {
      res.status(400).json(errorResponse(result.error || 'Failed to fetch student dues'));
      return;
    }

    res.status(200).json(successResponse(result.data, 'Student dues retrieved successfully'));
  } catch (error) {
    next(error);
  }
};

export const getPayments = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const schoolId = req.user!.school_id;
    const studentId = req.query.student_id as string;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    const result = await feeService.getFeePayments(schoolId, {
      studentId,
      page,
      limit
    });

    if (!result.success) {
      res.status(400).json(errorResponse(result.error || 'Failed to fetch payments'));
      return;
    }

    res.status(200).json(successResponse(result.data, 'Payments retrieved successfully'));
  } catch (error) {
    next(error);
  }
};
