import { Router } from 'express';
import * as announcementController from '../../controllers/admin/announcement.controller';
import { authenticate, extractSchool, checkSubscription, requireRole } from '../../middleware';

const router = Router();

router.use(authenticate);
router.use(extractSchool);
router.use(checkSubscription);
router.use(requireRole(['admin']));

router.post('/', announcementController.createAnnouncement);
router.get('/', announcementController.getAnnouncements);
router.get('/:announcementId', announcementController.getAnnouncement);
router.put('/:announcementId', announcementController.updateAnnouncement);
router.delete('/:announcementId', announcementController.deleteAnnouncement);

export default router;
