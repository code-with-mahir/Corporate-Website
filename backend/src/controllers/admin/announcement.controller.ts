import { Request, Response, NextFunction } from 'express';
import * as announcementService from '../../services/announcement.service';
import { successResponse, errorResponse } from '../../utils/response';

export const createAnnouncement = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const schoolId = req.user!.school_id;
    const { title, content, target_audience, class_id, priority, valid_from, valid_until } = req.body;

    if (!title || !content) {
      res.status(400).json(errorResponse('Title and content are required'));
      return;
    }

    const result = await announcementService.createAnnouncement(schoolId, {
      title,
      content,
      target_audience,
      priority,
      valid_from,
      valid_until
    });

    if (!result.success) {
      res.status(400).json(errorResponse(result.error || 'Failed to create announcement'));
      return;
    }

    res.status(201).json(successResponse(result.data, 'Announcement created successfully'));
  } catch (error) {
    next(error);
  }
};

export const getAnnouncements = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const schoolId = req.user!.school_id;
    const targetAudience = req.query.target_audience as string;
    const priority = req.query.priority as string;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    const result = await announcementService.getAnnouncements(
      schoolId,
      { targetAudience, priority },
      page,
      limit
    );

    if (!result.success) {
      res.status(400).json(errorResponse(result.error || 'Failed to fetch announcements'));
      return;
    }

    res.status(200).json(successResponse(result.data, 'Announcements retrieved successfully'));
  } catch (error) {
    next(error);
  }
};

export const getAnnouncement = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const schoolId = req.user!.school_id;
    const { announcementId } = req.params;

    if (!announcementId) {
      res.status(400).json(errorResponse('Announcement ID is required'));
      return;
    }

    const result = await announcementService.getAnnouncementById(schoolId, announcementId);

    if (!result.success) {
      res.status(400).json(errorResponse(result.error || 'Failed to fetch announcement'));
      return;
    }

    res.status(200).json(successResponse(result.data, 'Announcement retrieved successfully'));
  } catch (error) {
    next(error);
  }
};

export const updateAnnouncement = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const schoolId = req.user!.school_id;
    const { announcementId } = req.params;
    const updateData = req.body;

    if (!announcementId) {
      res.status(400).json(errorResponse('Announcement ID is required'));
      return;
    }

    const result = await announcementService.updateAnnouncement(schoolId, announcementId, updateData);

    if (!result.success) {
      res.status(400).json(errorResponse(result.error || 'Failed to update announcement'));
      return;
    }

    res.status(200).json(successResponse(result.data, 'Announcement updated successfully'));
  } catch (error) {
    next(error);
  }
};

export const deleteAnnouncement = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const schoolId = req.user!.school_id;
    const { announcementId } = req.params;

    if (!announcementId) {
      res.status(400).json(errorResponse('Announcement ID is required'));
      return;
    }

    const result = await announcementService.deleteAnnouncement(schoolId, announcementId);

    if (!result.success) {
      res.status(400).json(errorResponse(result.error || 'Failed to delete announcement'));
      return;
    }

    res.status(200).json(successResponse(null, 'Announcement deleted successfully'));
  } catch (error) {
    next(error);
  }
};
